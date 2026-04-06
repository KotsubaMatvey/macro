from pathlib import Path
import importlib
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import insights_service as insights_service_module
from app.providers import ProviderError

def fresh_module():
 return importlib.reload(insights_service_module)

def test_build_reactions_payload_only_exposes_supported_windows(monkeypatch):
 insights_service = fresh_module()
 monkeypatch.setattr(insights_service, 'read_provider_payload', lambda key: None)
 monkeypatch.setattr(insights_service, 'cache_provider_payload', lambda *args, **kwargs: None)
 monkeypatch.setattr(insights_service, 'calendar_feed', lambda **kwargs: { 'events': [{ 'id': 'event-cpi-mar', 'family': 'CPI', 'title': 'US CPI', 'country': 'United States', 'currency': 'USD', 'scheduledAt': '2026-04-01T12:30:00+00:00', 'status': 'Released' }], 'mode': 'live', 'freshness': 'fresh', 'note': 'Live calendar' })
 def fake_series(symbol, interval='1d', period='18mo'):
  if interval == '60m': raise ProviderError('intraday unavailable')
  return { 'source': 'FRED public series', 'sourceUrl': 'https://fred.stlouisfed.org/series/SP500', 'fetchedAt': '2026-04-10T08:00:00+00:00', 'lastUpdated': '2026-04-10T08:00:00+00:00', 'mode': 'fallback', 'note': 'Fallback history', 'points': [{ 'date': '2026-04-02T00:00:00+00:00', 'value': 100.0 }, { 'date': '2026-04-03T00:00:00+00:00', 'value': 101.0 }, { 'date': '2026-04-04T00:00:00+00:00', 'value': 102.0 }, { 'date': '2026-04-05T00:00:00+00:00', 'value': 103.0 }, { 'date': '2026-04-06T00:00:00+00:00', 'value': 104.0 }, { 'date': '2026-04-07T00:00:00+00:00', 'value': 105.0 }, { 'date': '2026-04-08T00:00:00+00:00', 'value': 106.0 }] }
 monkeypatch.setattr(insights_service, 'load_market_series', fake_series)
 payload = insights_service.build_reactions_payload(family='CPI', asset='SPX', country='United States', currency='USD')
 assert [item['window'] for item in payload['summary']['windowStats']] == ['1d', '5d']
 assert 'immediate' not in payload['records'][0]['windows']
 assert payload['summary']['note'].startswith('Only windows supportable')

def test_build_track_record_payload_is_replay_only(monkeypatch):
 insights_service = fresh_module()
 monkeypatch.setattr(insights_service, 'read_provider_payload', lambda key: None)
 monkeypatch.setattr(insights_service, 'cache_provider_payload', lambda *args, **kwargs: None)
 def fake_series(symbol, interval='1d', period='18mo'):
  points = [{ 'date': '2026-01-' + str(day).zfill(2), 'value': 100.0 + day } for day in range(1, 29)] + [{ 'date': '2026-02-' + str(day).zfill(2), 'value': 128.0 + day } for day in range(1, 29)]
  return { 'source': 'FRED public series', 'sourceUrl': 'https://fred.stlouisfed.org/series/SP500', 'fetchedAt': '2026-04-10T08:00:00+00:00', 'lastUpdated': '2026-04-10T08:00:00+00:00', 'mode': 'live', 'note': 'Live history', 'points': points }
 monkeypatch.setattr(insights_service, 'load_market_series', fake_series)
 payload = insights_service.build_track_record_payload()
 assert payload['mode'] == 'replay'
 assert payload['label'] == 'Replay only'
 assert payload['sampleSize'] != 0 
 assert 'not audited live discretionary PnL' in payload['note']

def test_generate_weekly_report_is_deterministic(monkeypatch):
 insights_service = fresh_module()
 monkeypatch.setattr(insights_service, 'cache_provider_payload', lambda *args, **kwargs: None)
 monkeypatch.setattr(insights_service, 'build_market_bias_payload', lambda: { 'summary': { 'label': 'Supportive', 'note': 'Bias note', 'freshness': { 'label': 'Bias', 'source': 'Composite', 'freshness': 'fresh', 'mode': 'live', 'note': 'Bias freshness' } }, 'assets': [{ 'symbol': 'SPX', 'note': 'Equity note' }], 'factors': [{ 'label': 'Liquidity', 'note': 'Liquidity note' }] })
 monkeypatch.setattr(insights_service, 'build_reactions_payload', lambda family=None, asset='SPX', country=None, currency=None: { 'summary': { 'sampleSize': 4, 'freshness': { 'label': 'Reactions', 'source': 'FRED', 'freshness': 'fresh', 'mode': 'fallback', 'note': 'Reaction freshness' } } })
 monkeypatch.setattr(insights_service, 'build_track_record_payload', lambda: { 'label': 'Replay only', 'hitRate': 0.5, 'sampleSize': 6, 'freshness': { 'label': 'Track record', 'source': 'Replay', 'freshness': 'fresh', 'mode': 'fallback', 'note': 'Replay freshness' } })
 monkeypatch.setattr(insights_service, 'calendar_feed', lambda **kwargs: { 'events': [{ 'id': 'event-cpi-mar', 'title': 'US CPI', 'impact': 'High' } for _ in range(3)] })
 payload = insights_service.generate_weekly_report(persist=False)
 assert payload['mode'] == 'deterministic'
 assert payload['status'] == 'ready'
 assert payload['body']['watchItems']
 assert len(payload['sourceMeta']) == 3 
