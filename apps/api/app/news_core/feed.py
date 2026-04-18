from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from ..db import fetch_all
from ..evaluation_service import latest_evaluation_metadata, record_signal_snapshot
from ..intelligence_contracts import build_intelligence_contract, build_linked_references
from ..security import utc_now
from ..settings import settings
from ..source_meta import build_source_metadata
from .pipeline import MACRO_CATEGORIES, _score_row, ingest_news_sources

NewsMode = Literal["wire", "macro", "watchlist"]

def _watch_context(user_id: str) -> dict[str, set[str]]:
 rows = fetch_all(
  """
  select wi.symbol, wi.item_type, coalesce(wi.note, '') as note
  from watchlist_items wi
  join watchlists w on w.id = wi.watchlist_id
  where w.user_id = %s
  """,
  (user_id,),
 )
 symbols: set[str] = set()
 families: set[str] = set()
 regions: set[str] = set()
 currencies: set[str] = set()
 for row in rows:
  symbol = str(row.get("symbol", "")).upper().strip()
  note = str(row.get("note", "")).strip()
  if symbol:
   symbols.add(symbol)
   if symbol in {"USD", "EUR", "GBP", "JPY"}:
    currencies.add(symbol)
  if note:
   note_lower = note.lower()
   if "cpi" in note_lower:
    families.add("US CPI")
   if "payroll" in note_lower or "nfp" in note_lower:
    families.add("US Payrolls")
   if "euro" in note_lower or "ecb" in note_lower:
    regions.add("Europe")
    currencies.add("EUR")
   if "dollar" in note_lower or "fed" in note_lower:
    regions.add("US")
    currencies.add("USD")
 return {
  "symbols": symbols,
  "families": families,
  "regions": regions,
  "currencies": currencies,
 }


def _base_news_rows(limit: int = 240) -> list[dict[str, Any]]:
 return fetch_all(
  """
  select
   id, slug, title, source, source_type, source_tier, source_url, summary, topic, category,
   region, country, currency, event_family, affected_assets, importance_score, urgency_score,
   confidence_score, coalesce(market_relevance_score, 0) as market_relevance_score,
   coalesce(desk_relevance_score, 0) as desk_relevance_score,
   coalesce(rank_score, 0) as rank_score,
   coalesce(score_rationale, '[]'::jsonb) as score_rationale,
   mode, freshness, cluster_id, cluster_count, canonical, why_it_matters,
   event_id, related_event_slug, related_dashboard_asset, provider_key, provider_payload,
   source_label, source_note, published_at, enriched_summary, enriched_why_it_matters, ai_mode
  from news_items
  where canonical = true
  order by published_at desc
  limit %s
  """,
  (limit,),
 )


def _watch_overlap(row: dict[str, Any], context: dict[str, set[str]]) -> int:
 assets = row.get("affected_assets")
 symbols = [str(item).upper() for item in assets] if isinstance(assets, list) else []
 overlap = len([symbol for symbol in symbols if symbol in context["symbols"]])
 if str(row.get("currency", "")) in context["currencies"]:
  overlap += 1
 if str(row.get("region", "")) in context["regions"]:
  overlap += 1
 if str(row.get("event_family", "")) in context["families"]:
  overlap += 1
 return overlap


def _is_macro_row(row: dict[str, Any]) -> bool:
 category = str(row.get("category", "Macro"))
 if category in MACRO_CATEGORIES:
  return True
 if str(row.get("source_type", "")) == "official":
  return True
 return float(row.get("importance_score") or 0.0) >= 0.62



def _shell_mode(items: list[dict[str, Any]]) -> str:
 modes = {str(item.get("mode", "fallback")) for item in items}
 if not modes:
  return "fallback"
 if len(modes) > 1:
  return "mixed"
 only = next(iter(modes))
 if only in {"live", "demo", "fallback"}:
  return only
 return "fallback"


def _provider_status_rows() -> list[dict[str, Any]]:
 rows = fetch_all(
  """
  select distinct on (provider_key) provider_key, source_type, status, fetched_count, normalized_count, deduped_count, error_message, created_at
  from news_provider_runs
  order by provider_key, created_at desc
  """
 )
 statuses: list[dict[str, Any]] = []
 for row in rows:
  status = str(row.get("status", "failed"))
  source_type = str(row.get("source_type", "discovery"))
  mode = "live" if status == "completed" else "fallback"
  if status != "completed" and source_type == "official":
   mode = "fallback" if settings.app_mode != "demo" else "demo"
  detail = (
   f"{int(row.get('normalized_count') or 0)} normalized"
   + f" / {int(row.get('deduped_count') or 0)} deduped"
  )
  if row.get("error_message"):
   detail = str(row["error_message"])
  statuses.append(
   {
    "providerKey": str(row.get("provider_key", "")),
    "sourceType": source_type,
    "status": "live" if status == "completed" else "degraded",
    "mode": mode,
    "detail": detail,
   },
  )
 return statuses


def _format_news_row(
 row: dict[str, Any],
 scores: dict[str, Any],
 watch_overlap: int,
 feed_evaluation: dict[str, Any],
) -> dict[str, Any]:
 published = row.get("published_at")
 published_at = published.isoformat() if isinstance(published, datetime) else utc_now().isoformat()
 assets = row.get("affected_assets")
 asset_symbols = [str(item).upper() for item in assets] if isinstance(assets, list) else []
 headline = str(row.get("title", ""))
 summary = str(row.get("enriched_summary") or row.get("summary") or "")
 why = str(row.get("enriched_why_it_matters") or row.get("why_it_matters") or "")
 source_mode = str(row.get("mode", "fallback"))
 source_url = str(row.get("source_url") or "")
 source_meta = build_source_metadata(
  str(row.get("source_label", "News wire")),
  str(row.get("source", "Unknown source")),
  source_url=source_url or None,
  mode=source_mode if source_mode in {"live", "demo", "fallback"} else "fallback",
  note=str(row.get("source_note", "")),
  last_updated=published_at,
  freshness=str(row.get("freshness", "")) or None,
 )
 fallback_reason = "" if source_mode == "live" else source_meta.get("note", "")
 linked_refs = build_linked_references(
  linked_assets=asset_symbols,
  linked_events=[row.get("event_id")] if row.get("event_id") else [],
  linked_regions=[row.get("region"), row.get("country")],
  linked_news=[row.get("cluster_id")] if row.get("cluster_id") else [],
  linked_reports=["weekly-macro-brief"],
  linked_reactions=[row.get("event_family")] if row.get("event_family") else [],
 )
 intelligence = build_intelligence_contract(
  source=str(row.get("source", "")),
  source_type=str(row.get("source_type", "discovery")),
  source_tier=str(row.get("source_tier", "secondary")),
  source_url=source_url or None,
  mode=source_mode,
  freshness=str(row.get("freshness", "degraded")),
  scores=scores,
  links=linked_refs,
  derived_from=[row.get("provider_key"), row.get("cluster_id"), row.get("ai_mode")],
  fallback_reason=fallback_reason,
  evaluation=feed_evaluation,
 )
 return {
  "id": str(row.get("id")),
  "slug": str(row.get("slug")),
  "headline": headline,
  "title": headline,
  "source": str(row.get("source", "")),
  "sourceType": str(row.get("source_type", "discovery")),
  "sourceTier": str(row.get("source_tier", "secondary")),
  "sourceUrl": source_url or None,
  "publishedAt": published_at,
  "summary": summary,
  "topic": str(row.get("topic", "Macro")),
  "category": str(row.get("category", "Macro")),
  "region": str(row.get("region", "Global")),
  "country": str(row.get("country", "Global")),
  "currency": str(row.get("currency", "")),
  "eventFamily": str(row.get("event_family", "")),
  "affectedAssets": asset_symbols,
  "assetSymbols": asset_symbols,
  "importanceScore": round(float(scores.get("importanceScore") or 0.0), 3),
  "urgencyScore": round(float(scores.get("urgencyScore") or 0.0), 3),
  "confidenceScore": round(float(scores.get("confidenceScore") or 0.0), 3),
  "marketRelevanceScore": round(float(scores.get("marketRelevanceScore") or 0.0), 3),
  "deskRelevanceScore": round(float(scores.get("deskRelevanceScore") or 0.0), 3),
  "rankingScore": round(float(scores.get("rankScore") or 0.0), 3),
  "mode": source_mode if source_mode in {"live", "demo", "fallback"} else "fallback",
  "freshness": str(row.get("freshness", "degraded")),
  "clusterId": str(row.get("cluster_id") or ""),
  "clusterCount": int(row.get("cluster_count") or 1),
  "canonical": bool(row.get("canonical")),
  "whyItMatters": why,
  "relatedEventId": row.get("event_id"),
  "relatedEventSlug": row.get("related_event_slug"),
  "relatedDashboardAsset": row.get("related_dashboard_asset"),
  "providerKey": str(row.get("provider_key", "")),
  "providerMeta": row.get("provider_payload") if isinstance(row.get("provider_payload"), dict) else {},
  "watchOverlap": watch_overlap,
  "sourceMeta": source_meta,
  "evaluation": feed_evaluation,
  "linkedAssets": linked_refs["linkedAssets"],
  "linkedEvents": linked_refs["linkedEvents"],
  "linkedRegions": linked_refs["linkedRegions"],
  "linkedNews": linked_refs["linkedNews"],
  "linkedReports": linked_refs["linkedReports"],
  "linkedReactions": linked_refs["linkedReactions"],
  "derivedFrom": intelligence["derivedFrom"],
  "fallbackReason": intelligence["fallbackReason"],
  "intelligence": intelligence,
  "links": {
   "event": "/app/events/" + str(row.get("event_id")) if row.get("event_id") else None,
   "calendar": "/app/macro-calendar",
   "reactions": "/app/live-reactions",
   "bias": "/app/market-bias",
   "reports": "/app/reports",
   "news": "/app/news?focus=" + str(row.get("id")),
   "source": source_url or None,
  },
 }


def list_news_feed(
 user_id: str,
 *,
 mode: NewsMode = "wire",
 limit: int = 80,
 search: str = "",
 source_type: str = "",
 region: str = "",
 topic: str = "",
 category: str = "",
 currency: str = "",
 asset: str = "",
 event_family: str = "",
 min_urgency: float = 0.0,
 official_only: bool = False,
 watchlist_only: bool = False,
) -> dict[str, Any]:
 rows = _base_news_rows(limit=max(limit * 3, 120))
 if not rows:
  try:
   ingest_news_sources(include_official=True, include_discovery=True, item_limit=8)
   rows = _base_news_rows(limit=max(limit * 3, 120))
  except Exception:
   rows = []
 watch = _watch_context(user_id)
 feed_evaluation = latest_evaluation_metadata(
  "news",
  "ranking",
  "news-feed",
  fallback_note="News ranking evaluation will populate after the first evaluation recompute job.",
 )
 candidates: list[dict[str, Any]] = []
 search_lower = search.strip().lower()
 asset_upper = asset.strip().upper()
 for row in rows:
  overlap = _watch_overlap(row, watch)
  row_mode = mode
  if watchlist_only:
   row_mode = "watchlist"
  if row_mode == "macro" and not _is_macro_row(row):
   continue
  if row_mode == "watchlist" and overlap <= 0:
   continue
  if official_only and str(row.get("source_type")) != "official":
   continue
  if source_type and str(row.get("source_type")) != source_type:
   continue
  if region and str(row.get("region")) != region:
   continue
  if topic and str(row.get("topic")) != topic:
   continue
  if category and str(row.get("category")) != category:
   continue
  if currency and str(row.get("currency")) != currency:
   continue
  if event_family and str(row.get("event_family")) != event_family:
   continue
  assets = row.get("affected_assets")
  symbols = [str(item).upper() for item in assets] if isinstance(assets, list) else []
  if asset_upper and asset_upper not in symbols:
   continue
  scores = _score_row(row, overlap)
  if float(scores.get("urgencyScore") or 0.0) < min_urgency:
   continue
  if search_lower:
   hay = " ".join(
    [
     str(row.get("title", "")),
     str(row.get("summary", "")),
     str(row.get("category", "")),
     str(row.get("event_family", "")),
     str(row.get("source", "")),
    ],
   ).lower()
   if search_lower not in hay:
    continue
  formatted = _format_news_row(row, scores, overlap, feed_evaluation)
  candidates.append(formatted)
 candidates.sort(
  key=lambda item: (
   float(item.get("rankingScore") or 0.0),
   int(item.get("clusterCount") or 1),
   item.get("publishedAt", ""),
  ),
  reverse=True,
 )
 trimmed = candidates[:limit]
 shell_mode = _shell_mode(trimmed)
 source_status = _provider_status_rows()
 top_now = trimmed[:6]
 central_bank = [item for item in trimmed if item.get("category") == "Central bank"][:6]
 calendar_linked = [item for item in trimmed if item.get("relatedEventId")][:6]
 watch_hits = [item for item in trimmed if int(item.get("watchOverlap") or 0) > 0][:6]
 high_urgency = [item for item in trimmed if float(item.get("urgencyScore") or 0.0) >= 0.70][:6]
 categories = sorted({str(item.get("category", "")) for item in candidates if item.get("category")})
 regions = sorted({str(item.get("region", "")) for item in candidates if item.get("region")})
 topics = sorted({str(item.get("topic", "")) for item in candidates if item.get("topic")})
 currencies = sorted({str(item.get("currency", "")) for item in candidates if item.get("currency")})
 assets = sorted({asset_symbol for item in candidates for asset_symbol in list(item.get("assetSymbols") or [])})
 freshness_state = "fresh" if any(item.get("freshness") == "fresh" for item in trimmed) else "degraded"
 mode_label = "Wire" if mode == "wire" else "Macro Only" if mode == "macro" else "Watchlist"
 source_meta = build_source_metadata(
  "News feed",
  "Macro Access News Pipeline",
  mode="live" if shell_mode == "live" else "demo" if shell_mode == "demo" else "fallback",
  freshness=freshness_state if freshness_state in {"fresh", "aging", "stale", "degraded"} else "degraded",
  note="Primary official feeds are ranked above discovery feeds. AI text is deterministic enrichment over ingested data.",
  last_updated=trimmed[0]["publishedAt"] if trimmed else utc_now().isoformat(),
 )
 try:
  record_signal_snapshot(
   surface="news",
   signal_type="feed",
   signal_ref=mode,
   payload={
    "rows": len(trimmed),
    "official": len([item for item in trimmed if item.get("sourceType") == "official"]),
    "discovery": len([item for item in trimmed if item.get("sourceType") == "discovery"]),
    "topIds": [item.get("id") for item in trimmed[:12]],
   },
   mode=shell_mode if shell_mode in {"live", "demo", "fallback"} else "fallback",
   freshness=source_meta["freshness"],
   as_of=source_meta.get("lastUpdated") or utc_now().isoformat(),
  )
 except Exception:
  pass
 return {
  "mode": mode,
  "modeLabel": mode_label,
  "shellMode": shell_mode,
  "freshness": source_meta["freshness"],
  "sourceMeta": source_meta,
  "evaluation": feed_evaluation,
  "items": trimmed,
  "rails": {
   "topNow": top_now,
   "centralBanks": central_bank,
   "calendarLinked": calendar_linked,
   "watchlistNews": watch_hits,
   "highUrgency": high_urgency,
   "sourceStatus": source_status,
  },
  "summary": {
   "total": len(trimmed),
   "official": len([item for item in trimmed if item.get("sourceType") == "official"]),
   "discovery": len([item for item in trimmed if item.get("sourceType") == "discovery"]),
   "linkedEvents": len([item for item in trimmed if item.get("relatedEventId")]),
   "watchlistHits": len([item for item in trimmed if int(item.get("watchOverlap") or 0) > 0]),
   "clusters": len({str(item.get("clusterId", "")) for item in trimmed if item.get("clusterId")}),
  },
  "filters": {
   "search": search,
   "sourceType": source_type,
   "region": region,
   "topic": topic,
   "category": category,
   "currency": currency,
   "asset": asset_upper,
   "eventFamily": event_family,
   "officialOnly": official_only,
   "watchlistOnly": watchlist_only,
   "minUrgency": min_urgency,
  },
  "available": {
   "modes": ["wire", "macro", "watchlist"],
   "sourceTypes": ["official", "discovery", "seeded"],
   "categories": categories,
   "regions": regions,
   "topics": topics,
   "currencies": currencies,
   "assets": assets,
  },
 }


def list_news_for_workstation(limit: int = 10) -> list[dict[str, Any]]:
 rows = _base_news_rows(limit=max(limit, 12))
 items: list[dict[str, Any]] = []
 for row in rows[:limit]:
  published = row.get("published_at")
  published_at = published.isoformat() if isinstance(published, datetime) else utc_now().isoformat()
  items.append(
   {
    "id": row["id"],
    "slug": row["slug"],
    "title": row["title"],
    "source": row["source"],
    "publishedAt": published_at,
    "summary": row.get("enriched_summary") or row.get("summary") or "",
    "category": row.get("category") or "Macro",
    "sentiment": "Neutral",
    "relatedEventId": row.get("event_id"),
    "sourceType": row.get("source_type") or "discovery",
    "sourceUrl": row.get("source_url"),
    "topic": row.get("topic") or "Macro",
    "region": row.get("region") or "Global",
    "currency": row.get("currency") or "",
    "eventFamily": row.get("event_family") or "",
    "affectedAssets": row.get("affected_assets") if isinstance(row.get("affected_assets"), list) else [],
    "importanceScore": float(row.get("importance_score") or 0.0),
    "urgencyScore": float(row.get("urgency_score") or 0.0),
    "confidenceScore": float(row.get("confidence_score") or 0.0),
    "marketRelevanceScore": float(row.get("market_relevance_score") or 0.0),
    "deskRelevanceScore": float(row.get("desk_relevance_score") or 0.0),
    "rankingScore": float(row.get("rank_score") or 0.0),
    "mode": row.get("mode") or "fallback",
    "freshness": row.get("freshness") or "degraded",
    "clusterId": row.get("cluster_id"),
    "clusterCount": int(row.get("cluster_count") or 1),
    "canonical": bool(row.get("canonical")),
    "whyItMatters": row.get("enriched_why_it_matters") or row.get("why_it_matters") or "",
    "relatedEventSlug": row.get("related_event_slug"),
    "relatedDashboardAsset": row.get("related_dashboard_asset"),
    "providerMeta": row.get("provider_payload") if isinstance(row.get("provider_payload"), dict) else {},
   },
  )
 return items


def dashboard_news_snapshot(limit: int = 6) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
 rows = fetch_all(
  """
  select id, title, source, category, mode, published_at
  from news_items
  where canonical = true
  order by published_at desc
  limit %s
  """,
  (max(limit, 6),),
 )
 items: list[dict[str, str]] = []
 for row in rows[:limit]:
  mode = str(row.get("mode") or "fallback")
  if mode not in {"live", "demo", "fallback"}:
   mode = "fallback"
  items.append(
   {
    "title": str(row.get("title", "")),
    "subtitle": str(row.get("source", "")) + " / " + str(row.get("category", "")),
    "href": "/app/news?focus=" + str(row.get("id", "")),
    "mode": mode,
    "publishedAt": row["published_at"].isoformat() if isinstance(row.get("published_at"), datetime) else utc_now().isoformat(),
   },
  )
 statuses: list[dict[str, str]] = []
 for row in _provider_status_rows():
  statuses.append(
   {
    "name": str(row.get("providerKey", "")),
    "status": str(row.get("status", "degraded")),
    "detail": str(row.get("detail", "")),
    "mode": str(row.get("mode", "fallback")),
   },
  )
 return items, statuses

__all__ = [
 "list_news_feed",
 "list_news_for_workstation",
 "dashboard_news_snapshot",
]
