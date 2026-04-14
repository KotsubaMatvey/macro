from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import app.event_service as event_service


def _calendar_event(event_id: str = 'event-cpi'):
    return {
        'id': event_id,
        'family': 'US CPI',
        'title': 'US CPI Release',
        'slug': 'us-cpi-release',
        'country': 'United States',
        'currency': 'USD',
        'impact': 'High',
        'category': 'Inflation',
        'scheduledAt': '2026-04-20T12:30:00+00:00',
        'status': 'Upcoming',
        'previous': 3.1,
        'forecast': 2.9,
        'actual': None,
        'surprise': None,
        'whyItMatters': 'Core inflation can reprice front-end rates and USD risk premia.',
        'relatedAssets': ['SPX', 'DXY', 'US2Y'],
        'providerEventId': 'te-12345',
        'freshness': {
            'label': 'Catalyst calendar',
            'source': 'TradingEconomics',
            'sourceUrl': 'https://api.tradingeconomics.com',
            'mode': 'live',
            'freshness': 'fresh',
            'note': 'Live calendar row',
        },
    }


def test_list_events_returns_intelligence_enriched_rows(monkeypatch):
    monkeypatch.setattr(event_service, 'list_calendar_events', lambda **_kwargs: [_calendar_event()])
    monkeypatch.setattr(
        event_service,
        'latest_evaluation_metadata',
        lambda *args, **kwargs: {
            'surface': 'calendar',
            'signalType': 'event-quality',
            'signalRef': 'US CPI',
            'sampleSize': 0,
            'coverage': 0.0,
            'mode': 'replay',
            'note': 'pending',
        },
    )

    rows = event_service.list_events()

    assert rows
    item = rows[0]
    assert item['rankingScore'] > 0
    assert item['importanceScore'] > 0
    assert item['linkedEvents'] == ['event-cpi']
    assert item['intelligence']['sourceType'] in {'official', 'fallback'}
    assert item['intelligence']['linkedAssets']
    assert item['evaluation']['surface'] == 'calendar'


def test_event_detail_merges_links_reactions_and_intelligence(monkeypatch):
    monkeypatch.setattr(event_service, 'get_calendar_event', lambda _event_id: _calendar_event())
    monkeypatch.setattr(
        event_service,
        'build_reactions_payload',
        lambda **_kwargs: {
            'summary': {
                'windowStats': [
                    {'window': '1d', 'meanMovePct': 0.45, 'positiveHitRate': 0.62},
                    {'window': '5d', 'meanMovePct': 0.9, 'positiveHitRate': 0.58},
                ]
            }
        },
    )
    monkeypatch.setattr(event_service, '_briefings', lambda *_args, **_kwargs: [{'id': 'brief-1', 'slug': 'cpi-brief', 'title': 'CPI playbook'}])
    monkeypatch.setattr(
        event_service,
        '_news',
        lambda *_args, **_kwargs: [
            {
                'id': 'news-1',
                'slug': 'cpi-wire',
                'title': 'CPI preview',
                'source': 'Federal Reserve',
                'publishedAt': '2026-04-18T12:00:00+00:00',
                'summary': 'Macro setup ahead of print.',
                'category': 'Inflation',
                'relatedEventId': 'event-cpi',
            }
        ],
    )
    monkeypatch.setattr(
        event_service,
        'latest_evaluation_metadata',
        lambda *args, **kwargs: {
            'surface': 'calendar',
            'signalType': 'event-quality',
            'signalRef': 'US CPI',
            'sampleSize': 4,
            'coverage': 1.0,
            'mode': 'replay',
            'note': 'stub',
        },
    )

    detail = event_service.event_detail('event-cpi')

    assert detail is not None
    assert detail['historicalReactions']
    assert detail['linkedBriefings']
    assert detail['linkedNews']
    assert detail['linkedNews'][0]['id'] == 'news-1'
    assert 'news-1' in detail['intelligence']['linkedNews']
    assert detail['rankingScore'] > 0

