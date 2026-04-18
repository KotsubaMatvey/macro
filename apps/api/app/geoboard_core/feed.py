from __future__ import annotations

from typing import Any
from urllib.parse import quote

from ..geoboard_ranking import GeoboardRankInputs, rank_metadata, source_quality_score
from ..intelligence_contracts import build_intelligence_contract, build_linked_references
from ..security import utc_now


def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    if value < low:
        return low
    if value > high:
        return high
    return value

def _base_links(*, event_id: str | None = None, event_slug: str | None = None, source_url: str | None = None) -> dict[str, Any]:
 return {'event': '/app/events/' + event_id if event_id else ('/app/events/' + event_slug if event_slug else None), 'calendar': '/app/macro-calendar', 'reactions': '/app/live-reactions', 'bias': '/app/market-bias', 'reports': '/app/reports', 'news': '/app/news', 'watchlists': '/app/watchlists', 'alerts': '/app/alerts', 'source': source_url}



def _attach_feed_intelligence(item: dict[str, Any], feed_evaluation: dict[str, Any]) -> dict[str, Any]:
 source_meta = item.get('sourceMeta') if isinstance(item.get('sourceMeta'), dict) else {}
 ranking = item.get('ranking') if isinstance(item.get('ranking'), dict) else {}
 linked_refs = build_linked_references(
  linked_assets=item.get('linkedAssetSymbols') or [],
  linked_events=[item.get('linkedEventId')] if item.get('linkedEventId') else [],
  linked_regions=[item.get('regionGroup'), item.get('regionCode')],
  linked_news=list(item.get('relatedNewsIds') or []) + list(item.get('relatedNewsClusterIds') or []),
  linked_reports=['weekly-macro-brief'],
  linked_reactions=[item.get('feedType')],
 )
 fallback_reason = '' if str(source_meta.get('mode', 'fallback')) == 'live' else str(source_meta.get('note', ''))
 contract = build_intelligence_contract(
  source=str(source_meta.get('label') or source_meta.get('providerKey') or item.get('sourceLayer') or 'geoboard'),
  source_type=str(source_meta.get('sourceType') or 'derived'),
  source_tier=str(source_meta.get('sourceTier') or 'secondary'),
  source_url=source_meta.get('sourceUrl'),
  mode=str(source_meta.get('mode') or 'derived'),
  freshness=str(source_meta.get('freshness') or 'degraded'),
  scores={
   'importanceScore': float(ranking.get('importanceScore') or 0.0),
   'urgencyScore': float(ranking.get('urgencyScore') or 0.0),
   'confidenceScore': float(ranking.get('confidenceScore') or 0.0),
   'marketRelevanceScore': float(ranking.get('marketRelevanceScore') or ranking.get('regimeRelevanceScore') or 0.0),
   'deskRelevanceScore': float(ranking.get('deskRelevanceScore') or ranking.get('watchlistOverlapScore') or 0.0),
   'rankScore': float(ranking.get('rankScore') or 0.0),
   'rationale': list(ranking.get('rationale') or []),
   'componentScores': dict(ranking.get('componentScores') or {}),
  },
  links=linked_refs,
  derived_from=[item.get('sourceLayer'), item.get('sourceId')],
  fallback_reason=fallback_reason,
  evaluation=feed_evaluation,
 )
 enriched = dict(item)
 enriched['linkedAssets'] = linked_refs['linkedAssets']
 enriched['linkedEvents'] = linked_refs['linkedEvents']
 enriched['linkedRegions'] = linked_refs['linkedRegions']
 enriched['linkedNews'] = linked_refs['linkedNews']
 enriched['linkedReports'] = linked_refs['linkedReports']
 enriched['linkedReactions'] = linked_refs['linkedReactions']
 enriched['derivedFrom'] = contract['derivedFrom']
 enriched['fallbackReason'] = contract['fallbackReason']
 enriched['intelligence'] = contract
 return enriched
def _feed_from_layers(geo_events: list[dict[str, Any]], macro_events: list[dict[str, Any]], central_banks: list[dict[str, Any]], trade_routes: list[dict[str, Any]], regime_zones: list[dict[str, Any]], active_mode: str, feed_evaluation: dict[str, Any]) -> list[dict[str, Any]]:
 feed = []
 for item in geo_events:
  feed.append({'id': 'feed-geo-' + str(item['id']), 'feedType': 'GEO_RISK', 'title': str(item['title']), 'subtitle': str(item.get('classification', 'Geo risk')) + ' / ' + str(item.get('country', 'Global')), 'time': str(item['date']), 'impactLine': ' / '.join(item.get('affectedAssets', [])[:4]), 'whyItMatters': str(item.get('whyItMatters', '')), 'lat': float(item['lat']), 'lon': float(item['lon']), 'sourceId': str(item['id']), 'sourceLayer': 'geo', 'regionCode': str(item.get('regionCode', 'GL')), 'regionGroup': str(item.get('regionGroup', 'Global')), 'linkedEventId': item.get('linkedEventId'), 'linkedEventSlug': item.get('linkedEventSlug'), 'relatedNewsClusterIds': item.get('relatedNewsClusterIds', []), 'relatedNewsIds': item.get('relatedNewsIds', []), 'linkedAssetSymbols': item.get('affectedAssets', []), 'tags': [str(item.get('classification', 'Geo risk')), str(item.get('sourceMeta', {}).get('sourceType', 'discovery'))], 'geoboardModes': item.get('geoboardModes', ['STANDARD', 'RISK']), 'links': {**_base_links(event_id=item.get('linkedEventId'), event_slug=item.get('linkedEventSlug'), source_url=item.get('url')), 'news': '/app/news?asset=' + quote(item.get('affectedAssets', ['DXY'])[0])}, 'sourceMeta': item['sourceMeta'], 'ranking': item['ranking']})
 for item in macro_events:
  feed.append({'id': 'feed-macro-' + str(item['id']), 'feedType': 'MACRO_CATALYST', 'title': str(item['name']).upper(), 'subtitle': str(item.get('family') or item.get('country') or 'Macro catalyst'), 'time': str(item['date']), 'impactLine': ' / '.join(item.get('relatedAssets', [])[:4]), 'whyItMatters': str(item.get('whyItMatters', '')), 'lat': float(item['lat']), 'lon': float(item['lon']), 'sourceId': str(item['id']), 'sourceLayer': 'macro', 'regionCode': str(item.get('regionCode', 'GL')), 'regionGroup': str(item.get('regionGroup', 'Global')), 'linkedEventId': item.get('linkedEventId'), 'linkedEventSlug': item.get('linkedEventSlug'), 'relatedNewsClusterIds': item.get('relatedNewsClusterIds', []), 'relatedNewsIds': item.get('relatedNewsIds', []), 'linkedAssetSymbols': item.get('relatedAssets', []), 'tags': [str(item.get('category', 'Macro')), str(item.get('horizonTag', 'later'))], 'geoboardModes': item.get('geoboardModes', ['STANDARD', 'LIQUIDITY']), 'links': {**_base_links(event_id=item.get('linkedEventId'), event_slug=item.get('linkedEventSlug')), 'calendar': item.get('linkedCalendarPath') or '/app/macro-calendar', 'reactions': item.get('linkedReactionPath') or '/app/live-reactions', 'bias': item.get('linkedBiasPath') or '/app/market-bias', 'reports': item.get('linkedReportsPath') or '/app/reports', 'news': item.get('linkedNewsPath') or '/app/news'}, 'sourceMeta': item['sourceMeta'], 'ranking': item['ranking']})
 for item in central_banks:
  feed.append({'id': 'feed-cb-' + str(item['id']), 'feedType': 'CENTRAL_BANK', 'title': str(item['name']) + ' // ' + str(item['bias']), 'subtitle': str(item.get('country', 'Central bank node')), 'time': str(item['nextMeeting']) + 'T00:00:00+00:00', 'impactLine': str(item.get('signal', '')), 'whyItMatters': str(item.get('whyItMatters', '')), 'lat': float(item['lat']), 'lon': float(item['lon']), 'sourceId': str(item['id']), 'sourceLayer': 'cb', 'regionCode': str(item.get('regionCode', 'GL')), 'regionGroup': str(item.get('regionGroup', 'Global')), 'linkedEventId': item.get('linkedEventId'), 'linkedEventSlug': item.get('linkedEventSlug'), 'relatedNewsClusterIds': item.get('relatedNewsClusterIds', []), 'relatedNewsIds': [], 'linkedAssetSymbols': item.get('relatedAssets', []), 'tags': ['Central bank', str(item.get('sourceMeta', {}).get('sourceType', 'static'))], 'geoboardModes': item.get('geoboardModes', ['STANDARD', 'LIQUIDITY', 'CENT.BANKS']), 'links': {**_base_links(event_id=item.get('linkedEventId'), event_slug=item.get('linkedEventSlug')), 'news': item.get('linkedNewsPath') or '/app/news?topic=Central%20banks', 'reactions': item.get('linkedReactionPath') or '/app/live-reactions', 'bias': item.get('linkedBiasPath') or '/app/market-bias'}, 'sourceMeta': item['sourceMeta'], 'ranking': item['ranking']})
 for item in trade_routes:
  feed.append({'id': 'feed-trade-' + str(item['id']), 'feedType': 'TRADE_ROUTE', 'title': str(item['name']), 'subtitle': str(item.get('riskLevel', 'Route risk')) + ' / ' + str(item.get('regionGroup', 'Global')), 'time': utc_now().isoformat(), 'impactLine': ' / '.join(item.get('impact', [])[:4]), 'whyItMatters': str(item.get('whyItMatters', '')), 'lat': float(item['lat']), 'lon': float(item['lon']), 'sourceId': str(item['id']), 'sourceLayer': 'trade', 'regionCode': str(item.get('regionCode', 'GL')), 'regionGroup': str(item.get('regionGroup', 'Global')), 'linkedEventId': None, 'linkedEventSlug': None, 'relatedNewsClusterIds': item.get('relatedNewsClusterIds', []), 'relatedNewsIds': [], 'linkedAssetSymbols': item.get('impact', []), 'tags': ['Trade route', str(item.get('riskLevel', 'MED'))], 'geoboardModes': item.get('geoboardModes', ['STANDARD', 'RISK']), 'links': {**_base_links(), 'news': item.get('linkedNewsPath') or '/app/news', 'alerts': item.get('linkedAlertsPath') or '/app/alerts'}, 'sourceMeta': item['sourceMeta'], 'ranking': item['ranking']})
 for zone in regime_zones:
  score = 0.58 if zone['regime'] == 'RISK-OFF' else 0.52 if zone['regime'] == 'RISK-ON' else 0.46
  ranking = rank_metadata(GeoboardRankInputs(urgency_score=0.40, importance_score=0.54, confidence_score=_clamp(float(zone['confidence']) / 100.0), recency_score=0.42, source_quality_score=source_quality_score('derived', 'primary', 'derived'), watchlist_overlap_score=0.22, catalyst_proximity_score=0.30, region_significance_score=0.58, regime_relevance_score=score), ['Derived regional regime context.'])
  feed.append({'id': 'feed-regime-' + str(zone['id']).lower(), 'feedType': 'REGIME_CONTEXT', 'title': 'REGIME // ' + str(zone['label']) + ' // ' + str(zone['regime']), 'subtitle': 'Derived dashboard regime zone', 'time': utc_now().isoformat(), 'impactLine': 'CONF ' + str(zone['confidence']) + '%', 'whyItMatters': str(zone.get('whyItMatters', '')), 'lat': float(zone['center'][1]), 'lon': float(zone['center'][0]), 'sourceId': str(zone['id']), 'sourceLayer': 'regime', 'regionCode': str(zone['id']), 'regionGroup': str(zone['label']), 'linkedEventId': None, 'linkedEventSlug': None, 'relatedNewsClusterIds': [], 'relatedNewsIds': [], 'linkedAssetSymbols': zone.get('relatedAssets', []), 'tags': ['Regime', zone['regime']], 'geoboardModes': zone.get('geoboardModes', ['STANDARD', 'LIQUIDITY']), 'links': {**_base_links(), 'bias': '/app/market-bias'}, 'sourceMeta': zone['sourceMeta'], 'ranking': ranking})
 enriched_feed = [_attach_feed_intelligence(item, feed_evaluation) for item in feed]
 filtered = [item for item in enriched_feed if active_mode in item.get('geoboardModes', ['STANDARD']) or active_mode == 'STANDARD']
 filtered.sort(key=lambda item: (float(item['ranking']['rankScore']), item['time']), reverse=True)
 return filtered[:45]


def _mode_state(active_mode: str, source_status: list[dict[str, Any]]) -> dict[str, Any]:
 normalized = active_mode if active_mode in {'STANDARD', 'RISK', 'LIQUIDITY', 'CENT.BANKS'} else 'STANDARD'
 fallback = any(item['state'] in {'fallback', 'degraded'} for item in source_status)
 return {'activeMode': normalized, 'availableModes': ['STANDARD', 'RISK', 'LIQUIDITY', 'CENT.BANKS'], 'fallback': fallback, 'sourceHonesty': 'Discovery rows are ranked signals, static overlays remain curated, and derived zones are dashboard-projected context.'}

__all__ = [
    "_feed_from_layers",
    "_mode_state",
]
