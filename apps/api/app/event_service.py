from __future__ import annotations

from datetime import datetime, timezone

from .calendar_data import get_calendar_event, list_calendar_events
from .db import fetch_all
from .evaluation_service import latest_evaluation_metadata
from .insights_service import build_reactions_payload
from .intelligence_contracts import build_intelligence_contract, build_linked_references
from .intelligence_scoring import (
    UnifiedScoreInputs,
    asset_breadth_score,
    compute_unified_scores,
    event_proximity_score,
    recency_score,
    source_quality_score,
    watchlist_overlap_score,
)
from .news_service import list_news_for_workstation
from .security import reference_now


def _parse_dt(value: object) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        parsed = value
    else:
        try:
            parsed = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
        except ValueError:
            return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _event_base_scores(item: dict, linked_news_count: int = 0, watch_hits: int = 0) -> dict:
    impact = str(item.get('impact') or '').lower()
    importance = 0.84 if impact == 'high' else 0.66 if impact == 'medium' else 0.50

    scheduled = _parse_dt(item.get('scheduledAt'))
    if scheduled is None:
        proximity = 0.22
    else:
        hours_to_event = (scheduled - reference_now()).total_seconds() / 3600.0
        proximity = event_proximity_score(hours_to_event)

    freshness = item.get('freshness') if isinstance(item.get('freshness'), dict) else {}
    mode = str(freshness.get('mode') or 'fallback')
    source = str(freshness.get('source') or '')
    source_type = 'official' if 'TradingEconomics' in source else 'fallback'
    source_tier = 'primary' if source_type == 'official' else 'secondary'

    confidence = 0.78 if source_type == 'official' else 0.62
    if mode in {'demo', 'fallback'}:
        confidence = min(confidence, 0.64)

    category = str(item.get('category') or 'Macro')
    regime_relevance = {
        'Central bank': 0.84,
        'Inflation': 0.82,
        'Labor': 0.76,
        'Growth': 0.72,
        'Macro': 0.66,
    }.get(category, 0.62)

    related_assets = item.get('relatedAssets') if isinstance(item.get('relatedAssets'), list) else []
    scores = compute_unified_scores(
        UnifiedScoreInputs(
            importance=importance,
            urgency=proximity,
            confidence=confidence,
            source_quality=source_quality_score(source_type, source_tier, mode),
            recency=recency_score(item.get('scheduledAt'), horizon_hours=24.0 * 14.0),
            watchlist_overlap=watchlist_overlap_score(watch_hits, max_hits=4),
            event_proximity=proximity,
            asset_breadth=asset_breadth_score(len(related_assets), max_assets=6),
            regime_relevance=regime_relevance,
            evidence_density=min(1.0, max(0.15, linked_news_count / 6.0)),
        ),
        rationale=[
            'Unified calendar scoring blends event importance, proximity, confidence, market relevance, and desk relevance.',
            'Ranking is deterministic and source-aware; fallback/demo rows carry lower confidence.',
        ],
    )
    return scores


def _enrich_event(
    item: dict,
    *,
    linked_news: list[dict] | None = None,
    linked_briefings: list[dict] | None = None,
) -> dict:
    linked_news = linked_news or []
    linked_briefings = linked_briefings or []
    scores = _event_base_scores(item, linked_news_count=len(linked_news), watch_hits=0)

    freshness = item.get('freshness') if isinstance(item.get('freshness'), dict) else {}
    mode = str(freshness.get('mode') or 'fallback')
    source = str(freshness.get('source') or 'Catalyst calendar')
    source_url = freshness.get('sourceUrl')
    source_type = 'official' if 'TradingEconomics' in source else 'fallback'
    source_tier = 'primary' if source_type == 'official' else 'secondary'

    linked_refs = build_linked_references(
        linked_assets=item.get('relatedAssets') or [],
        linked_events=[item.get('id')] if item.get('id') else [],
        linked_regions=[item.get('country'), item.get('currency')],
        linked_news=[row.get('id') for row in linked_news if row.get('id')],
        linked_reports=['weekly-macro-brief'],
        linked_reactions=[item.get('family')] if item.get('family') else [],
    )

    eval_ref = str(item.get('family') or item.get('id') or 'calendar-event')
    evaluation = latest_evaluation_metadata(
        'calendar',
        'event-quality',
        eval_ref,
        fallback_note='Calendar event evaluation is pending and remains replay-safe.',
    )

    fallback_reason = '' if mode == 'live' else str(freshness.get('note') or '')
    intelligence = build_intelligence_contract(
        source=source,
        source_type=source_type,
        source_tier=source_tier,
        source_url=str(source_url) if source_url else None,
        mode=mode,
        freshness=str(freshness.get('freshness') or 'degraded'),
        scores=scores,
        links=linked_refs,
        derived_from=[item.get('providerEventId'), item.get('family'), item.get('category')],
        fallback_reason=fallback_reason,
        evaluation=evaluation,
    )

    enriched = dict(item)
    enriched['importanceScore'] = float(scores.get('importanceScore') or 0.0)
    enriched['urgencyScore'] = float(scores.get('urgencyScore') or 0.0)
    enriched['confidenceScore'] = float(scores.get('confidenceScore') or 0.0)
    enriched['marketRelevanceScore'] = float(scores.get('marketRelevanceScore') or 0.0)
    enriched['deskRelevanceScore'] = float(scores.get('deskRelevanceScore') or 0.0)
    enriched['rankingScore'] = float(scores.get('rankScore') or 0.0)
    enriched['linkedAssets'] = linked_refs['linkedAssets']
    enriched['linkedEvents'] = linked_refs['linkedEvents']
    enriched['linkedRegions'] = linked_refs['linkedRegions']
    if isinstance(enriched.get('linkedNews'), list) and enriched['linkedNews'] and isinstance(enriched['linkedNews'][0], dict):
        enriched['linkedNewsRefs'] = linked_refs['linkedNews']
    else:
        enriched['linkedNews'] = linked_refs['linkedNews']
    enriched['linkedReports'] = linked_refs['linkedReports']
    enriched['linkedReactions'] = linked_refs['linkedReactions']
    enriched['derivedFrom'] = intelligence['derivedFrom']
    enriched['fallbackReason'] = intelligence['fallbackReason']
    enriched['evaluation'] = evaluation
    enriched['intelligence'] = intelligence
    return enriched


def list_events(search=None, family=None, days_back=30, days_forward=60):
    base = list_calendar_events(
        search=search,
        family=family,
        days_back=days_back,
        days_forward=days_forward,
    )
    return [_enrich_event(item) for item in base if isinstance(item, dict)]


def _reaction_rows(reactions):
    rows = []
    for row in reactions.get('summary', {}).get('windowStats', []):
        rows.append(
            {
                'window': row['window'],
                'avgMovePct': row['meanMovePct'],
                'consistency': row['positiveHitRate'],
                'narrative': 'Historical reaction summary built from real market history for the event family.',
            }
        )
    return rows


def _briefings(item, asset):
    rows = fetch_all(
        "select b.id, b.slug, b.title, b.kind, b.published_at, b.summary, u.name as analyst_name, b.takeaways, b.asset_symbols from briefings b join users u on u.id = b.analyst_user_id where b.event_id = %s or b.asset_symbols ? %s order by b.published_at desc",
        (item['id'], asset),
    )
    return [
        {
            'id': row['id'],
            'slug': row['slug'],
            'title': row['title'],
            'kind': row['kind'],
            'publishedAt': row['published_at'].isoformat(),
            'summary': row['summary'],
            'analystName': row['analyst_name'],
            'takeaways': row['takeaways'],
            'assetSymbols': row['asset_symbols'],
        }
        for row in rows
    ]


def _news(item):
    rows = list_news_for_workstation(limit=60)
    linked = []
    for row in rows:
        related_event_id = row.get('relatedEventId')
        row_category = row.get('category')
        if related_event_id == item['id'] or row_category == item['category']:
            linked.append(
                {
                    'id': row['id'],
                    'slug': row['slug'],
                    'title': row['title'],
                    'source': row['source'],
                    'publishedAt': row['publishedAt'],
                    'summary': row['summary'],
                    'category': row['category'],
                    'sentiment': row.get('sentiment', 'Neutral'),
                    'relatedEventId': row.get('relatedEventId'),
                }
            )
    return linked[:12]


def event_detail(event_id):
    item = get_calendar_event(event_id)
    if not item:
        return None
    asset = item['relatedAssets'][0] if item.get('relatedAssets') else 'SPX'
    try:
        reactions = build_reactions_payload(
            family=item['family'],
            asset=asset,
            country=item['country'],
            currency=item['currency'],
        )
    except Exception:
        fallback_rows = fetch_all(
            'select reaction_window, avg_move_pct, consistency, narrative from event_reaction_windows where event_id = %s order by reaction_window',
            (item['id'],),
        )
        reactions = {
            'summary': {
                'windowStats': [
                    {
                        'window': row['reaction_window'],
                        'meanMovePct': float(row['avg_move_pct']),
                        'positiveHitRate': float(row['consistency']),
                    }
                    for row in fallback_rows
                ]
            }
        }
    detail = dict(item)
    detail['historicalReactions'] = _reaction_rows(reactions)
    detail['linkedBriefings'] = _briefings(item, asset)
    detail['linkedNews'] = _news(item)
    return _enrich_event(detail, linked_news=detail['linkedNews'], linked_briefings=detail['linkedBriefings'])

