from __future__ import annotations

import math
from typing import Any
from urllib.parse import quote

from ..geoboard_ranking import GeoboardRankInputs, rank_metadata, source_quality_score
from ..intelligence_contracts import build_intelligence_contract, build_linked_references
from ..security import utc_now
from ..source_meta import parse_source_timestamp

ALLOWED_MODES = {'STANDARD', 'RISK', 'LIQUIDITY', 'CENT.BANKS'}
ALLOWED_SOURCE_TYPES = {'official', 'discovery', 'derived', 'static', 'fallback'}
ALLOWED_SOURCE_TIERS = {'primary', 'secondary'}
ALLOWED_RUNTIME_MODES = {'live', 'demo', 'fallback', 'static', 'derived'}
ALLOWED_FRESHNESS = {'fresh', 'aging', 'stale', 'degraded'}
LAYER_DEFAULT_MODES = {
    'geo': ['STANDARD', 'RISK'],
    'macro': ['STANDARD', 'LIQUIDITY'],
    'cb': ['STANDARD', 'LIQUIDITY', 'CENT.BANKS'],
    'trade': ['STANDARD', 'RISK'],
    'regime': ['STANDARD', 'LIQUIDITY'],
}
MODE_LAYER_WEIGHTS = {
    'STANDARD': {'geo': 0.96, 'macro': 0.94, 'cb': 0.92, 'trade': 0.93, 'regime': 0.88},
    'RISK': {'geo': 1.00, 'macro': 0.80, 'cb': 0.78, 'trade': 0.98, 'regime': 0.84},
    'LIQUIDITY': {'geo': 0.80, 'macro': 1.00, 'cb': 0.98, 'trade': 0.76, 'regime': 0.90},
    'CENT.BANKS': {'geo': 0.68, 'macro': 0.88, 'cb': 1.00, 'trade': 0.72, 'regime': 0.82},
}
SOURCE_STATE_WEIGHTS = {
    'official': 1.00,
    'discovery': 0.94,
    'derived': 0.90,
    'static': 0.88,
    'fallback': 0.60,
}
FRESHNESS_WEIGHTS = {
    'fresh': 1.00,
    'aging': 0.92,
    'stale': 0.80,
    'degraded': 0.65,
}


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


def _as_str(value: Any, default: str = '') -> str:
    if value is None:
        return default
    text = str(value).strip()
    return text if text else default


def _as_float(value: Any, default: float = 0.0) -> float:
    try:
        parsed = float(value)
    except Exception:
        return default
    if parsed != parsed:  # NaN
        return default
    return parsed


def _as_str_list(values: Any, *, limit: int = 10) -> list[str]:
    if not isinstance(values, list):
        return []
    output: list[str] = []
    seen: set[str] = set()
    for raw in values:
        value = _as_str(raw)
        if not value:
            continue
        upper = value.upper()
        if upper in seen:
            continue
        seen.add(upper)
        output.append(value)
        if len(output) >= limit:
            break
    return output


def _has_valid_coordinates(lat: Any, lon: Any) -> bool:
    lat_value = _as_float(lat, 999.0)
    lon_value = _as_float(lon, 999.0)
    return -90.0 <= lat_value <= 90.0 and -180.0 <= lon_value <= 180.0


def _safe_source_url(value: Any) -> str | None:
    text = _as_str(value)
    if text.startswith('https://') or text.startswith('http://'):
        return text
    return None


def _safe_app_path(value: Any, fallback: str | None) -> str | None:
    text = _as_str(value)
    if text.startswith('/app/'):
        return text
    return fallback


def _safe_modes(values: Any, layer: str) -> list[str]:
    defaults = LAYER_DEFAULT_MODES.get(layer, ['STANDARD'])
    if not isinstance(values, list):
        return defaults
    output: list[str] = []
    for raw in values:
        mode = _as_str(raw).upper()
        if mode in ALLOWED_MODES and mode not in output:
            output.append(mode)
    return output if output else defaults


def _safe_source_meta(raw: Any, layer: str) -> dict[str, Any]:
    source = raw if isinstance(raw, dict) else {}
    source_type = _as_str(source.get('sourceType'), 'derived')
    if source_type not in ALLOWED_SOURCE_TYPES:
        source_type = 'derived'
    source_tier = _as_str(source.get('sourceTier'), 'secondary')
    if source_tier not in ALLOWED_SOURCE_TIERS:
        source_tier = 'secondary'
    mode = _as_str(source.get('mode'), 'derived')
    if mode not in ALLOWED_RUNTIME_MODES:
        mode = 'derived'
    freshness = _as_str(source.get('freshness'), 'degraded')
    if freshness not in ALLOWED_FRESHNESS:
        freshness = 'degraded'
    if source_type == 'fallback' or mode == 'fallback':
        freshness = 'degraded'
    return {
        'providerKey': _as_str(source.get('providerKey'), f'geoboard-{layer}'),
        'label': _as_str(source.get('label'), f'Geoboard {layer} layer'),
        'sourceType': source_type,
        'sourceTier': source_tier,
        'mode': mode,
        'freshness': freshness,
        'note': _as_str(
            source.get('note'),
            'Layer metadata was normalized during feed assembly.',
        ),
        'sourceUrl': _safe_source_url(source.get('sourceUrl')),
        'fetchedAt': _as_str(source.get('fetchedAt')) or None,
        'lastUpdated': _as_str(source.get('lastUpdated')) or None,
    }


def _safe_ranking(raw: Any) -> dict[str, Any]:
    ranking = raw if isinstance(raw, dict) else {}
    component_scores = ranking.get('componentScores') if isinstance(ranking.get('componentScores'), dict) else {}
    rationale = ranking.get('rationale') if isinstance(ranking.get('rationale'), list) else []
    clean_rationale = [_as_str(item) for item in rationale if _as_str(item)]
    if not clean_rationale:
        clean_rationale = ['Ranking metadata was normalized during feed assembly.']
    return {
        'rankScore': _clamp(_as_float(ranking.get('rankScore'))),
        'urgencyScore': _clamp(_as_float(ranking.get('urgencyScore'))),
        'importanceScore': _clamp(_as_float(ranking.get('importanceScore'))),
        'confidenceScore': _clamp(_as_float(ranking.get('confidenceScore'))),
        'marketRelevanceScore': _clamp(_as_float(ranking.get('marketRelevanceScore'))),
        'deskRelevanceScore': _clamp(_as_float(ranking.get('deskRelevanceScore'))),
        'recencyScore': _clamp(_as_float(ranking.get('recencyScore'))),
        'sourceQualityScore': _clamp(_as_float(ranking.get('sourceQualityScore'))),
        'watchlistOverlapScore': _clamp(_as_float(ranking.get('watchlistOverlapScore'))),
        'catalystProximityScore': _clamp(_as_float(ranking.get('catalystProximityScore'))),
        'regionSignificanceScore': _clamp(_as_float(ranking.get('regionSignificanceScore'))),
        'regimeRelevanceScore': _clamp(_as_float(ranking.get('regimeRelevanceScore'))),
        'componentScores': {
            key: _as_float(value)
            for key, value in component_scores.items()
            if isinstance(key, str)
        },
        'rationale': clean_rationale,
    }


def _base_links(
    *,
    event_id: str | None = None,
    event_slug: str | None = None,
    source_url: str | None = None,
) -> dict[str, Any]:
    event_link = None
    event_id_text = _as_str(event_id)
    event_slug_text = _as_str(event_slug)
    if event_id_text:
        event_link = '/app/events/' + quote(event_id_text, safe='')
    elif event_slug_text:
        event_link = '/app/events/' + quote(event_slug_text, safe='')
    return {
        'event': event_link,
        'calendar': '/app/macro-calendar',
        'reactions': '/app/live-reactions',
        'bias': '/app/market-bias',
        'reports': '/app/reports',
        'news': '/app/news',
        'watchlists': '/app/watchlists',
        'alerts': '/app/alerts',
        'source': _safe_source_url(source_url),
    }


def _with_feed_rank_overlay(
    item: dict[str, Any],
    *,
    active_mode: str,
) -> dict[str, Any]:
    source_meta = _safe_source_meta(item.get('sourceMeta'), _as_str(item.get('sourceLayer'), 'feed'))
    ranking = _safe_ranking(item.get('ranking'))
    layer = _as_str(item.get('sourceLayer'), 'geo')
    mode_weight = MODE_LAYER_WEIGHTS.get(active_mode, MODE_LAYER_WEIGHTS['STANDARD']).get(layer, 0.88)
    source_weight = SOURCE_STATE_WEIGHTS.get(source_meta['sourceType'], 0.88)
    freshness_weight = FRESHNESS_WEIGHTS.get(source_meta['freshness'], 0.70)

    adjusted_rank = _clamp(
        (ranking['rankScore'] * 0.78)
        + (mode_weight * 0.10)
        + (source_weight * 0.07)
        + (freshness_weight * 0.05),
    )
    if source_meta['sourceType'] == 'fallback':
        adjusted_rank = min(adjusted_rank, 0.72)
    elif source_meta['sourceType'] in {'derived', 'static'} and ranking['urgencyScore'] < 0.75:
        adjusted_rank = min(adjusted_rank, 0.88)

    ranking['rankScore'] = round(adjusted_rank, 4)
    ranking['componentScores']['feedModeWeight'] = round(mode_weight, 4)
    ranking['componentScores']['feedSourceWeight'] = round(source_weight, 4)
    ranking['componentScores']['feedFreshnessWeight'] = round(freshness_weight, 4)
    ranking['rationale'] = [
        *ranking['rationale'][:7],
        f"Feed overlay applied for {active_mode} mode with {source_meta['sourceType']} / {source_meta['freshness']} source weighting.",
    ]
    enriched = dict(item)
    enriched['sourceMeta'] = source_meta
    enriched['ranking'] = ranking
    return enriched


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


def _timestamp(value: Any) -> float:
    parsed = parse_source_timestamp(value)
    if parsed is None:
        return 0.0
    return parsed.timestamp()


def _build_geo_feed_row(item: dict[str, Any]) -> dict[str, Any] | None:
    if not _has_valid_coordinates(item.get('lat'), item.get('lon')):
        return None
    source_id = _as_str(item.get('id'))
    title = _as_str(item.get('title'))
    if not source_id or not title:
        return None
    assets = _as_str_list(item.get('affectedAssets'), limit=8)
    source_meta = _safe_source_meta(item.get('sourceMeta'), 'geo')
    links = _base_links(
        event_id=_as_str(item.get('linkedEventId')) or None,
        event_slug=_as_str(item.get('linkedEventSlug')) or None,
        source_url=_as_str(item.get('url')) or source_meta.get('sourceUrl'),
    )
    links['news'] = '/app/news?asset=' + quote(assets[0], safe='') if assets else '/app/news'
    return {
        'id': 'feed-geo-' + source_id,
        'feedType': 'GEO_RISK',
        'title': title,
        'subtitle': _as_str(item.get('classification'), 'Geo risk') + ' / ' + _as_str(item.get('country'), 'Global'),
        'time': _as_str(item.get('date'), utc_now().isoformat()),
        'impactLine': ' / '.join(assets[:4]),
        'whyItMatters': _as_str(item.get('whyItMatters'), 'Geopolitical discovery signal with market impact context.'),
        'lat': _as_float(item.get('lat')),
        'lon': _as_float(item.get('lon')),
        'sourceId': source_id,
        'sourceLayer': 'geo',
        'regionCode': _as_str(item.get('regionCode'), 'GL'),
        'regionGroup': _as_str(item.get('regionGroup'), 'Global'),
        'linkedEventId': _as_str(item.get('linkedEventId')) or None,
        'linkedEventSlug': _as_str(item.get('linkedEventSlug')) or None,
        'relatedNewsClusterIds': _as_str_list(item.get('relatedNewsClusterIds')),
        'relatedNewsIds': _as_str_list(item.get('relatedNewsIds')),
        'linkedAssetSymbols': assets,
        'tags': _as_str_list([item.get('classification'), source_meta.get('sourceType')], limit=6),
        'geoboardModes': _safe_modes(item.get('geoboardModes'), 'geo'),
        'links': links,
        'sourceMeta': source_meta,
        'ranking': _safe_ranking(item.get('ranking')),
    }


def _build_macro_feed_row(item: dict[str, Any]) -> dict[str, Any] | None:
    if not _has_valid_coordinates(item.get('lat'), item.get('lon')):
        return None
    source_id = _as_str(item.get('id'))
    title = _as_str(item.get('name'))
    if not source_id or not title:
        return None
    assets = _as_str_list(item.get('relatedAssets'), limit=8)
    source_meta = _safe_source_meta(item.get('sourceMeta'), 'macro')
    links = _base_links(
        event_id=_as_str(item.get('linkedEventId')) or None,
        event_slug=_as_str(item.get('linkedEventSlug')) or None,
        source_url=source_meta.get('sourceUrl'),
    )
    links['calendar'] = _safe_app_path(item.get('linkedCalendarPath'), '/app/macro-calendar')
    links['reactions'] = _safe_app_path(item.get('linkedReactionPath'), '/app/live-reactions')
    links['bias'] = _safe_app_path(item.get('linkedBiasPath'), '/app/market-bias')
    links['reports'] = _safe_app_path(item.get('linkedReportsPath'), '/app/reports')
    links['news'] = _safe_app_path(item.get('linkedNewsPath'), '/app/news')
    return {
        'id': 'feed-macro-' + source_id,
        'feedType': 'MACRO_CATALYST',
        'title': title.upper(),
        'subtitle': _as_str(item.get('family'), _as_str(item.get('country'), 'Macro catalyst')),
        'time': _as_str(item.get('date'), utc_now().isoformat()),
        'impactLine': ' / '.join(assets[:4]),
        'whyItMatters': _as_str(item.get('whyItMatters'), 'Macro catalyst mapped from internal event projection.'),
        'lat': _as_float(item.get('lat')),
        'lon': _as_float(item.get('lon')),
        'sourceId': source_id,
        'sourceLayer': 'macro',
        'regionCode': _as_str(item.get('regionCode'), 'GL'),
        'regionGroup': _as_str(item.get('regionGroup'), 'Global'),
        'linkedEventId': _as_str(item.get('linkedEventId')) or None,
        'linkedEventSlug': _as_str(item.get('linkedEventSlug')) or None,
        'relatedNewsClusterIds': _as_str_list(item.get('relatedNewsClusterIds')),
        'relatedNewsIds': _as_str_list(item.get('relatedNewsIds')),
        'linkedAssetSymbols': assets,
        'tags': _as_str_list([item.get('category'), item.get('horizonTag')], limit=6),
        'geoboardModes': _safe_modes(item.get('geoboardModes'), 'macro'),
        'links': links,
        'sourceMeta': source_meta,
        'ranking': _safe_ranking(item.get('ranking')),
    }


def _build_cb_feed_row(item: dict[str, Any]) -> dict[str, Any] | None:
    if not _has_valid_coordinates(item.get('lat'), item.get('lon')):
        return None
    source_id = _as_str(item.get('id'))
    name = _as_str(item.get('name'))
    if not source_id or not name:
        return None
    assets = _as_str_list(item.get('relatedAssets'), limit=8)
    source_meta = _safe_source_meta(item.get('sourceMeta'), 'cb')
    links = _base_links(
        event_id=_as_str(item.get('linkedEventId')) or None,
        event_slug=_as_str(item.get('linkedEventSlug')) or None,
        source_url=source_meta.get('sourceUrl'),
    )
    links['news'] = _safe_app_path(item.get('linkedNewsPath'), '/app/news?topic=Central%20banks')
    links['reactions'] = _safe_app_path(item.get('linkedReactionPath'), '/app/live-reactions')
    links['bias'] = _safe_app_path(item.get('linkedBiasPath'), '/app/market-bias')
    meeting = _as_str(item.get('nextMeeting'))
    meeting_time = meeting + 'T00:00:00+00:00' if meeting and 'T' not in meeting else meeting
    return {
        'id': 'feed-cb-' + source_id,
        'feedType': 'CENTRAL_BANK',
        'title': name + ' // ' + _as_str(item.get('bias'), 'Policy stance'),
        'subtitle': _as_str(item.get('country'), 'Central bank node'),
        'time': _as_str(meeting_time, utc_now().isoformat()),
        'impactLine': _as_str(item.get('signal'), 'Policy signal'),
        'whyItMatters': _as_str(item.get('whyItMatters'), 'Curated central-bank node with mapped macro context.'),
        'lat': _as_float(item.get('lat')),
        'lon': _as_float(item.get('lon')),
        'sourceId': source_id,
        'sourceLayer': 'cb',
        'regionCode': _as_str(item.get('regionCode'), 'GL'),
        'regionGroup': _as_str(item.get('regionGroup'), 'Global'),
        'linkedEventId': _as_str(item.get('linkedEventId')) or None,
        'linkedEventSlug': _as_str(item.get('linkedEventSlug')) or None,
        'relatedNewsClusterIds': _as_str_list(item.get('relatedNewsClusterIds')),
        'relatedNewsIds': [],
        'linkedAssetSymbols': assets,
        'tags': _as_str_list(['Central bank', source_meta.get('sourceType')], limit=6),
        'geoboardModes': _safe_modes(item.get('geoboardModes'), 'cb'),
        'links': links,
        'sourceMeta': source_meta,
        'ranking': _safe_ranking(item.get('ranking')),
    }


def _build_trade_feed_row(item: dict[str, Any], generated_at: str) -> dict[str, Any] | None:
    if not _has_valid_coordinates(item.get('lat'), item.get('lon')):
        return None
    source_id = _as_str(item.get('id'))
    title = _as_str(item.get('name'))
    if not source_id or not title:
        return None
    assets = _as_str_list(item.get('impact'), limit=8)
    source_meta = _safe_source_meta(item.get('sourceMeta'), 'trade')
    links = _base_links(source_url=source_meta.get('sourceUrl'))
    links['news'] = _safe_app_path(item.get('linkedNewsPath'), '/app/news')
    links['alerts'] = _safe_app_path(item.get('linkedAlertsPath'), '/app/alerts')
    return {
        'id': 'feed-trade-' + source_id,
        'feedType': 'TRADE_ROUTE',
        'title': title,
        'subtitle': _as_str(item.get('riskLevel'), 'Route risk') + ' / ' + _as_str(item.get('regionGroup'), 'Global'),
        'time': generated_at,
        'impactLine': ' / '.join(assets[:4]),
        'whyItMatters': _as_str(item.get('whyItMatters'), 'Curated trade route overlay with linked discovery context.'),
        'lat': _as_float(item.get('lat')),
        'lon': _as_float(item.get('lon')),
        'sourceId': source_id,
        'sourceLayer': 'trade',
        'regionCode': _as_str(item.get('regionCode'), 'GL'),
        'regionGroup': _as_str(item.get('regionGroup'), 'Global'),
        'linkedEventId': None,
        'linkedEventSlug': None,
        'relatedNewsClusterIds': _as_str_list(item.get('relatedNewsClusterIds')),
        'relatedNewsIds': [],
        'linkedAssetSymbols': assets,
        'tags': _as_str_list(['Trade route', item.get('riskLevel')], limit=6),
        'geoboardModes': _safe_modes(item.get('geoboardModes'), 'trade'),
        'links': links,
        'sourceMeta': source_meta,
        'ranking': _safe_ranking(item.get('ranking')),
    }


def _build_regime_feed_row(zone: dict[str, Any], generated_at: str) -> dict[str, Any] | None:
    center = zone.get('center') if isinstance(zone.get('center'), list) else []
    if len(center) != 2:
        return None
    lon = _as_float(center[0], 999.0)
    lat = _as_float(center[1], 999.0)
    if not _has_valid_coordinates(lat, lon):
        return None
    zone_id = _as_str(zone.get('id'))
    label = _as_str(zone.get('label'))
    regime = _as_str(zone.get('regime'), 'NEUTRAL')
    if not zone_id or not label:
        return None
    score = 0.58 if regime == 'RISK-OFF' else 0.52 if regime == 'RISK-ON' else 0.46
    ranking = rank_metadata(
        GeoboardRankInputs(
            urgency_score=0.40,
            importance_score=0.54,
            confidence_score=_clamp(_as_float(zone.get('confidence')) / 100.0),
            recency_score=0.42,
            source_quality_score=source_quality_score('derived', 'primary', 'derived'),
            watchlist_overlap_score=0.22,
            catalyst_proximity_score=0.30,
            region_significance_score=0.58,
            regime_relevance_score=score,
        ),
        ['Derived regional regime context.'],
    )
    return {
        'id': 'feed-regime-' + zone_id.lower(),
        'feedType': 'REGIME_CONTEXT',
        'title': 'REGIME // ' + label + ' // ' + regime,
        'subtitle': 'Derived dashboard regime zone',
        'time': generated_at,
        'impactLine': 'CONF ' + str(int(_as_float(zone.get('confidence')))) + '%',
        'whyItMatters': _as_str(zone.get('whyItMatters'), 'Derived regime context used for ranking overlays.'),
        'lat': lat,
        'lon': lon,
        'sourceId': zone_id,
        'sourceLayer': 'regime',
        'regionCode': zone_id,
        'regionGroup': label,
        'linkedEventId': None,
        'linkedEventSlug': None,
        'relatedNewsClusterIds': [],
        'relatedNewsIds': [],
        'linkedAssetSymbols': _as_str_list(zone.get('relatedAssets'), limit=8),
        'tags': _as_str_list(['Regime', regime], limit=6),
        'geoboardModes': _safe_modes(zone.get('geoboardModes'), 'regime'),
        'links': {**_base_links(), 'bias': '/app/market-bias'},
        'sourceMeta': _safe_source_meta(zone.get('sourceMeta'), 'regime'),
        'ranking': ranking,
    }


def _is_mode_visible(item: dict[str, Any], active_mode: str) -> bool:
    if active_mode == 'STANDARD':
        return True
    modes = item.get('geoboardModes')
    return isinstance(modes, list) and active_mode in modes


def _dedupe_feed(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    deduped: dict[str, dict[str, Any]] = {}
    for item in items:
        key = _as_str(item.get('id'))
        if not key:
            continue
        existing = deduped.get(key)
        if existing is None:
            deduped[key] = item
            continue
        left = _as_float(existing.get('ranking', {}).get('rankScore'))
        right = _as_float(item.get('ranking', {}).get('rankScore'))
        if right >= left:
            deduped[key] = item
    return list(deduped.values())


def _feed_from_layers(
    geo_events: list[dict[str, Any]],
    macro_events: list[dict[str, Any]],
    central_banks: list[dict[str, Any]],
    trade_routes: list[dict[str, Any]],
    regime_zones: list[dict[str, Any]],
    active_mode: str,
    feed_evaluation: dict[str, Any],
    generated_at: str | None = None,
) -> list[dict[str, Any]]:
    mode = active_mode if active_mode in ALLOWED_MODES else 'STANDARD'
    generated = generated_at or utc_now().isoformat()
    feed_rows: list[dict[str, Any]] = []

    for event in geo_events:
        row = _build_geo_feed_row(event)
        if row is not None:
            feed_rows.append(row)
    for event in macro_events:
        row = _build_macro_feed_row(event)
        if row is not None:
            feed_rows.append(row)
    for node in central_banks:
        row = _build_cb_feed_row(node)
        if row is not None:
            feed_rows.append(row)
    for route in trade_routes:
        row = _build_trade_feed_row(route, generated)
        if row is not None:
            feed_rows.append(row)
    for zone in regime_zones:
        row = _build_regime_feed_row(zone, generated)
        if row is not None:
            feed_rows.append(row)

    enriched_rows = [_with_feed_rank_overlay(item, active_mode=mode) for item in feed_rows]
    enriched_rows = [_attach_feed_intelligence(item, feed_evaluation) for item in enriched_rows]
    visible_rows = [item for item in enriched_rows if _is_mode_visible(item, mode)]
    visible_rows = _dedupe_feed(visible_rows)
    visible_rows.sort(
        key=lambda item: (
            _as_float(item.get('ranking', {}).get('rankScore')),
            _timestamp(item.get('time')),
            _as_str(item.get('id')),
        ),
        reverse=True,
    )
    return visible_rows[:45]


def _mode_state(active_mode: str, source_status: list[dict[str, Any]]) -> dict[str, Any]:
    normalized = active_mode if active_mode in ALLOWED_MODES else 'STANDARD'
    fallback = any(_as_str(item.get('state')) in {'fallback', 'degraded'} for item in source_status)
    live = len([item for item in source_status if _as_str(item.get('state')) == 'live'])
    static = len([item for item in source_status if _as_str(item.get('state')) == 'static'])
    derived = len([item for item in source_status if _as_str(item.get('state')) == 'derived'])
    fallback_layers = len([item for item in source_status if _as_str(item.get('state')) in {'fallback', 'degraded'}])
    honesty = (
        f'Discovery rows are ranked signals (L{live}); curated overlays remain static (S{static}); '
        f'derived regime/macro context remains modeled (D{derived}); fallback/degraded layers stay explicit (F{fallback_layers}).'
    )
    return {
        'activeMode': normalized,
        'availableModes': ['STANDARD', 'RISK', 'LIQUIDITY', 'CENT.BANKS'],
        'fallback': fallback,
        'sourceHonesty': honesty,
    }


__all__ = ['_feed_from_layers', '_mode_state']
