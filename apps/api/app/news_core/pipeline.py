from __future__ import annotations

import hashlib
import json
import re
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Iterable, Literal

from ..calendar_data import list_calendar_events
from ..db import fetch_all, get_connection
from ..entity_graph import materialize_news_links
from ..evaluation_service import evaluate_news_ranking
from ..intelligence_scoring import (
 source_quality_score,
 recency_score,
 watchlist_overlap_score,
 asset_breadth_score,
 UnifiedScoreInputs,
 compute_unified_scores,
)
from ..providers import ProviderError, load_rss_feed
from ..security import utc_now
from ..settings import settings
from ..source_meta import derive_freshness, parse_source_timestamp

NewsMode = Literal["wire", "macro", "watchlist"]
SourceType = Literal["official", "discovery", "seeded"]
SourceTier = Literal["primary", "secondary"]

STOP_WORDS = {
 "a",
 "an",
 "and",
 "are",
 "as",
 "at",
 "by",
 "for",
 "from",
 "in",
 "into",
 "is",
 "it",
 "of",
 "on",
 "or",
 "the",
 "to",
 "with",
 "will",
 "after",
 "over",
}

MACRO_CATEGORIES = {
 "Central bank",
 "Inflation",
 "Labor",
 "Growth",
 "Liquidity",
 "Funding",
 "Policy",
 "Regulation",
 "Treasury",
 "Macro",
}

CATEGORY_RULES: list[tuple[str, tuple[str, ...]]] = [
 ("Central bank", ("fomc", "central bank", "ecb", "boe", "boj", "rate decision", "policy rate", "minutes")),
 ("Inflation", ("cpi", "ppi", "inflation", "prices", "deflator")),
 ("Labor", ("payroll", "jobless", "employment", "labor", "unemployment", "wage")),
 ("Growth", ("gdp", "pmi", "ism", "manufacturing", "services", "retail sales", "industrial production")),
 ("Liquidity", ("balance sheet", "liquidity", "reserves", "repo", "funding", "tga")),
 ("Treasury", ("treasury", "auction", "issuance", "debt", "fiscal")),
 ("Regulation", ("sec", "regulator", "compliance", "rule", "filing")),
 ("Policy", ("white house", "sanction", "tariff", "policy", "administration")),
]

ASSET_KEYWORDS: dict[str, tuple[str, ...]] = {
 "SPX": ("s&p", "spx", "equity", "stocks", "wall street"),
 "NDX": ("nasdaq", "ndx", "tech stocks"),
 "DXY": ("dollar", "usd", "greenback", "dxy"),
 "US2Y": ("2y", "two-year", "front-end", "front end"),
 "US10Y": ("10y", "ten-year", "treasury yield", "ust 10"),
 "EURUSD": ("eurusd", "eur/usd", "euro", "ecb"),
 "XAU": ("gold", "xau", "bullion"),
 "BTC": ("bitcoin", "btc", "crypto"),
}


@dataclass(frozen=True)
class NewsProvider:
 provider_key: str
 label: str
 source: str
 source_type: SourceType
 source_tier: SourceTier
 url: str
 default_region: str
 default_country: str
 default_currency: str
 default_topic: str


@dataclass
class NormalizedNews:
 id: str
 slug: str
 title: str
 source: str
 source_type: SourceType
 source_tier: SourceTier
 source_url: str
 summary: str
 topic: str
 category: str
 region: str
 country: str
 currency: str
 event_family: str
 affected_assets: list[str]
 importance_score: float
 urgency_score: float
 confidence_score: float
 mode: str
 freshness: str
 source_label: str
 source_note: str
 provider_key: str
 provider_payload: dict[str, Any]
 why_it_matters: str
 related_event_id: str | None
 related_event_slug: str | None
 related_dashboard_asset: str | None
 published_at: datetime
 cluster_seed: str


OFFICIAL_NEWS_PROVIDERS: tuple[NewsProvider, ...] = (
 NewsProvider(
  provider_key="fed",
  label="Federal Reserve press feed",
  source="Federal Reserve",
  source_type="official",
  source_tier="primary",
  url="https://www.federalreserve.gov/feeds/press_monetary.xml",
  default_region="US",
  default_country="United States",
  default_currency="USD",
  default_topic="Central banks",
 ),
 NewsProvider(
  provider_key="ecb",
  label="ECB press feed",
  source="European Central Bank",
  source_type="official",
  source_tier="primary",
  url="https://www.ecb.europa.eu/rss/press.html",
  default_region="Europe",
  default_country="Euro Area",
  default_currency="EUR",
  default_topic="Central banks",
 ),
 NewsProvider(
  provider_key="treasury",
  label="US Treasury press feed",
  source="US Treasury",
  source_type="official",
  source_tier="primary",
  url="https://home.treasury.gov/news/press-releases/rss",
  default_region="US",
  default_country="United States",
  default_currency="USD",
  default_topic="Treasury",
 ),
)

DISCOVERY_NEWS_PROVIDERS: tuple[NewsProvider, ...] = (
 NewsProvider(
  provider_key="reuters-finance",
  label="Reuters business feed",
  source="Reuters",
  source_type="discovery",
  source_tier="secondary",
  url="https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best",
  default_region="Global",
  default_country="Global",
  default_currency="",
  default_topic="Markets",
 ),
 NewsProvider(
  provider_key="wsj-markets",
  label="WSJ markets feed",
  source="WSJ",
  source_type="discovery",
  source_tier="secondary",
  url="https://feeds.a.dj.com/rss/RSSMarketsMain.xml",
  default_region="Global",
  default_country="Global",
  default_currency="",
  default_topic="Markets",
 ),
)


def _id(prefix: str) -> str:
 return prefix + "-" + uuid.uuid4().hex[:12]


def _slugify(value: str) -> str:
 slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
 return slug or "news"


def _safe_text(value: object, limit: int = 340) -> str:
 text = re.sub(r"\s+", " ", str(value or "")).strip()
 if len(text) <= limit:
  return text
 return text[: limit - 1].rstrip() + "…"


def _parse_published_at(value: object) -> datetime:
 parsed = parse_source_timestamp(value)
 if parsed:
  return parsed
 return utc_now()


def _tokenize(value: str) -> list[str]:
 cleaned = re.sub(r"[^a-z0-9\s]", " ", value.lower())
 parts = [part for part in cleaned.split() if part and part not in STOP_WORDS]
 return parts


def _fingerprint(value: str) -> str:
 tokens = _tokenize(value)
 if not tokens:
  return ""
 return " ".join(tokens[:8])


def _hash_key(*parts: str, length: int = 18) -> str:
 digest = hashlib.sha1("|".join(parts).encode("utf-8")).hexdigest()
 return digest[:length]


def _category_and_topic(headline: str, summary: str, default_topic: str) -> tuple[str, str]:
 text = (headline + " " + summary).lower()
 for category, keys in CATEGORY_RULES:
  if any(key in text for key in keys):
   topic = category if category in {"Central bank", "Inflation", "Labor", "Growth"} else "Macro"
   return category, topic
 return "Macro", default_topic


def _region_country_currency(
 headline: str,
 summary: str,
 provider: NewsProvider,
) -> tuple[str, str, str]:
 text = (headline + " " + summary).lower()
 if any(token in text for token in ("ecb", "euro area", "eurozone", "euro")):
  return "Europe", "Euro Area", "EUR"
 if any(token in text for token in ("boe", "uk", "bank of england")):
  return "Europe", "United Kingdom", "GBP"
 if any(token in text for token in ("fed", "federal reserve", "treasury", "u.s.", "united states", "us ")):
  return "US", "United States", "USD"
 if any(token in text for token in ("boj", "japan")):
  return "Asia", "Japan", "JPY"
 return provider.default_region, provider.default_country, provider.default_currency


def _event_family(category: str, headline: str) -> str:
 lower = headline.lower()
 if "cpi" in lower:
  return "US CPI" if "us" in lower else "CPI"
 if "payroll" in lower or "nfp" in lower:
  return "US Payrolls"
 if "ecb" in lower and ("rate" in lower or "policy" in lower):
  return "ECB Rate Decision"
 if "fomc" in lower:
  return "FOMC"
 if category == "Central bank":
  return "Central bank policy"
 return category


def _extract_assets(headline: str, summary: str, currency: str, category: str) -> list[str]:
 text = (headline + " " + summary).lower()
 symbols: list[str] = []
 for symbol, keys in ASSET_KEYWORDS.items():
  if any(key in text for key in keys):
   symbols.append(symbol)
 if currency == "USD":
  for symbol in ("DXY", "US2Y", "US10Y"):
   if symbol not in symbols:
    symbols.append(symbol)
 if currency == "EUR" and "EURUSD" not in symbols:
  symbols.append("EURUSD")
 if category == "Central bank":
  for symbol in ("US2Y", "US10Y", "DXY"):
   if symbol not in symbols:
    symbols.append(symbol)
 if category == "Inflation":
  for symbol in ("US2Y", "US10Y", "SPX"):
   if symbol not in symbols:
    symbols.append(symbol)
 if category == "Labor":
  for symbol in ("SPX", "US10Y"):
   if symbol not in symbols:
    symbols.append(symbol)
 return symbols[:8]


def _importance_score(category: str, source_tier: SourceTier, source_type: SourceType) -> float:
 base = {
  "Central bank": 0.88,
  "Inflation": 0.82,
  "Labor": 0.80,
  "Growth": 0.72,
  "Liquidity": 0.76,
  "Treasury": 0.72,
  "Regulation": 0.66,
  "Policy": 0.68,
  "Macro": 0.60,
 }.get(category, 0.55)
 if source_tier == "primary":
  base += 0.08
 if source_type == "discovery":
  base -= 0.08
 return max(0.0, min(1.0, base))


def _urgency_score(published_at: datetime) -> float:
 age_hours = max(0.0, (utc_now() - published_at).total_seconds() / 3600.0)
 if age_hours <= 1:
  return 1.0
 if age_hours <= 3:
  return 0.85
 if age_hours <= 12:
  return 0.65
 if age_hours <= 24:
  return 0.50
 if age_hours <= 48:
  return 0.35
 return 0.18


def _confidence_score(source_tier: SourceTier, source_type: SourceType) -> float:
 if source_tier == "primary":
  return 0.86 if source_type == "official" else 0.78
 return 0.62 if source_type == "discovery" else 0.70


def _default_source_note(provider: NewsProvider) -> str:
 if provider.source_type == "official":
  return "Primary official source feed."
 return "Discovery feed: secondary signal until corroborated by official sources."


def _event_link(headline: str, summary: str) -> tuple[str | None, str | None]:
 text = (headline + " " + summary).lower()
 events = list_calendar_events(days_back=120, days_forward=120)
 best: tuple[str | None, str | None, int] = (None, None, 0)
 for event in events:
  title = str(event.get("title", "")).lower()
  family = str(event.get("family", "")).lower()
  score = 0
  if title and title in text:
   score += 3
  if family and family in text:
   score += 2
  if "cpi" in text and "cpi" in title:
   score += 1
  if "payroll" in text and ("payroll" in title or "nfp" in title):
   score += 1
  if score > best[2]:
   best = (str(event.get("id")), str(event.get("slug", "")), score)
 if best[2] == 0:
  return None, None
 return best[0], best[1]


def _why_it_matters(category: str, assets: Iterable[str], summary: str, source_type: SourceType) -> str:
 asset_text = ", ".join(list(assets)[:4]) or "cross-asset risk"
 prefix = {
  "Central bank": "Policy guidance can reprice the front end and FX quickly.",
  "Inflation": "Inflation surprises typically reprice rates and broad risk.",
  "Labor": "Labor momentum directly affects growth and policy expectations.",
  "Growth": "Growth prints help confirm or challenge the active regime.",
  "Liquidity": "Liquidity conditions often drive risk beta and funding stress.",
  "Treasury": "Treasury supply and funding updates can shift duration and dollar pricing.",
 }.get(category, "Macro headline can alter catalyst expectations and positioning.")
 suffix = "Linked assets: " + asset_text + "."
 if source_type == "discovery":
  suffix += " Discovery-only until corroborated."
 return _safe_text(prefix + " " + suffix + " " + summary, limit=300)


def _normalize_item(provider: NewsProvider, raw: dict[str, Any]) -> NormalizedNews | None:
 headline = _safe_text(raw.get("title"), limit=220)
 if not headline:
  return None
 source_url = str(raw.get("link") or "").strip()
 published_at = _parse_published_at(raw.get("publishedAt"))
 summary = _safe_text(raw.get("summary"), limit=420)
 category, topic = _category_and_topic(headline, summary, provider.default_topic)
 region, country, currency = _region_country_currency(headline, summary, provider)
 event_family = _event_family(category, headline)
 assets = _extract_assets(headline, summary, currency, category)
 importance = _importance_score(category, provider.source_tier, provider.source_type)
 urgency = _urgency_score(published_at)
 confidence = _confidence_score(provider.source_tier, provider.source_type)
 mode = "live"
 freshness = derive_freshness(published_at.isoformat(), mode=mode)
 related_event_id, related_event_slug = _event_link(headline, summary)
 cluster_seed = _fingerprint(headline) or _fingerprint(summary) or _slugify(headline)
 hash_seed = source_url or (headline + "|" + published_at.isoformat())
 story_hash = _hash_key(provider.provider_key, hash_seed, length=14)
 slug = _slugify(headline) + "-" + story_hash[:8]
 news_id = "news-" + _hash_key(provider.provider_key, hash_seed, length=12)
 dashboard_asset = assets[0] if assets else None
 why = _why_it_matters(category, assets, summary, provider.source_type)
 payload = {
  "providerLabel": provider.label,
  "sourceType": provider.source_type,
  "sourceTier": provider.source_tier,
  "rawPublishedAt": raw.get("publishedAt"),
 }
 return NormalizedNews(
  id=news_id,
  slug=slug,
  title=headline,
  source=provider.source,
  source_type=provider.source_type,
  source_tier=provider.source_tier,
  source_url=source_url,
  summary=summary,
  topic=topic,
  category=category,
  region=region,
  country=country,
  currency=currency,
  event_family=event_family,
  affected_assets=assets,
  importance_score=importance,
  urgency_score=urgency,
  confidence_score=confidence,
  mode=mode,
  freshness=freshness,
  source_label=provider.label,
  source_note=_default_source_note(provider),
  provider_key=provider.provider_key,
  provider_payload=payload,
  why_it_matters=why,
  related_event_id=related_event_id,
  related_event_slug=related_event_slug,
  related_dashboard_asset=dashboard_asset,
  published_at=published_at,
  cluster_seed=cluster_seed,
 )

def _record_provider_run(
 conn: Any,
 *,
 run_id: str,
 provider_key: str,
 source_type: SourceType,
 status: str,
 fetched_count: int,
 normalized_count: int,
 deduped_count: int,
 error_message: str | None,
) -> None:
 with conn.cursor() as cur:
  cur.execute(
   """
   insert into news_provider_runs
   (id, provider_key, source_type, status, fetched_count, normalized_count, deduped_count, error_message, started_at, finished_at, created_at)
   values (%s, %s, %s, %s, %s, %s, %s, %s, now(), now(), now())
   """,
   (
    run_id,
    provider_key,
    source_type,
    status,
    fetched_count,
    normalized_count,
    deduped_count,
    error_message,
   ),
  )


def _upsert_news_item(conn: Any, item: NormalizedNews) -> None:
 with conn.cursor() as cur:
  cur.execute(
   """
   insert into news_items
   (
    id, slug, title, source, summary, category, sentiment, published_at, event_id,
    source_type, source_tier, source_url, topic, region, country, currency, event_family,
    affected_assets, importance_score, urgency_score, confidence_score, mode, freshness,
    source_label, source_note, provider_key, cluster_id, cluster_count, canonical, why_it_matters,
    related_event_slug, related_dashboard_asset, provider_payload, discovered_at, updated_at
   )
   values
   (
    %s, %s, %s, %s, %s, %s, 'Neutral', %s, %s,
    %s, %s, %s, %s, %s, %s, %s, %s,
    %s::jsonb, %s, %s, %s, %s, %s,
    %s, %s, %s, %s, %s, %s, %s,
    %s, %s, %s::jsonb, now(), now()
   )
   on conflict (id) do update set
    slug = excluded.slug,
    title = excluded.title,
    source = excluded.source,
    summary = excluded.summary,
    category = excluded.category,
    sentiment = excluded.sentiment,
    published_at = excluded.published_at,
    event_id = excluded.event_id,
    source_type = excluded.source_type,
    source_tier = excluded.source_tier,
    source_url = excluded.source_url,
    topic = excluded.topic,
    region = excluded.region,
    country = excluded.country,
    currency = excluded.currency,
    event_family = excluded.event_family,
    affected_assets = excluded.affected_assets,
    importance_score = excluded.importance_score,
    urgency_score = excluded.urgency_score,
    confidence_score = excluded.confidence_score,
    mode = excluded.mode,
    freshness = excluded.freshness,
    source_label = excluded.source_label,
    source_note = excluded.source_note,
    provider_key = excluded.provider_key,
    why_it_matters = excluded.why_it_matters,
    related_event_slug = excluded.related_event_slug,
    related_dashboard_asset = excluded.related_dashboard_asset,
    provider_payload = excluded.provider_payload,
    updated_at = now()
   """,
   (
    item.id,
    item.slug,
    item.title,
    item.source,
    item.summary,
    item.category,
    item.published_at,
    item.related_event_id,
    item.source_type,
    item.source_tier,
    item.source_url or None,
    item.topic,
    item.region,
    item.country,
    item.currency,
    item.event_family,
    json.dumps(item.affected_assets),
    item.importance_score,
    item.urgency_score,
    item.confidence_score,
    item.mode,
    item.freshness,
    item.source_label,
    item.source_note,
    item.provider_key,
    "cluster-" + _hash_key(item.cluster_seed, item.category, item.region, length=12),
    1,
    True,
    item.why_it_matters,
    item.related_event_slug,
    item.related_dashboard_asset,
    json.dumps(item.provider_payload),
   ),
  )
  cur.execute("delete from news_item_assets where news_id = %s", (item.id,))
  for symbol in item.affected_assets:
   cur.execute(
    "insert into news_item_assets (news_id, symbol, relevance_score) values (%s, %s, %s) on conflict (news_id, symbol) do update set relevance_score = excluded.relevance_score",
    (item.id, symbol, 0.7 if symbol == item.related_dashboard_asset else 0.55),
   )


def ingest_news_sources(
 *,
 include_official: bool = True,
 include_discovery: bool = True,
 item_limit: int = 12,
) -> dict[str, int]:
 providers: list[NewsProvider] = []
 if include_official:
  providers.extend(OFFICIAL_NEWS_PROVIDERS)
 if include_discovery:
  providers.extend(DISCOVERY_NEWS_PROVIDERS)
 totals = {"providers": len(providers), "fetched": 0, "normalized": 0, "deduped": 0, "failed": 0}
 seen_story_keys: set[str] = set()
 for provider in providers:
  run_id = _id("newsrun")
  fetched = 0
  normalized = 0
  deduped = 0
  status = "completed"
  try:
   payload = load_rss_feed(
    provider.provider_key,
    provider.label,
    provider.url,
    ttl=settings.provider_news_ttl_seconds,
    item_limit=item_limit,
   )
   items = payload.get("items") if isinstance(payload, dict) else None
   if not items:
    raise ProviderError("Provider returned no news rows")
   fetched = len(items)
   prepared: list[NormalizedNews] = []
   for raw in items:
    if not isinstance(raw, dict):
     continue
    normalized_item = _normalize_item(provider, raw)
    if not normalized_item:
     continue
    story_key = normalized_item.cluster_seed + "|" + normalized_item.published_at.isoformat()[:13]
    if story_key in seen_story_keys:
     deduped += 1
     continue
    seen_story_keys.add(story_key)
    prepared.append(normalized_item)
   normalized = len(prepared)
   with get_connection() as conn:
    for item in prepared:
     _upsert_news_item(conn, item)
    _record_provider_run(
     conn,
     run_id=run_id,
     provider_key=provider.provider_key,
     source_type=provider.source_type,
     status=status,
     fetched_count=fetched,
     normalized_count=normalized,
     deduped_count=deduped,
     error_message=None if prepared else "No usable rows after normalization",
    )
  except Exception as exc:
   totals["failed"] += 1
   with get_connection() as conn:
    _record_provider_run(
     conn,
     run_id=run_id,
     provider_key=provider.provider_key,
     source_type=provider.source_type,
     status="failed",
     fetched_count=fetched,
     normalized_count=normalized,
     deduped_count=deduped,
     error_message=str(exc),
    )
  totals["fetched"] += fetched
  totals["normalized"] += normalized
  totals["deduped"] += deduped
 cluster_news_items()
 enrich_news_items(limit=240)
 return totals


def _cluster_rows(limit_hours: int = 96) -> list[dict[str, Any]]:
 return fetch_all(
  """
  select id, title, category, region, source_tier, importance_score, urgency_score, confidence_score, published_at
  from news_items
  where published_at >= now() - make_interval(hours => %s)
  order by published_at desc
  """,
  (limit_hours,),
 )


def cluster_news_items(*, limit_hours: int = 96) -> int:
 rows = _cluster_rows(limit_hours=limit_hours)
 if not rows:
  return 0
 groups: dict[str, list[dict[str, Any]]] = {}
 for row in rows:
  title = str(row.get("title", ""))
  category = str(row.get("category", "Macro"))
  region = str(row.get("region", "Global"))
  seed = _fingerprint(title) or _slugify(title)
  cluster_id = "cluster-" + _hash_key(seed, category, region, length=12)
  groups.setdefault(cluster_id, []).append(row)
 updates: list[tuple[str, int, bool, str]] = []
 cluster_rows: list[tuple[str, str, str, str, int, str, datetime]] = []
 for cluster_id, items in groups.items():
  scored = sorted(
   items,
   key=lambda row: (
    float(row.get("importance_score") or 0.0)
    + float(row.get("urgency_score") or 0.0)
    + float(row.get("confidence_score") or 0.0)
    + (0.25 if str(row.get("source_tier")) == "primary" else 0.0)
   ),
   reverse=True,
  )
  canonical_id = str(scored[0]["id"])
  cluster_size = len(scored)
  representative = scored[0]
  published_at = representative.get("published_at")
  canonical_time = published_at if isinstance(published_at, datetime) else utc_now()
  cluster_rows.append(
   (
    cluster_id,
    str(representative.get("category", "Macro")),
    str(representative.get("category", "Macro")),
    str(representative.get("region", "Global")),
    cluster_size,
    canonical_id,
    canonical_time,
   ),
  )
  for row in scored:
   updates.append((str(row["id"]), cluster_size, str(row["id"]) == canonical_id, cluster_id))
 if updates:
  with get_connection() as conn:
   with conn.cursor() as cur:
    for news_id, cluster_count, canonical, cluster_id in updates:
     cur.execute(
      "update news_items set cluster_id = %s, cluster_count = %s, canonical = %s, updated_at = now() where id = %s",
      (cluster_id, cluster_count, canonical, news_id),
     )
    for cluster_id, topic, category, region, cluster_size, canonical_id, published_at in cluster_rows:
      cur.execute(
       """
       insert into news_clusters (id, topic, category, region, cluster_size, canonical_item_id, published_at, updated_at)
       values (%s, %s, %s, %s, %s, %s, %s, now())
       on conflict (id) do update set
        topic = excluded.topic,
        category = excluded.category,
        region = excluded.region,
        cluster_size = excluded.cluster_size,
        canonical_item_id = excluded.canonical_item_id,
        published_at = excluded.published_at,
        updated_at = now()
       """,
       (cluster_id, topic, category, region, cluster_size, canonical_id, published_at),
      )
 return len(updates)



def _score_row(row: dict[str, Any], watch_overlap: int) -> dict[str, Any]:
 published = row.get("published_at")
 importance = float(row.get("importance_score") or 0.0)
 urgency = float(row.get("urgency_score") or 0.0)
 confidence = float(row.get("confidence_score") or 0.0)
 source_type = str(row.get("source_type", "discovery"))
 source_tier = str(row.get("source_tier", "secondary"))
 mode = str(row.get("mode", "fallback"))
 assets = row.get("affected_assets") if isinstance(row.get("affected_assets"), list) else []
 cluster_count = int(row.get("cluster_count") or 1)
 event_proximity = 0.76 if row.get("event_id") else 0.18
 category = str(row.get("category", "Macro"))
 regime_relevance = {
  "Central bank": 0.82,
  "Inflation": 0.80,
  "Labor": 0.74,
  "Growth": 0.70,
  "Liquidity": 0.78,
  "Treasury": 0.72,
  "Regulation": 0.66,
  "Policy": 0.68,
  "Macro": 0.62,
 }.get(category, 0.58)
 evidence_density = min(1.0, max(0.15, float(cluster_count) / 5.0))
 scores = compute_unified_scores(
  UnifiedScoreInputs(
   importance=importance,
   urgency=urgency,
   confidence=confidence,
   source_quality=source_quality_score(source_type, source_tier, mode),
   recency=recency_score(published, horizon_hours=96.0),
   watchlist_overlap=watchlist_overlap_score(watch_overlap, max_hits=4),
   event_proximity=event_proximity,
   asset_breadth=asset_breadth_score(len(assets), max_assets=6),
   regime_relevance=regime_relevance,
   evidence_density=evidence_density,
  ),
  rationale=[
   "Unified news ranking blends importance, urgency, confidence, market relevance, and desk relevance.",
   "Watchlist/context overlap and source quality are explicit factors.",
  ],
 )
 return scores

def rebuild_news_rankings(*, lookback_hours: int = 96) -> int:
 rows = fetch_all(
  """
  select id, published_at, importance_score, urgency_score, confidence_score, source_type, source_tier,
         mode, cluster_count, event_id, affected_assets, category
  from news_items
  where published_at >= now() - make_interval(hours => %s)
  """,
  (lookback_hours,),
 )
 if not rows:
  return 0
 updated = 0
 with get_connection() as conn:
  with conn.cursor() as cur:
   for row in rows:
    published = row.get("published_at")
    if isinstance(published, datetime):
     urgency = _urgency_score(published if published.tzinfo else published.replace(tzinfo=timezone.utc))
    else:
     urgency = 0.25
    score_row = {
     "published_at": published,
     "importance_score": float(row.get("importance_score") or 0.0),
     "urgency_score": urgency,
     "confidence_score": float(row.get("confidence_score") or 0.0),
     "source_type": row.get("source_type") or "discovery",
     "source_tier": row.get("source_tier") or "secondary",
     "mode": row.get("mode") or "fallback",
     "cluster_count": int(row.get("cluster_count") or 1),
     "event_id": row.get("event_id"),
     "affected_assets": row.get("affected_assets") if isinstance(row.get("affected_assets"), list) else [],
     "category": row.get("category") or "Macro",
    }
    scores = _score_row(score_row, watch_overlap=0)
    cur.execute(
     """
     update news_items
     set urgency_score = %s,
         freshness = %s,
         market_relevance_score = %s,
         desk_relevance_score = %s,
         rank_score = %s,
         score_rationale = %s::jsonb,
         updated_at = now()
     where id = %s
     """,
     (
      urgency,
      derive_freshness(published, mode="live"),
      float(scores.get("marketRelevanceScore") or 0.0),
      float(scores.get("deskRelevanceScore") or 0.0),
      float(scores.get("rankScore") or 0.0),
      json.dumps(list(scores.get("rationale") or [])),
      row["id"],
     ),
    )
    updated += 1
 try:
  materialize_news_links(limit=min(max(updated, 40), 360))
 except Exception:
  pass
 try:
  evaluate_news_ranking(lookback_hours=max(lookback_hours, 96))
 except Exception:
  pass
 return updated


def _deterministic_summary(headline: str, summary: str) -> str:
 if summary:
  return _safe_text(summary, limit=220)
 return _safe_text(headline, limit=220)


def _deterministic_why(row: dict[str, Any]) -> str:
 category = str(row.get("category", "Macro"))
 assets = row.get("affected_assets")
 if not isinstance(assets, list):
  assets = []
 return _why_it_matters(
  category,
  [str(item) for item in assets if item],
  str(row.get("summary", "")),
  "discovery" if str(row.get("source_type", "discovery")) == "discovery" else "official",
 )


def enrich_news_items(*, limit: int = 200) -> int:
 rows = fetch_all(
  """
  select id, title, summary, category, affected_assets, source_type
  from news_items
  where canonical = true
  order by published_at desc
  limit %s
  """,
  (limit,),
 )
 if not rows:
  return 0
 method = "deterministic"
 updated = 0
 with get_connection() as conn:
  with conn.cursor() as cur:
   for row in rows:
    summary = _deterministic_summary(str(row.get("title", "")), str(row.get("summary", "")))
    why = _deterministic_why(row)
    cur.execute(
     """
     insert into news_enrichment (news_id, summary, why_it_matters, confidence_score, method, updated_at)
     values (%s, %s, %s, %s, %s, now())
     on conflict (news_id) do update set
      summary = excluded.summary,
      why_it_matters = excluded.why_it_matters,
      confidence_score = excluded.confidence_score,
      method = excluded.method,
      updated_at = now()
     """,
     (row["id"], summary, why, 0.72, method),
    )
    cur.execute(
     """
     update news_items
     set enriched_summary = %s,
         enriched_why_it_matters = %s,
         ai_mode = %s,
         updated_at = now()
     where id = %s
     """,
     (summary, why, method, row["id"]),
    )
    updated += 1
 return updated

__all__ = [
 "OFFICIAL_NEWS_PROVIDERS",
 "DISCOVERY_NEWS_PROVIDERS",
 "ingest_news_sources",
 "cluster_news_items",
 "rebuild_news_rankings",
 "enrich_news_items",
 "_score_row",
 "MACRO_CATEGORIES",
]
