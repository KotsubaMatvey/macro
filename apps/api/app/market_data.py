from datetime import datetime, timezone
import math

from .cache import cache_provider_payload, invalidate_provider_payload, read_provider_payload
from .providers import ProviderError, load_fred_series
from .security import utc_now
from .settings import settings

MARKET_INSTRUMENTS = {
 "SPX": {"ticker": "^GSPC", "title": "S&P 500", "sourceUrl": "https://finance.yahoo.com/quote/%5EGSPC", "fallbackSeriesId": "SP500", "note": "Yahoo Finance index quote"},
 "NDX": {"ticker": "^NDX", "title": "Nasdaq 100", "sourceUrl": "https://finance.yahoo.com/quote/%5ENDX", "fallbackSeriesId": "NASDAQ100", "note": "Yahoo Finance index quote"},
 "DXY": {"ticker": "DX-Y.NYB", "title": "US Dollar Index", "sourceUrl": "https://finance.yahoo.com/quote/DX-Y.NYB", "fallbackSeriesId": "DTWEXBGS", "note": "Yahoo Finance dollar index quote"},
 "US10Y": {"ticker": "^TNX", "title": "US 10Y Yield", "sourceUrl": "https://finance.yahoo.com/quote/%5ETNX", "fallbackSeriesId": "DGS10", "note": "Yahoo Finance treasury yield quote"},
 "VIX": {"ticker": "^VIX", "title": "VIX", "sourceUrl": "https://finance.yahoo.com/quote/%5EVIX", "fallbackSeriesId": "VIXCLS", "note": "Yahoo Finance volatility index quote"},
 "EURUSD": {"ticker": "EURUSD=X", "title": "EUR / USD", "sourceUrl": "https://finance.yahoo.com/quote/EURUSD%3DX", "fallbackSeriesId": "DEXUSEU", "note": "Yahoo Finance FX pair quote"},
 "XAU": {"ticker": "GC=F", "title": "Gold", "sourceUrl": "https://finance.yahoo.com/quote/GC%3DF", "fallbackSeriesId": "", "note": "COMEX gold futures proxy used for live market tape; FRED LBMA gold series was removed in 2022"},
 "BTC": {"ticker": "BTC-USD", "title": "Bitcoin / USD", "sourceUrl": "https://finance.yahoo.com/quote/BTC-USD", "fallbackSeriesId": "CBBTCUSD", "note": "Yahoo Finance crypto quote"},
}


def _provider_key(symbol, interval, period):
 return "market:" + symbol + ":" + interval + ":" + period


def _fallback_source_url(series_id):
 return "https://fred.stlouisfed.org/series/" + series_id


def _parse_timestamp(value):
 if isinstance(value, datetime):
  parsed = value
 elif hasattr(value, "to_pydatetime"):
  parsed = value.to_pydatetime()
 else:
  raise ProviderError("Unsupported market timestamp value")
 if parsed.tzinfo is None:
  return parsed.replace(tzinfo=timezone.utc)
 return parsed.astimezone(timezone.utc)


def _safe_float(value):
 if value is None:
  return None
 try:
  number = float(value)
 except (TypeError, ValueError):
  return None
 if math.isnan(number) or math.isinf(number):
  return None
 return number


def _frame_points(frame):
 rows = []
 for index, row in frame.iterrows():
  value = _safe_float(row.get("Close"))
  if value is None:
   continue
  stamp = _parse_timestamp(index)
  rows.append({"date": stamp.isoformat(), "value": round(value, 6)})
 if not rows:
  raise ProviderError("No market price history returned")
 return rows


def _load_yfinance_history(symbol, interval, period):
 try:
  import yfinance as yf
 except Exception as exc:
  raise ProviderError("yfinance is not installed") from exc
 config = MARKET_INSTRUMENTS[symbol]
 ticker = yf.Ticker(config["ticker"])
 try:
  history = ticker.history(period=period, interval=interval, auto_adjust=False, actions=False, prepost=False)
 except Exception as exc:
  raise ProviderError("Yahoo Finance request failed for " + symbol + ": " + str(exc)) from exc
 if getattr(history, "empty", False):
  raise ProviderError("Yahoo Finance returned no history for " + symbol)
 try:
  points = _frame_points(history)
 except Exception as exc:
  raise ProviderError("Yahoo Finance payload parsing failed for " + symbol + ": " + str(exc)) from exc
 return {
  "symbol": symbol,
  "title": config["title"],
  "source": "Yahoo Finance via yfinance",
  "sourceUrl": config["sourceUrl"],
  "sourceSymbol": config["ticker"],
  "fetchedAt": utc_now().isoformat(),
  "lastUpdated": points[-1]["date"],
  "interval": interval,
  "period": period,
  "mode": "live",
  "note": config["note"],
  "points": points,
 }


def _fallback_note(symbol, interval, error_note):
 if interval == "1d":
  return error_note + " Falling back to the slower FRED daily proxy for this instrument."
 return error_note + " Falling back to a daily FRED proxy, so intraday precision is not available in fallback mode."


def _load_fred_fallback(symbol, interval, period, error_note):
 config = MARKET_INSTRUMENTS[symbol]
 fallback_id = config.get("fallbackSeriesId")
 if not fallback_id:
  raise ProviderError(error_note)
 source_url = _fallback_source_url(fallback_id)
 payload = load_fred_series(fallback_id, source_url, ttl=settings.market_cache_ttl_seconds)
 if not payload or not payload.get("points"):
  raise ProviderError(error_note + " FRED fallback series is unavailable.")
 return {
  "symbol": symbol,
  "title": config["title"],
  "source": "FRED public series",
  "sourceUrl": source_url,
  "sourceSymbol": fallback_id,
  "fetchedAt": payload.get("fetchedAt", utc_now().isoformat()),
  "lastUpdated": payload.get("lastUpdated"),
  "interval": interval,
  "period": period,
  "mode": "fallback",
  "note": _fallback_note(symbol, interval, error_note),
  "points": payload["points"],
 }


def load_market_series(symbol, interval="1d", period="18mo", prefer_cache=True):
 if symbol not in MARKET_INSTRUMENTS:
  raise ProviderError("Unsupported market symbol: " + str(symbol))
 cache_key = _provider_key(symbol, interval, period)
 if prefer_cache:
  cached = read_provider_payload(cache_key)
  if cached and cached.get("payload"):
   return cached["payload"]
 try:
  payload = _load_yfinance_history(symbol, interval, period)
  ttl = settings.market_intraday_cache_ttl_seconds if interval != "1d" else settings.market_cache_ttl_seconds
  cache_provider_payload(cache_key, payload, ttl=ttl)
  return payload
 except ProviderError as exc:
  payload = _load_fred_fallback(symbol, interval, period, str(exc))
  cache_provider_payload(cache_key, payload, ttl=settings.market_cache_ttl_seconds)
  return payload


def load_market_bundle(symbols, interval="1d", period="18mo"):
 result = {}
 failures = {}
 for symbol in symbols:
  try:
   result[symbol] = load_market_series(symbol, interval=interval, period=period)
  except ProviderError as exc:
   failures[symbol] = str(exc)
 return result, failures


def invalidate_market_bundle(symbols):
 for symbol in symbols:
  for interval, period in (("1d", "18mo"), ("60m", "60d")):
   invalidate_provider_payload(_provider_key(symbol, interval, period))
