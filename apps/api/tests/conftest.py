from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest

from app import calendar_data, dashboard_service, insights_service

def fake_freshness(label, mode="live", freshness="fresh", note="Stubbed in tests"):
 return {"label": label, "source": "Test provider", "sourceUrl": "https://example.com", "fetchedAt": "2026-04-25T08:00:00+00:00", "lastUpdated": "2026-04-25T08:00:00+00:00", "freshness": freshness, "mode": mode, "note": note}

def fake_event():
 return {"id": "event-cpi-mar", "family": "CPI", "title": "US CPI", "slug": "us-cpi-mar", "country": "United States", "currency": "USD", "impact": "High", "category": "Inflation", "scheduledAt": "2026-04-25T12:30:00+00:00", "status": "Upcoming", "previous": 3.2, "forecast": 3.1, "actual": None, "surprise": None, "whyItMatters": "Inflation tone drives front-end yields and dollar reaction.", "relatedAssets": ["SPX", "DXY"], "freshness": fake_freshness("Catalyst calendar", mode="live", note="TradingEconomics stub") }

def fake_bias_payload():
 freshness = fake_freshness("Market bias", mode="live")
 return {"summary": {"label": "Risk-on", "score": 62.0, "confidence": 0.74, "note": "Stubbed cross-asset posture for tests.", "freshness": freshness}, "factors": [{"key": "liquidity", "label": "Liquidity", "score": 64.0, "direction": "Supportive", "strength": 0.7, "confidence": 0.75, "detail": "Balance sheet and reserves improving.", "note": "Liquidity backdrop is supportive.", "source": freshness}], "assets": [{"symbol": "SPX", "name": "S&P 500", "direction": "Bullish", "score": 63.0, "confidence": 0.7, "change1d": 0.5, "change30d": 2.4, "note": "Stubbed market tape.", "freshness": freshness}, {"symbol": "DXY", "name": "Dollar Index", "direction": "Bearish", "score": 44.0, "confidence": 0.66, "change1d": -0.2, "change30d": -1.1, "note": "Dollar pressure easing.", "freshness": freshness}], "providerStatus": {"live": 2, "degraded": 0, "detail": {"SPX": "live", "DXY": "live"}}}

def fake_reactions_payload(family="CPI", asset="SPX", country="United States", currency="USD"):
 freshness = fake_freshness("Reactions", mode="live")
 return {"filters": {"family": family, "asset": asset, "country": country, "currency": currency}, "familyOptions": ["CPI", "NFP", "FOMC"], "assetOptions": ["SPX", "DXY", "US10Y"], "summary": {"sampleSize": 3, "directionDistribution": {"positive": 2, "negative": 1, "flat": 0}, "windowStats": [{"window": "1d", "sampleSize": 3, "meanMovePct": 0.42, "medianMovePct": 0.39, "positiveHitRate": 0.67, "negativeHitRate": 0.33}, {"window": "5d", "sampleSize": 3, "meanMovePct": 0.85, "medianMovePct": 0.8, "positiveHitRate": 0.67, "negativeHitRate": 0.33}], "note": "Stubbed event-family study for tests.", "freshness": freshness}, "records": [{"eventId": "event-cpi-mar", "title": "US CPI", "family": family, "scheduledAt": "2026-04-25T12:30:00+00:00", "country": country, "currency": currency, "href": "/app/events/event-cpi-mar", "windows": {"immediate": 0.1, "1h": 0.2, "4h": 0.35, "1d": 0.5, "5d": 0.9}}], "calendar": {"mode": "live", "freshness": "fresh", "note": "TradingEconomics stub"}}

def fake_track_record_payload():
 freshness = fake_freshness("Track record", mode="fallback", note="Replay only")
 return {"mode": "fallback", "label": "Replay only", "sampleSize": 4, "hitRate": 0.5, "magnitudeErrorPct": 0.62, "bySignalType": [{"signalType": "trend-regime replay", "sampleSize": 4, "hitRate": 0.5}], "byAsset": [{"asset": "SPX", "sampleSize": 4, "hitRate": 0.5, "magnitudeErrorPct": 0.62}], "byEventFamily": [{"family": "CPI", "sampleSize": 2, "hitRate": 0.5}], "byRegime": [{"regime": "Expansionary", "sampleSize": 4, "hitRate": 0.5}], "recentRecords": [{"symbol": "SPX", "asOf": "2026-04-24T00:00:00+00:00", "stance": "Long", "expectedMove5dPct": 1.1, "realizedMove5dPct": 0.8, "outcome": "Hit", "signalType": "trend-regime replay", "family": "CPI", "href": "/app/events/event-cpi-mar", "regime": "Expansionary"}], "note": "Replay only, not audited live PnL.", "freshness": freshness}

def fake_report():
 freshness = fake_freshness("Weekly report", mode="fallback", note="Deterministic report stub")
 return {"id": "report-2026-w17", "slug": "weekly-report-2026-w17", "title": "Weekly Macro Brief", "status": "ready", "mode": "deterministic", "weekStart": "2026-04-20", "weekEnd": "2026-04-26", "summary": "Stubbed weekly report summary.", "body": {"watchItems": ["US CPI", "Dollar softness", "Liquidity stabilization"]}, "sourceMeta": [freshness], "createdAt": "2026-04-26T08:00:00+00:00"}

def fake_series(symbol):
 points = [{"date": "2026-03-" + str(day).zfill(2), "value": 100.0 + day} for day in range(1, 29)]
 return {"seriesId": symbol, "source": "Test provider", "sourceUrl": "https://example.com/" + symbol, "fetchedAt": "2026-04-25T08:00:00+00:00", "lastUpdated": "2026-04-25T08:00:00+00:00", "mode": "live", "note": "Stubbed market series", "points": points}

@pytest.fixture(autouse=True)
def stub_real_data_layers(monkeypatch):
 event = fake_event()
 monkeypatch.setattr(calendar_data, "list_calendar_events", lambda search=None, family=None, days_back=30, days_forward=60: [event] if not family or family == event["family"] else [])
 monkeypatch.setattr(calendar_data, "get_calendar_event", lambda event_id: dict(event) if event_id in [event["id"], event["slug"]] else None)
 monkeypatch.setattr(insights_service, "build_market_bias_payload", lambda: fake_bias_payload())
 monkeypatch.setattr(insights_service, "build_reactions_payload", lambda family=None, asset="SPX", country=None, currency=None: fake_reactions_payload(family or event["family"], asset, country or event["country"], currency or event["currency"]))
 monkeypatch.setattr(insights_service, "build_track_record_payload", lambda: fake_track_record_payload())
 monkeypatch.setattr(insights_service, "list_reports", lambda limit=12: [fake_report()][:limit])
 monkeypatch.setattr(dashboard_service, "_market_bias_payload_service", lambda: fake_bias_payload())
 monkeypatch.setattr(dashboard_service, "_dashboard_track_record", lambda: {"status": "Replay only", "evaluationMode": "replay", "sampleSize": 4, "hitRate": 0.5, "magnitudeErrorPct": 0.62, "note": "Replay only.", "records": [{"symbol": "SPX", "asOf": "2026-04-24T00:00:00+00:00", "stance": "Long", "expectedMove5dPct": 1.1, "realizedMove5dPct": 0.8, "outcome": "Hit", "linkedEventTitle": None, "linkedEventHref": None}], "freshness": fake_freshness("Track record", mode="fallback", note="Replay only")})
 monkeypatch.setattr(dashboard_service, "list_events", lambda: [event])
 monkeypatch.setattr(dashboard_service, "_load_series", lambda symbol: fake_series(symbol))
 monkeypatch.setattr(dashboard_service, "_load_live_news", lambda: ([{"title": "Fed headline", "subtitle": "Official note", "href": "https://example.com", "mode": "live", "publishedAt": "2026-04-25T07:00:00+00:00"}], [{"name": "Federal Reserve press feed", "status": "live", "detail": "Stubbed in tests", "mode": "live"}]))
