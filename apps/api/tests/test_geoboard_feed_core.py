from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.geoboard_core.feed import _feed_from_layers, _mode_state


def _source_meta(source_type='discovery', mode='live', freshness='fresh'):
 return {
  'providerKey': 'test-provider',
  'label': 'Test source',
  'sourceType': source_type,
  'sourceTier': 'secondary',
  'mode': mode,
  'freshness': freshness,
  'note': 'test note',
  'sourceUrl': 'https://example.com/source',
 }


def _ranking(rank_score=0.8):
 return {
  'rankScore': rank_score,
  'urgencyScore': 0.7,
  'importanceScore': 0.8,
  'confidenceScore': 0.65,
  'marketRelevanceScore': 0.7,
  'deskRelevanceScore': 0.6,
  'recencyScore': 0.8,
  'sourceQualityScore': 0.6,
  'watchlistOverlapScore': 0.2,
  'catalystProximityScore': 0.5,
  'regionSignificanceScore': 0.7,
  'regimeRelevanceScore': 0.6,
  'componentScores': {},
  'rationale': ['test ranking'],
 }


def test_feed_drops_rows_with_invalid_coordinates():
 geo_rows = [
  {
   'id': 'geo-invalid',
   'title': 'bad coords',
   'lat': 123.0,
   'lon': 10.0,
   'date': '2026-04-18T08:00:00+00:00',
   'country': 'Global',
   'classification': 'Conflict',
   'affectedAssets': ['DXY'],
   'geoboardModes': ['STANDARD', 'RISK'],
   'sourceMeta': _source_meta(),
   'ranking': _ranking(0.95),
  },
 ]

 feed = _feed_from_layers(geo_rows, [], [], [], [], 'STANDARD', {}, generated_at='2026-04-18T10:00:00+00:00')
 assert feed == []


def test_feed_sanitizes_links_and_applies_fallback_rank_cap():
 macro_rows = [
  {
   'id': 'macro-fallback',
   'name': 'Fallback macro row',
   'lat': 40.0,
   'lon': -70.0,
   'date': '2026-04-18T08:00:00+00:00',
   'family': 'US CPI',
   'country': 'United States',
   'relatedAssets': ['DXY', 'US10Y'],
   'linkedCalendarPath': 'javascript:alert(1)',
   'linkedReactionPath': 'https://evil.example/reactions',
   'linkedBiasPath': '/app/market-bias',
   'linkedReportsPath': '/app/reports',
   'linkedNewsPath': 'javascript:alert(2)',
   'geoboardModes': ['STANDARD', 'LIQUIDITY'],
   'sourceMeta': _source_meta(source_type='fallback', mode='fallback', freshness='degraded'),
   'ranking': _ranking(0.99),
  },
 ]

 feed = _feed_from_layers([], macro_rows, [], [], [], 'LIQUIDITY', {}, generated_at='2026-04-18T10:00:00+00:00')
 assert len(feed) == 1
 item = feed[0]
 assert item['links']['calendar'] == '/app/macro-calendar'
 assert item['links']['reactions'] == '/app/live-reactions'
 assert item['links']['news'] == '/app/news'
 assert item['ranking']['rankScore'] <= 0.72


def test_feed_mode_filter_and_mode_state_honesty():
 geo_rows = [
  {
   'id': 'geo-1',
   'title': 'Geo risk row',
   'lat': 25.0,
   'lon': 56.0,
   'date': '2026-04-18T08:00:00+00:00',
   'country': 'Iran',
   'classification': 'Shipping / Logistics',
   'affectedAssets': ['OIL'],
   'geoboardModes': ['STANDARD', 'RISK'],
   'sourceMeta': _source_meta(source_type='discovery', mode='live', freshness='fresh'),
   'ranking': _ranking(0.86),
  },
 ]
 cb_rows = [
  {
   'id': 'fed',
   'name': 'FED',
   'lat': 38.9,
   'lon': -77.0,
   'nextMeeting': '2026-05-06',
   'country': 'United States',
   'signal': 'USD LIQUIDITY TIGHT',
   'relatedAssets': ['DXY'],
   'geoboardModes': ['STANDARD', 'LIQUIDITY', 'CENT.BANKS'],
   'sourceMeta': _source_meta(source_type='static', mode='static', freshness='degraded'),
   'ranking': _ranking(0.88),
  },
 ]

 risk_feed = _feed_from_layers(geo_rows, [], cb_rows, [], [], 'RISK', {}, generated_at='2026-04-18T10:00:00+00:00')
 assert risk_feed
 assert all(item['sourceLayer'] == 'geo' for item in risk_feed)

 mode_state = _mode_state(
  'RISK',
  [
   {'layer': 'geo', 'state': 'live'},
   {'layer': 'macro', 'state': 'derived'},
   {'layer': 'cb', 'state': 'static'},
   {'layer': 'trade', 'state': 'fallback'},
   {'layer': 'regime', 'state': 'derived'},
   {'layer': 'feed', 'state': 'degraded'},
  ],
 )
 assert mode_state['fallback'] is True
 assert 'Discovery rows are ranked signals' in mode_state['sourceHonesty']
