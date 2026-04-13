from datetime import timedelta
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.security import reference_now
import app.geoboard_service as geoboard_service


def _empty_watch():
 return {'symbols': set(), 'families': set(), 'regions': set(), 'currencies': set(), 'activeAlerts': 0}


def test_geo_fallback_source_integrity(monkeypatch):
 monkeypatch.setattr(geoboard_service, 'read_provider_payload', lambda *_args, **_kwargs: None)
 monkeypatch.setattr(geoboard_service, 'cache_provider_payload', lambda *_args, **_kwargs: None)

 def _raise():
  raise RuntimeError('gdelt unavailable')

 monkeypatch.setattr(geoboard_service, '_fetch_gdelt_rows', _raise)
 events, status = geoboard_service._build_geo_events(reference_now(), [], [], _empty_watch(), 'NEUTRAL')

 assert status['state'] == 'fallback'
 assert events
 assert all(item['sourceMeta']['sourceType'] == 'fallback' for item in events)
 assert all(item['mode'] == 'fallback' for item in events)
 assert all(item['classification'] for item in events)


def test_macro_projection_adds_horizon_links_and_ranking(monkeypatch):
 now = reference_now()
 rows = [
  {
   'id': 'event-near',
   'slug': 'event-near',
   'status': 'Upcoming',
   'title': 'US CPI Release',
   'scheduled_at': now + timedelta(hours=2),
   'forecast_value': 2.9,
   'previous_value': 3.1,
   'expected_reaction': 'Rates and dollar should react quickly.',
   'family': 'US CPI',
   'category': 'Inflation',
   'country': 'United States',
   'currency': 'USD',
   'importance': 'High',
   'related_assets': ['SPX', 'DXY', 'XAU'],
  },
  {
   'id': 'event-later',
   'slug': 'event-later',
   'status': 'Upcoming',
   'title': 'ECB Decision',
   'scheduled_at': now + timedelta(days=6),
   'forecast_value': 3.5,
   'previous_value': 3.5,
   'expected_reaction': 'EUR rates guidance event.',
   'family': 'ECB Rate Decision',
   'category': 'Central bank',
   'country': 'Euro Area',
   'currency': 'EUR',
   'importance': 'High',
   'related_assets': ['EURUSD', 'BUND', 'DAX'],
  },
 ]

 monkeypatch.setattr(geoboard_service, 'read_provider_payload', lambda *_args, **_kwargs: None)
 monkeypatch.setattr(geoboard_service, 'cache_provider_payload', lambda *_args, **_kwargs: None)
 monkeypatch.setattr(geoboard_service, '_macro_rows', lambda *_args, **_kwargs: rows)

 events, status = geoboard_service._build_macro_events(now, _empty_watch(), [], 'NEUTRAL')

 assert status['sourceType'] == 'derived'
 assert events[0]['id'] == 'event-near'
 assert events[0]['horizonTag'] == 'today'
 assert events[0]['linkedCalendarPath'].startswith('/app/macro-calendar')
 assert events[0]['linkedReactionPath'].startswith('/app/live-reactions')
 assert events[0]['ranking']['rankScore'] >= events[1]['ranking']['rankScore']


def test_geoboard_payload_has_ranked_feed_and_source_status(monkeypatch):
 now = reference_now()
 rows = [
  {
   'id': 'event-near',
   'slug': 'event-near',
   'status': 'Upcoming',
   'title': 'US CPI Release',
   'scheduled_at': now + timedelta(hours=3),
   'forecast_value': 2.9,
   'previous_value': 3.1,
   'expected_reaction': 'Rates and dollar should react quickly.',
   'family': 'US CPI',
   'category': 'Inflation',
   'country': 'United States',
   'currency': 'USD',
   'importance': 'High',
   'related_assets': ['SPX', 'DXY', 'XAU'],
  },
 ]

 monkeypatch.setattr(geoboard_service, 'read_provider_payload', lambda *_args, **_kwargs: None)
 monkeypatch.setattr(geoboard_service, 'cache_provider_payload', lambda *_args, **_kwargs: None)
 monkeypatch.setattr(geoboard_service, '_macro_rows', lambda *_args, **_kwargs: rows)
 monkeypatch.setattr(geoboard_service, '_fetch_gdelt_rows', lambda: ([], False))

 payload = geoboard_service.geoboard_payload({'id': 'user-demo'}, 'STANDARD')

 assert payload['feed']
 assert any(item['feedType'] == 'MACRO_CATALYST' for item in payload['feed'])
 assert any(item['feedType'] == 'GEO_RISK' for item in payload['feed'])
 assert any(item['layer'] == 'geo' for item in payload['sourceStatus'])
 assert any(item['layer'] == 'macro' for item in payload['sourceStatus'])
 assert 'Discovery rows are ranked signals' in payload['modeState']['sourceHonesty']
 assert payload['summary']['totalFeedItems'] == len(payload['feed'])
