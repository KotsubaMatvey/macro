from __future__ import annotations

import hashlib
from datetime import timedelta
import math
from typing import Any
from urllib.parse import quote

import httpx

from .cache import cache_provider_payload, read_provider_payload
from .db import fetch_all, fetch_one
from .entity_graph import materialize_geoboard_links
from .evaluation_service import evaluate_geoboard_ranking, latest_evaluation_metadata, record_signal_snapshot
from .geoboard_ranking import GeoboardRankInputs, rank_metadata, source_quality_score
from .security import reference_now, utc_now
from .settings import settings
from .source_meta import derive_freshness, parse_source_timestamp
from .geoboard_core.constants import (
 GDELT_ENDPOINT,
 GDELT_CACHE_NAME,
 MACRO_CACHE_NAME,
 FEED_CACHE_PREFIX,
 COUNTRY_META,
 COUNTRY_HINTS,
 CLASSIFICATION_RULES,
 COUNTRY_ASSETS,
 REGION_SIGNIFICANCE,
 IMPACT_WEIGHTS,
 CENTRAL_BANK_SEEDS,
 TRADE_ROUTE_SEEDS,
 FALLBACK_GEO_EVENTS,
 FALLBACK_MACRO_EVENTS,
)
from .geoboard_core.feed import _feed_from_layers, _mode_state

def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
 try:
  parsed = float(value)
 except (TypeError, ValueError):
  return low
 if not math.isfinite(parsed):
  if parsed == float("inf"):
   return high
  return low
 if parsed < low:
  return low
 if parsed > high:
  return high
 return parsed


def _to_iso(value: Any, fallback: str | None = None) -> str:
 parsed = parse_source_timestamp(value)
 if parsed:
  return parsed.isoformat()
 return fallback if fallback else utc_now().isoformat()


def _age_hours(timestamp: Any, now: Any) -> float:
 parsed = parse_source_timestamp(timestamp)
 if not parsed:
  return 999.0
 return max(0.0, (now - parsed).total_seconds() / 3600.0)


def _hours_to(timestamp: Any, now: Any) -> float:
 parsed = parse_source_timestamp(timestamp)
 if not parsed:
  return 999.0
 return (parsed - now).total_seconds() / 3600.0


def _recency_score(timestamp: Any, now: Any, horizon_hours: float = 96.0) -> float:
 return _clamp(1.0 - (_age_hours(timestamp, now) / horizon_hours))


def _uniq(values: list[str]) -> list[str]:
 seen: set[str] = set()
 output: list[str] = []
 for value in values:
  item = str(value).upper().strip()
  if not item or item in seen:
   continue
  seen.add(item)
  output.append(item)
 return output


def _source_meta(provider_key: str, label: str, source_type: str, source_tier: str, mode: str, note: str, *, source_url: str | None = None, last_updated: Any = None, freshness: str | None = None) -> dict[str, Any]:
 freshness_mode = mode if mode in {'live', 'demo', 'fallback'} else 'fallback'
 resolved = freshness if freshness else derive_freshness(last_updated, mode=freshness_mode)
 if mode in {'derived', 'static'} and not freshness:
  resolved = 'degraded'
 return {'providerKey': provider_key, 'label': label, 'sourceType': source_type, 'sourceTier': source_tier, 'mode': mode, 'freshness': resolved, 'note': note, 'sourceUrl': source_url, 'fetchedAt': utc_now().isoformat(), 'lastUpdated': _to_iso(last_updated) if last_updated else None}

def _watch_context(user_id: str | None) -> dict[str, Any]:
 payload = {'symbols': set(), 'families': set(), 'regions': set(), 'currencies': set(), 'activeAlerts': 0}
 if not user_id:
  return payload
 try:
  rows = fetch_all("select wi.symbol, wi.item_type, coalesce(wi.note, '') as note from watchlist_items wi join watchlists w on w.id = wi.watchlist_id where w.user_id = %s", (user_id,))
  for row in rows:
   symbol = str(row.get('symbol', '')).upper().strip()
   note = str(row.get('note', '')).lower().strip()
   if symbol:
    payload['symbols'].add(symbol)
    if symbol in {'USD', 'EUR', 'GBP', 'JPY'}:
     payload['currencies'].add(symbol)
   if 'cpi' in note:
    payload['families'].add('US CPI')
   if 'payroll' in note or 'nfp' in note:
    payload['families'].add('US PAYROLLS')
   if 'ecb' in note or 'euro' in note:
    payload['regions'].add('EUROPE')
    payload['currencies'].add('EUR')
   if 'fed' in note or 'dollar' in note:
    payload['regions'].add('NORTH AMERICA')
    payload['currencies'].add('USD')
  alert_row = fetch_one("select count(*) as count from alerts where user_id = %s and status in ('Active', 'Triggered', 'Scheduled')", (user_id,))
  payload['activeAlerts'] = int(alert_row.get('count') or 0) if alert_row else 0
 except Exception:
  return payload
 return payload


def _news_index(limit: int = 160) -> list[dict[str, Any]]:
 try:
  rows = fetch_all("select id, title, cluster_id, event_id, related_event_slug, region, country, currency, affected_assets, source_url, published_at from news_items where canonical = true order by published_at desc limit %s", (limit,))
 except Exception:
  return []
 output = []
 for row in rows:
  assets = row.get('affected_assets') if isinstance(row.get('affected_assets'), list) else []
  output.append({'id': str(row.get('id', '')), 'title': str(row.get('title', '')), 'clusterId': str(row.get('cluster_id') or ''), 'eventId': row.get('event_id'), 'eventSlug': row.get('related_event_slug'), 'region': str(row.get('region') or ''), 'country': str(row.get('country') or ''), 'currency': str(row.get('currency') or ''), 'assets': [str(item).upper() for item in assets if item], 'sourceUrl': str(row.get('source_url') or '')})
 return output


def _country_from_text(text: str, source_country: str | None = None) -> tuple[str, str]:
 code = str(source_country or '').upper().strip()
 if code in COUNTRY_META:
  return code, 'country'
 upper = text.upper()
 for token, mapped in COUNTRY_HINTS:
  if token in upper:
   return mapped, 'country'
 if any(token in upper for token in ['MIDDLE EAST', 'GULF', 'RED SEA']):
  return 'IR', 'region'
 return 'GL', 'global'


def _classification_from_text(text: str) -> dict[str, Any]:
 upper = text.upper()
 selected = None
 hits = 0
 for rule in CLASSIFICATION_RULES:
  rule_hits = len([keyword for keyword in rule['keywords'] if keyword in upper])
  if rule_hits > hits:
   hits = rule_hits
   selected = rule
 if selected:
  return selected
 return {'name': 'Geopolitical risk', 'keywords': (), 'importance': 0.62, 'urgency': 0.52, 'assets': ['DXY', 'XAU'], 'modes': ['STANDARD', 'RISK']}


def _headline_tone(headline: str, raw_tone: Any = None) -> float:
 if isinstance(raw_tone, (int, float)):
  try:
   value = float(raw_tone)
   return max(-10.0, min(10.0, value))
  except Exception:
   pass
 upper = headline.upper()
 if any(token in upper for token in ['STRIKE', 'ATTACK', 'MISSILE', 'WAR', 'CONFLICT', 'DISRUPT']):
  return -6.6
 if any(token in upper for token in ['TALKS', 'CEASEFIRE', 'DEAL', 'RESUME', 'RELIEF']):
  return 2.4
 return -1.4


def _assets_for_signal(country_code: str, classification_name: str, headline: str) -> list[str]:
 assets = list(COUNTRY_ASSETS.get(country_code, COUNTRY_ASSETS['GL']))
 for rule in CLASSIFICATION_RULES:
  if rule['name'] == classification_name:
   assets.extend(rule['assets'])
   break
 upper = headline.upper()
 if 'CPI' in upper:
  assets.extend(['US2Y', 'US10Y', 'DXY'])
 if 'RATE' in upper or 'CENTRAL BANK' in upper:
  assets.extend(['US2Y', 'US10Y', 'DXY'])
 return _uniq(assets)[:7]

def _impact_weight(value: str) -> float:
 return IMPACT_WEIGHTS.get(str(value or 'MEDIUM').upper(), 0.64)


def _horizon_tag(hours_to_event: float) -> str:
 if hours_to_event <= 24 and hours_to_event >= -24:
  return 'today'
 if hours_to_event <= 24:
  return 'next_24h'
 if hours_to_event <= 24 * 7:
  return 'next_7d'
 return 'later'


def _urgency_from_horizon(hours_to_event: float) -> float:
 if hours_to_event < -24:
  return 0.30
 if hours_to_event <= 2:
  return 0.98
 if hours_to_event <= 24:
  return 0.86
 if hours_to_event <= 72:
  return 0.70
 if hours_to_event <= 24 * 7:
  return 0.54
 return 0.36


def _watch_overlap_score(assets: list[str], watch_context: dict[str, Any], *, family: str = '', region_group: str = '', currency: str = '') -> tuple[float, int]:
 hits = 0
 symbols = {str(item).upper() for item in watch_context.get('symbols', set())}
 hits += len([asset for asset in assets if asset in symbols])
 if family and family.upper() in watch_context.get('families', set()):
  hits += 1
 if region_group and region_group.upper() in watch_context.get('regions', set()):
  hits += 1
 if currency and currency.upper() in watch_context.get('currencies', set()):
  hits += 1
 return _clamp(hits / 3.0), hits


def _link_from_news(news_rows: list[dict[str, Any]], *, assets: list[str], country: str = '', event_id: str = '') -> tuple[list[str], list[str]]:
 ids: list[str] = []
 clusters: list[str] = []
 asset_set = {item.upper() for item in assets}
 for row in news_rows:
  overlap = asset_set.intersection({item.upper() for item in row.get('assets', [])})
  same_country = bool(country and str(row.get('country', '')).lower() == country.lower())
  same_event = bool(event_id and row.get('eventId') == event_id)
  if overlap or same_country or same_event:
   if row.get('id'):
    ids.append(str(row['id']))
   if row.get('clusterId'):
    clusters.append(str(row['clusterId']))
  if len(ids) >= 6:
   break
 return _uniq(ids), _uniq(clusters)


def _macro_rows(now: Any) -> list[dict[str, Any]]:
 horizon = now + timedelta(days=14)
 floor = now - timedelta(hours=12)
 return fetch_all(
  "select e.id, e.slug, e.status, e.title, e.scheduled_at, e.forecast_value, e.previous_value, coalesce(nullif(e.narrative, ''), e.why_it_matters) as expected_reaction, ef.name as family, ef.category, ef.country, ef.currency, ef.importance, coalesce(array_agg(a.symbol order by a.symbol) filter (where a.symbol is not null), '{}') as related_assets from events e join event_families ef on ef.id = e.family_id left join event_release_assets era on era.event_id = e.id left join assets a on a.id = era.asset_id where e.scheduled_at >= %s and e.scheduled_at <= %s group by e.id, e.slug, e.status, e.title, e.scheduled_at, e.forecast_value, e.previous_value, e.narrative, e.why_it_matters, ef.name, ef.category, ef.country, ef.currency, ef.importance order by e.scheduled_at asc",
  (floor.isoformat(), horizon.isoformat()),
 )


def _build_macro_events(now: Any, watch_context: dict[str, Any], news_rows: list[dict[str, Any]], regime_label: str) -> tuple[list[dict[str, Any]], dict[str, Any]]:
 cached = read_provider_payload(MACRO_CACHE_NAME)
 if cached and isinstance(cached.get('payload'), list):
  cached_rows = cached['payload']
  cached_fallback = any(str(item.get('mode')) == 'fallback' for item in cached_rows) if isinstance(cached_rows, list) else False
  return cached_rows, {'layer': 'macro', 'state': 'fallback' if cached_fallback else 'derived', 'sourceType': 'fallback' if cached_fallback else 'derived', 'mode': 'fallback' if cached_fallback else ('derived' if settings.app_mode != 'demo' else 'demo'), 'detail': 'Macro events loaded from cache.'}
 mode = 'demo' if settings.app_mode == 'demo' else 'derived'
 try:
  rows = _macro_rows(now)
 except Exception:
  rows = []
 events: list[dict[str, Any]] = []
 if rows:
  for row in rows:
   country_code, _ = _country_from_text(str(row.get('country', '')))
   country_meta = COUNTRY_META.get(country_code, COUNTRY_META['GL'])
   scheduled_at = _to_iso(row.get('scheduled_at'), now.isoformat())
   hours_to_event = _hours_to(scheduled_at, now)
   related_assets = [str(item).upper() for item in row.get('related_assets', []) if item]
   if not related_assets:
    related_assets = COUNTRY_ASSETS.get(country_code, COUNTRY_ASSETS['GL'])[:3]
   watch_score, watch_hits = _watch_overlap_score(related_assets, watch_context, family=str(row.get('family', '')), region_group=country_meta['regionGroup'], currency=str(row.get('currency', '')))
   news_ids, cluster_ids = _link_from_news(news_rows, assets=related_assets, country=str(row.get('country', '')), event_id=str(row.get('id', '')))
   ranking = rank_metadata(
    GeoboardRankInputs(
     urgency_score=_urgency_from_horizon(hours_to_event),
     importance_score=_impact_weight(str(row.get('importance', 'Medium'))),
     confidence_score=0.78 if mode == 'derived' else 0.66,
     recency_score=_clamp(1.0 - (abs(hours_to_event) / (24 * 7))),
     source_quality_score=source_quality_score('derived', 'primary', mode),
     watchlist_overlap_score=watch_score,
     catalyst_proximity_score=_clamp(1.0 - (max(0.0, hours_to_event) / (24 * 7))),
     region_significance_score=REGION_SIGNIFICANCE.get(country_meta['regionGroup'], 0.62),
     regime_relevance_score=0.72 if regime_label == 'RISK-OFF' and any(asset in {'DXY', 'US10Y', 'BUND', 'XAU'} for asset in related_assets) else 0.56,
    ),
    ['Macro catalyst mapped from event tables.', 'Watchlist overlap: ' + str(watch_hits)],
   )
   family = str(row.get('family') or '')
   event_id = str(row.get('id') or '')
   event_slug = str(row.get('slug') or '')
   events.append(
    {
     'id': event_id,
     'name': str(row.get('title') or family or 'Macro event'),
     'country': str(row.get('country') or country_meta['country']),
     'countryCode': country_code,
     'lat': float(country_meta['lat']),
     'lon': float(country_meta['lon']),
     'date': scheduled_at,
     'forecast': float(row['forecast_value']) if row.get('forecast_value') is not None else None,
     'previous': float(row['previous_value']) if row.get('previous_value') is not None else None,
     'impactLevel': str(row.get('importance') or 'Medium'),
     'expectedReaction': str(row.get('expected_reaction') or ''),
     'relatedAssets': related_assets,
     'mode': mode,
     'family': family,
     'category': str(row.get('category') or 'Macro'),
     'regionCode': country_meta['regionCode'],
     'regionGroup': country_meta['regionGroup'],
     'linkedEventId': event_id,
     'linkedEventSlug': event_slug,
     'linkedReactionPath': '/app/live-reactions?family=' + quote(family) + '&asset=' + quote(related_assets[0]),
     'linkedCalendarPath': '/app/macro-calendar?family=' + quote(family),
     'linkedBiasPath': '/app/market-bias',
     'linkedReportsPath': '/app/reports',
     'linkedNewsPath': '/app/news?eventFamily=' + quote(family),
     'horizonTag': _horizon_tag(hours_to_event),
     'hoursToEvent': round(hours_to_event, 2),
     'whyItMatters': str(row.get('expected_reaction') or row.get('title') or ''),
     'geoboardModes': ['STANDARD', 'LIQUIDITY'],
     'relatedNewsClusterIds': cluster_ids,
     'relatedNewsIds': news_ids,
     'sourceMeta': _source_meta('macro-calendar-db', 'Macro calendar projection', 'derived', 'primary', mode, 'Mapped from event tables and linked into calendar/event/reactions.', last_updated=scheduled_at),
     'ranking': ranking,
    },
   )
 else:
  for seed in FALLBACK_MACRO_EVENTS:
   hours_to_event = _hours_to(seed['date'], now)
   watch_score, watch_hits = _watch_overlap_score(seed['relatedAssets'], watch_context, family=seed['family'])
   ranking = rank_metadata(GeoboardRankInputs(urgency_score=_urgency_from_horizon(hours_to_event), importance_score=_impact_weight(seed['impactLevel']), confidence_score=0.52, recency_score=_recency_score(seed['date'], now), source_quality_score=source_quality_score('fallback', 'secondary', 'fallback'), watchlist_overlap_score=watch_score, catalyst_proximity_score=_clamp(1.0 - (max(0.0, hours_to_event) / (24 * 7))), region_significance_score=REGION_SIGNIFICANCE.get(COUNTRY_META.get(seed['countryCode'], COUNTRY_META['GL'])['regionGroup'], 0.62), regime_relevance_score=0.50), ['Fallback macro projection row.', 'Watchlist overlap: ' + str(watch_hits)])
   events.append({**seed, 'mode': 'fallback', 'linkedEventId': None, 'linkedEventSlug': None, 'linkedReactionPath': '/app/live-reactions?family=' + quote(seed['family']) + '&asset=' + quote(seed['relatedAssets'][0]), 'linkedCalendarPath': '/app/macro-calendar', 'linkedBiasPath': '/app/market-bias', 'linkedReportsPath': '/app/reports', 'linkedNewsPath': '/app/news?eventFamily=' + quote(seed['family']), 'horizonTag': _horizon_tag(hours_to_event), 'hoursToEvent': round(hours_to_event, 2), 'whyItMatters': seed['expectedReaction'], 'geoboardModes': ['STANDARD', 'LIQUIDITY'], 'relatedNewsClusterIds': [], 'relatedNewsIds': [], 'sourceMeta': _source_meta('macro-calendar-fallback', 'Fallback macro projection', 'fallback', 'secondary', 'fallback', 'Fallback macro rows sourced from seeded dataset.', last_updated=seed['date'], freshness='degraded'), 'ranking': ranking})
 events.sort(key=lambda item: (float(item['ranking']['rankScore']), item['date']), reverse=True)
 cache_provider_payload(MACRO_CACHE_NAME, events, ttl=180)
 return events, {'layer': 'macro', 'state': 'derived' if rows else 'fallback', 'sourceType': 'derived' if rows else 'fallback', 'mode': mode if rows else 'fallback', 'detail': 'Macro events mapped from DB-backed event families.' if rows else 'Macro rows unavailable; serving fallback macro events.'}

def _macro_event_link_for_geo(title: str, macro_events: list[dict[str, Any]]) -> tuple[str | None, str | None, float]:
 upper = title.upper()
 best_id = None
 best_slug = None
 best_score = 0.0
 for event in macro_events:
  score = 0.0
  family = str(event.get('family', '')).upper()
  country = str(event.get('country', '')).upper()
  if family and family in upper:
   score += 0.55
  if country and country in upper:
   score += 0.30
  if any(token in upper for token in ['CPI', 'RATE', 'PAYROLL', 'INFLATION']):
   score += 0.10
  if score > best_score:
   best_score = score
   best_id = str(event.get('id')) if event.get('id') else None
   best_slug = str(event.get('linkedEventSlug')) if event.get('linkedEventSlug') else None
 if best_score < 0.35:
  return None, None, 0.0
 return best_id, best_slug, _clamp(best_score)


def _fetch_gdelt_rows() -> tuple[list[dict[str, Any]], bool]:
 cached = read_provider_payload(GDELT_CACHE_NAME)
 if cached and isinstance(cached.get('payload'), list):
  payload = cached['payload']
  if not payload or ('sourceMeta' not in payload[0]):
   return payload, True
 with httpx.Client(timeout=settings.provider_timeout_seconds) as client:
  response = client.get(GDELT_ENDPOINT, params={'query': 'geopolitics OR conflict OR sanctions OR military OR shipping OR logistics OR energy OR "supply chain" OR tariff OR election OR "sovereign debt" OR chokepoint', 'mode': 'ArtList', 'maxrecords': 80, 'format': 'json', 'sort': 'DateDesc'})
  response.raise_for_status()
  payload = response.json()
  rows = payload.get('articles') or payload.get('artlist') or []
 return [row for row in rows[:40] if isinstance(row, dict)], False


def _build_geo_events(now: Any, macro_events: list[dict[str, Any]], news_rows: list[dict[str, Any]], watch_context: dict[str, Any], regime_label: str) -> tuple[list[dict[str, Any]], dict[str, Any]]:
 mode = 'live'
 try:
  rows, cached = _fetch_gdelt_rows()
 except Exception:
  rows = []
  cached = False
 events: list[dict[str, Any]] = []
 if rows:
  for row in rows:
   title = str(row.get('title') or row.get('name') or 'Untitled geopolitical event').strip()
   if not title:
    continue
   source = str(row.get('source') or row.get('domain') or row.get('sourcecountry') or 'GDELT Discovery')
   published_at = _to_iso(row.get('seendate') or row.get('date'), now.isoformat())
   source_url = str(row.get('url') or row.get('sourceurl') or GDELT_ENDPOINT)
   classification = _classification_from_text(title)
   country_code, precision = _country_from_text(title + ' ' + source, str(row.get('sourcecountry') or ''))
   country_meta = COUNTRY_META.get(country_code, COUNTRY_META['GL'])
   tone = _headline_tone(title, row.get('tone'))
   assets = _assets_for_signal(country_code, classification['name'], title)
   linked_event_id, linked_event_slug, catalyst_hint = _macro_event_link_for_geo(title, macro_events)
   watch_score, watch_hits = _watch_overlap_score(assets, watch_context, region_group=country_meta['regionGroup'])
   news_ids, cluster_ids = _link_from_news(news_rows, assets=assets, country=country_meta['country'], event_id=linked_event_id or '')
   recency = _recency_score(published_at, now)
   confidence = 0.54 + (0.08 if country_code != 'GL' else 0.0) + (0.05 if source_url else 0.0) + (0.04 if row.get('sourcecountry') else 0.0)
   ranking = rank_metadata(
    GeoboardRankInputs(
     urgency_score=_clamp((classification['urgency'] * 0.55) + (recency * 0.35) + min(abs(tone) / 16.0, 0.10)),
     importance_score=_clamp(classification['importance'] + min(abs(tone) / 20.0, 0.08)),
     confidence_score=_clamp(confidence),
     recency_score=recency,
     source_quality_score=source_quality_score('discovery', 'secondary', mode),
     watchlist_overlap_score=watch_score,
     catalyst_proximity_score=max(catalyst_hint, 0.10),
     region_significance_score=REGION_SIGNIFICANCE.get(country_meta['regionGroup'], 0.62),
     regime_relevance_score=0.72 if regime_label == 'RISK-OFF' and any(asset in {'DXY', 'XAU', 'US10Y'} for asset in assets) else 0.58,
    ),
    ['GDELT discovery signal.', classification['name'] + ' classification.', 'Watchlist overlap: ' + str(watch_hits)],
   )
   item_id = 'geo-' + hashlib.sha1((title + '|' + published_at).encode('utf-8')).hexdigest()[:12]
   events.append(
    {
     'id': item_id,
     'title': title,
     'source': source,
     'lat': float(country_meta['lat']),
     'lon': float(country_meta['lon']),
     'tone': round(tone, 3),
     'date': published_at,
     'url': source_url,
     'affectedAssets': assets,
     'mode': mode,
     'classification': classification['name'],
     'regionCode': country_meta['regionCode'],
     'regionGroup': country_meta['regionGroup'],
     'countryCode': country_code,
     'country': country_meta['country'],
     'locationPrecision': precision,
     'linkedEventId': linked_event_id,
     'linkedEventSlug': linked_event_slug,
     'relatedNewsClusterIds': cluster_ids,
     'relatedNewsIds': news_ids,
     'whyItMatters': classification['name'] + ' can reprice ' + ' / '.join(assets[:3]) + ' if it escalates.',
     'geoboardModes': classification['modes'],
     'sourceMeta': _source_meta('gdelt', 'GDELT discovery stream', 'discovery', 'secondary', 'live', 'Discovery signal only. Requires corroboration before treating as verified geopolitical fact.', source_url=source_url, last_updated=published_at),
     'ranking': ranking,
    },
   )
 if not events:
  mode = 'fallback'
  for seed in FALLBACK_GEO_EVENTS:
   watch_score, watch_hits = _watch_overlap_score(seed['affectedAssets'], watch_context, region_group=seed['regionGroup'])
   ranking = rank_metadata(GeoboardRankInputs(urgency_score=0.68, importance_score=0.72, confidence_score=0.42, recency_score=_recency_score(seed['date'], now), source_quality_score=source_quality_score('fallback', 'secondary', 'fallback'), watchlist_overlap_score=watch_score, catalyst_proximity_score=0.24, region_significance_score=REGION_SIGNIFICANCE.get(seed['regionGroup'], 0.60), regime_relevance_score=0.52), ['Fallback geopolitical discovery row.', 'Watchlist overlap: ' + str(watch_hits)])
   events.append({**seed, 'mode': 'fallback', 'locationPrecision': 'region', 'linkedEventId': None, 'linkedEventSlug': None, 'relatedNewsClusterIds': [], 'relatedNewsIds': [], 'whyItMatters': seed['classification'] + ' pressure can spill into ' + ' / '.join(seed['affectedAssets'][:3]) + '.', 'geoboardModes': ['STANDARD', 'RISK'], 'sourceMeta': _source_meta('gdelt-fallback', 'Fallback geopolitical discovery', 'fallback', 'secondary', 'fallback', 'Fallback discovery rows. Not a live geopolitical confirmation feed.', source_url=seed['url'], last_updated=seed['date'], freshness='degraded'), 'ranking': ranking})
 events.sort(key=lambda item: (float(item['ranking']['rankScore']), item['date']), reverse=True)
 cache_payload = rows if mode == 'live' and rows and ('sourceMeta' not in rows[0]) else events
 cache_provider_payload(GDELT_CACHE_NAME, cache_payload, ttl=300)
 status = {'layer': 'geo', 'state': 'live' if mode == 'live' else 'fallback', 'sourceType': 'discovery' if mode == 'live' else 'fallback', 'mode': mode, 'detail': 'GDELT discovery stream normalized and ranked.' if mode == 'live' else 'GDELT unavailable; serving fallback discovery rows.'}
 if mode == 'live' and cached:
  status['state'] = 'degraded'
  status['detail'] = 'Serving cached discovery rows pending next GDELT refresh.'
 return events, status


def _regime_snapshot() -> tuple[str, float]:
 try:
  row = fetch_one('select score, confidence from regime_snapshots order by created_at desc limit 1')
 except Exception:
  row = None
 if not row:
  return 'NEUTRAL', 0.62
 score = float(row.get('score') or 0.0)
 confidence = float(row.get('confidence') or 0.62)
 if score >= 0.2:
  return 'RISK-ON', _clamp(confidence)
 if score <= -0.2:
  return 'RISK-OFF', _clamp(confidence)
 return 'NEUTRAL', _clamp(confidence)


def _bias_assets(limit: int = 6) -> list[str]:
 try:
  rows = fetch_all('select a.symbol from market_bias_snapshots m join assets a on a.id = m.asset_id order by m.score desc limit %s', (limit,))
 except Exception:
  return []
 return [str(row.get('symbol', '')).upper() for row in rows if row.get('symbol')]

def _build_central_banks(macro_events: list[dict[str, Any]], news_rows: list[dict[str, Any]], watch_context: dict[str, Any], regime_label: str) -> tuple[list[dict[str, Any]], dict[str, Any]]:
 nodes = []
 now = reference_now()
 for seed in CENTRAL_BANK_SEEDS:
  linked = [item for item in macro_events if str(item.get('countryCode')) == seed['countryCode'] or seed['name'] in str(item.get('family', '')).upper()]
  linked.sort(key=lambda item: abs(float(item.get('hoursToEvent') or 999.0)))
  next_event = linked[0] if linked else None
  related_assets = _uniq(seed['relatedAssets'] + (next_event.get('relatedAssets', []) if next_event else []))[:7]
  _, cluster_ids = _link_from_news(news_rows, assets=related_assets, country=seed['country'])
  watch_score, watch_hits = _watch_overlap_score(related_assets, watch_context, region_group=seed['regionGroup'])
  hours_to_event = float(next_event.get('hoursToEvent') or 999.0) if next_event else 999.0
  ranking = rank_metadata(
   GeoboardRankInputs(
    urgency_score=_urgency_from_horizon(hours_to_event) if next_event else 0.34,
    importance_score=_clamp(float(seed['liquidityWeight']) / 100.0),
    confidence_score=0.64 if next_event else 0.58,
    recency_score=_recency_score(next_event.get('date') if next_event else seed['nextMeeting'] + 'T00:00:00+00:00', now, 24 * 21),
    source_quality_score=source_quality_score('static', 'primary', 'static'),
    watchlist_overlap_score=watch_score,
    catalyst_proximity_score=_clamp(1.0 - (max(0.0, hours_to_event) / (24 * 14))) if next_event else 0.18,
    region_significance_score=REGION_SIGNIFICANCE.get(seed['regionGroup'], 0.62),
    regime_relevance_score=0.74 if regime_label in {'RISK-OFF', 'RISK-ON'} else 0.58,
   ),
   ['Static curated central bank node.', 'Watchlist overlap: ' + str(watch_hits)],
  )
  nodes.append({
   **seed,
   'nextMeeting': next_event['date'][:10] if next_event else seed['nextMeeting'],
   'linkedEventId': next_event.get('linkedEventId') if next_event else None,
   'linkedEventSlug': next_event.get('linkedEventSlug') if next_event else None,
   'linkedEventPath': '/app/events/' + str(next_event['linkedEventId']) if next_event and next_event.get('linkedEventId') else '/app/macro-calendar',
   'linkedNewsPath': '/app/news?topic=Central%20banks',
   'linkedReactionPath': next_event.get('linkedReactionPath') if next_event else '/app/live-reactions',
   'linkedBiasPath': '/app/market-bias',
   'relatedAssets': related_assets,
   'relatedNewsClusterIds': cluster_ids,
   'whyItMatters': 'Curated central bank node with mapped macro catalyst context where available.',
   'geoboardModes': ['STANDARD', 'LIQUIDITY', 'CENT.BANKS'],
   'sourceMeta': _source_meta('geoboard-central-banks', 'Curated central bank map nodes', 'static', 'primary', 'static', 'Curated/static overlay. Event and news links are derived context.', last_updated=next_event.get('date') if next_event else seed['nextMeeting'] + 'T00:00:00+00:00'),
   'ranking': ranking,
  })
 nodes.sort(key=lambda item: float(item['ranking']['rankScore']), reverse=True)
 return nodes, {'layer': 'cb', 'state': 'static', 'sourceType': 'static', 'mode': 'static', 'detail': 'Curated central bank layer linked to mapped macro catalysts where available.'}


def _build_trade_routes(geo_events: list[dict[str, Any]], news_rows: list[dict[str, Any]], watch_context: dict[str, Any], regime_label: str) -> tuple[list[dict[str, Any]], dict[str, Any]]:
 routes = []
 now = reference_now()
 for seed in TRADE_ROUTE_SEEDS:
  mid = seed['path'][len(seed['path']) // 2]
  linked_geo = []
  for event in geo_events:
   title = str(event.get('title', '')).upper()
   if any(token in title for token in seed['keywords']):
    linked_geo.append(event)
    continue
   overlap = set(seed['impact']).intersection(set(event.get('affectedAssets', [])))
   same_region = str(event.get('regionGroup', '')).upper() == seed['regionGroup'].upper()
   if overlap and same_region:
    linked_geo.append(event)
  linked_geo.sort(key=lambda item: float(item.get('ranking', {}).get('rankScore', 0.0)), reverse=True)
  linked_geo_ids = [str(item.get('id')) for item in linked_geo[:5] if item.get('id')]
  _, cluster_ids = _link_from_news(news_rows, assets=seed['impact'])
  watch_score, watch_hits = _watch_overlap_score(seed['impact'], watch_context, region_group=seed['regionGroup'])
  base_urgency = {'HIGH': 0.78, 'MED': 0.58, 'LOW': 0.42}.get(seed['riskLevel'], 0.52)
  linked_urgency = max([float(item.get('ranking', {}).get('urgencyScore', 0.0)) for item in linked_geo[:3]] + [0.0])
  ranking = rank_metadata(
   GeoboardRankInputs(
    urgency_score=max(base_urgency, linked_urgency),
    importance_score={'HIGH': 0.86, 'MED': 0.68, 'LOW': 0.52}.get(seed['riskLevel'], 0.62),
    confidence_score=0.60 if linked_geo_ids else 0.54,
    recency_score=max([_recency_score(item.get('date'), now) for item in linked_geo[:3]] + [0.32]),
    source_quality_score=source_quality_score('static', 'primary', 'static'),
    watchlist_overlap_score=watch_score,
    catalyst_proximity_score=max([float(item.get('ranking', {}).get('catalystProximityScore', 0.0)) for item in linked_geo[:3]] + [0.18]),
    region_significance_score=REGION_SIGNIFICANCE.get(seed['regionGroup'], 0.62),
    regime_relevance_score=0.76 if regime_label == 'RISK-OFF' and any(asset in {'OIL', 'DXY', 'XAU', 'WHEAT'} for asset in seed['impact']) else 0.60,
   ),
   ['Curated/static trade route overlay.', str(len(linked_geo_ids)) + ' linked geopolitical discovery signals.', 'Watchlist overlap: ' + str(watch_hits)],
  )
  routes.append({**seed, 'lat': float(mid[1]), 'lon': float(mid[0]), 'linkedGeoEventIds': linked_geo_ids, 'relatedNewsClusterIds': cluster_ids, 'linkedNewsPath': '/app/news?asset=' + quote(seed['impact'][0]), 'linkedAlertsPath': '/app/alerts', 'whyItMatters': 'Curated chokepoint layer linked with discovery rows and affected asset context.', 'geoboardModes': ['STANDARD', 'RISK'], 'sourceMeta': _source_meta('geoboard-trade-routes', 'Curated chokepoint routes', 'static', 'primary', 'static', 'Curated/static route layer. Linked events are discovery context, not shipping telemetry.'), 'ranking': ranking})
 routes.sort(key=lambda item: float(item['ranking']['rankScore']), reverse=True)
 return routes, {'layer': 'trade', 'state': 'static', 'sourceType': 'static', 'mode': 'static', 'detail': 'Curated trade routes linked with ranked discovery context and asset impact.'}


def _build_regime_zones(regime_label: str, regime_confidence: float) -> tuple[list[dict[str, Any]], dict[str, Any]]:
 confidence_pct = max(35, min(95, int(round(regime_confidence * 100))))
 linked_assets = _bias_assets(limit=6)
 zones = [
  {'id': 'USA', 'label': 'USA', 'flag': 'US', 'regime': regime_label, 'confidence': confidence_pct, 'center': [-98.0, 38.0], 'zoom': 2.7},
  {'id': 'EUROPE', 'label': 'EUROPE', 'flag': 'EU', 'regime': regime_label if regime_label != 'RISK-ON' else 'NEUTRAL', 'confidence': max(35, confidence_pct - 6), 'center': [11.0, 50.0], 'zoom': 3.6},
  {'id': 'CHINA', 'label': 'CHINA', 'flag': 'CN', 'regime': 'RISK-OFF' if regime_label == 'RISK-OFF' else 'NEUTRAL', 'confidence': max(35, confidence_pct - 10), 'center': [104.0, 35.0], 'zoom': 3.2},
  {'id': 'EM', 'label': 'EM', 'flag': 'EM', 'regime': 'RISK-OFF' if regime_label == 'RISK-OFF' else 'NEUTRAL', 'confidence': max(35, confidence_pct - 14), 'center': [35.0, 9.0], 'zoom': 1.9},
 ]
 for zone in zones:
  zone['sourceMeta'] = _source_meta('dashboard-regime', 'Dashboard regime overlay', 'derived', 'primary', 'derived', 'Derived from dashboard regime snapshots and bias context.', last_updated=utc_now().isoformat())
  zone['relatedAssets'] = linked_assets[:4]
  zone['whyItMatters'] = 'Derived regime context used to weight macro and geo priorities by region.'
  zone['geoboardModes'] = ['STANDARD', 'LIQUIDITY']
 return zones, {'layer': 'regime', 'state': 'derived', 'sourceType': 'derived', 'mode': 'derived', 'detail': 'Regional regime zones derived from dashboard regime state.'}

def geoboard_payload(user: dict[str, Any] | None = None, active_mode: str = 'STANDARD') -> dict[str, Any]:
 user_id = str(user.get('id')) if isinstance(user, dict) and user.get('id') else None
 mode = active_mode if active_mode in {'STANDARD', 'RISK', 'LIQUIDITY', 'CENT.BANKS'} else 'STANDARD'
 cache_key = FEED_CACHE_PREFIX + ':' + (user_id if user_id else 'anon') + ':' + mode
 cached = read_provider_payload(cache_key)
 if cached and cached.get('payload'):
  return cached['payload']
 now = reference_now()
 generated_at = utc_now().isoformat()
 watch_context = _watch_context(user_id)
 news_rows = _news_index()
 regime_label, regime_confidence = _regime_snapshot()
 macro_events, macro_status = _build_macro_events(now, watch_context, news_rows, regime_label)
 geo_events, geo_status = _build_geo_events(now, macro_events, news_rows, watch_context, regime_label)
 central_banks, cb_status = _build_central_banks(macro_events, news_rows, watch_context, regime_label)
 trade_routes, trade_status = _build_trade_routes(geo_events, news_rows, watch_context, regime_label)
 regime_zones, regime_status = _build_regime_zones(regime_label, regime_confidence)
 feed_evaluation = latest_evaluation_metadata(
  'geoboard',
  'ranking',
  'feed',
  fallback_note='Geoboard ranking evaluation will populate after ranking recompute jobs run.',
 )
 feed = _feed_from_layers(
  geo_events,
  macro_events,
  central_banks,
  trade_routes,
  regime_zones,
  mode,
  feed_evaluation,
  generated_at=generated_at,
 )
 try:
  materialize_geoboard_links(feed)
 except Exception:
  pass
 try:
  record_signal_snapshot(
   surface='geoboard',
   signal_type='feed',
   signal_ref=mode,
   payload={
    'rows': len(feed),
    'types': [item.get('feedType') for item in feed[:20]],
    'topIds': [item.get('id') for item in feed[:20]],
   },
   mode='derived',
   freshness='fresh' if feed else 'degraded',
   as_of=generated_at,
  )
 except Exception:
  pass
 try:
  evaluate_geoboard_ranking(lookback_hours=168)
 except Exception:
  pass
 feed_evaluation = latest_evaluation_metadata(
  'geoboard',
  'ranking',
  'feed',
  fallback_note='Geoboard ranking evaluation is pending.',
 )
 for item in feed:
  intelligence = item.get('intelligence') if isinstance(item.get('intelligence'), dict) else None
  if intelligence is not None:
   intelligence['evaluation'] = feed_evaluation
 feed_source_types = {str((item.get('sourceMeta') or {}).get('sourceType', 'derived')) for item in feed if isinstance(item, dict)}
 if not feed:
  feed_state = 'fallback'
 elif feed_source_types and feed_source_types.issubset({'fallback'}):
  feed_state = 'fallback'
 elif 'fallback' in feed_source_types:
  feed_state = 'degraded'
 else:
  feed_state = 'live'
 feed_status = {
  'layer': 'feed',
  'state': feed_state,
  'sourceType': 'derived',
  'mode': 'derived',
  'detail': (
   'Canonical ranked Geoboard feed assembled from discovery/derived/static layers.'
   if feed
   else 'Feed empty; investigate upstream layers.'
  ),
 }
 source_status = [geo_status, macro_status, cb_status, trade_status, regime_status, feed_status]
 payload = {'generatedAt': generated_at, 'modeState': _mode_state(mode, source_status), 'sourceStatus': source_status, 'evaluation': feed_evaluation, 'geoEvents': geo_events, 'macroEvents': macro_events, 'centralBanks': central_banks, 'tradeRoutes': trade_routes, 'regimeZones': regime_zones, 'feed': feed, 'summary': {'totalFeedItems': len(feed), 'geoSignals': len(geo_events), 'macroCatalysts': len(macro_events), 'centralBanks': len(central_banks), 'tradeRoutes': len(trade_routes), 'regimeZones': len(regime_zones), 'watchlistSymbols': len(watch_context.get('symbols', set())), 'activeAlerts': int(watch_context.get('activeAlerts', 0)), 'fallbackLayers': len([item for item in source_status if item['state'] in {'fallback', 'degraded'}])}}
 cache_provider_payload(cache_key, payload, ttl=120)
 return payload


def fetch_gdelt_events(user_id: str | None = None) -> list[dict[str, Any]]:
 now = reference_now()
 watch_context = _watch_context(user_id)
 macro_events, _ = _build_macro_events(now, watch_context, [], 'NEUTRAL')
 events, _ = _build_geo_events(now, macro_events, [], watch_context, 'NEUTRAL')
 return events


def fetch_macro_events(user_id: str | None = None) -> list[dict[str, Any]]:
 now = reference_now()
 watch_context = _watch_context(user_id)
 events, _ = _build_macro_events(now, watch_context, [], 'NEUTRAL')
 return events
