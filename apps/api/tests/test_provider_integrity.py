from app import calendar_data, market_data
from app.providers import ProviderError


def test_market_data_fallback_uses_fred_source_metadata(monkeypatch):
 payload = {"fetchedAt": "2026-04-01T12:00:00+00:00", "lastUpdated": "2026-04-01T00:00:00+00:00", "points": [{"date": "2026-03-31T00:00:00+00:00", "value": 100.0}, {"date": "2026-04-01T00:00:00+00:00", "value": 101.0}]}
 monkeypatch.setattr(market_data, "read_provider_payload", lambda key: None)
 monkeypatch.setattr(market_data, "cache_provider_payload", lambda *args, **kwargs: None)
 monkeypatch.setattr(market_data, "_load_yfinance_history", lambda symbol, interval, period: (_ for _ in ()).throw(ProviderError("Yahoo Finance request failed")))
 monkeypatch.setattr(market_data, "load_fred_series", lambda series_id, source_url, ttl=None: payload)
 result = market_data.load_market_series("SPX", interval="60m", period="60d", prefer_cache=False)
 assert result["source"] == "FRED public series"
 assert result["sourceSymbol"] == "SP500"
 assert result["sourceUrl"] == "https://fred.stlouisfed.org/series/SP500"
 assert result["mode"] == "fallback"
 assert "intraday precision is not available" in result["note"]


def test_tradingeconomics_event_normalization_is_honest_and_stable():
 item = {
  "CalendarId": 4321,
  "Date": "2026-04-01T12:30:00Z",
  "Event": "US CPI YoY",
  "Category": "Inflation",
  "Country": "United States",
  "Currency": "USD",
  "Importance": "3",
  "Actual": "2.8",
  "Forecast": "2.9",
  "Previous": "3.1",
 }
 normalized = calendar_data._normalize_te_event(item)
 assert normalized["id"] == "te-4321"
 assert normalized["slug"] == "us-cpi-yoy-2026-04-01"
 assert normalized["family"] == "US CPI YoY"
 assert normalized["category"] == "Inflation"
 assert normalized["status"] == "Released"
 assert normalized["freshness"]["source"] == "TradingEconomics"
 assert normalized["freshness"]["mode"] == "live"
 assert normalized["relatedAssets"][:3] == ["US2Y", "US10Y", "DXY"]


def test_calendar_fallback_feed_exposes_seeded_mode_and_reason(monkeypatch):
 rows = [{"id": "event-seeded", "slug": "seeded-event", "title": "Seeded Event", "status": "Upcoming", "scheduled_at": type("Stamp", (), {"isoformat": lambda self: "2026-04-05T10:00:00+00:00"})(), "previous_value": None, "forecast_value": None, "actual_value": None, "surprise_pct": None, "why_it_matters": "Seeded reason", "family": "Seeded Family", "country": "United States", "currency": "USD", "importance": "High", "category": "Growth"}]
 monkeypatch.setattr(calendar_data, "calendar_provider_configured", lambda: False)
 monkeypatch.setattr(calendar_data, "read_provider_payload", lambda key: None)
 monkeypatch.setattr(calendar_data, "cache_provider_payload", lambda *args, **kwargs: None)
 monkeypatch.setattr(calendar_data, "fetch_all", lambda query: rows)
 payload = calendar_data.calendar_feed(prefer_cache=False)
 assert payload["freshness"]["source"] == "Seeded macro calendar"
 assert payload["freshness"]["freshness"] == "degraded"
 assert "TradingEconomics" in payload["freshness"]["note"]
 assert payload["provider"]["status"] in ["demo", "fallback"]
 assert payload["provider"]["mode"] == payload["freshness"]["mode"]
