import re
from datetime import datetime, timedelta, timezone
from urllib.parse import quote

import httpx

from .cache import cache_provider_payload, read_provider_payload
from .db import fetch_all
from .providers import ProviderError
from .security import reference_now, utc_now
from .settings import settings
from .source_meta import build_source_metadata

LIVE_SOURCE = {
 "label": "Catalyst calendar",
 "source": "TradingEconomics",
 "sourceUrl": settings.tradingeconomics_api_base_url,
}

FALLBACK_SOURCE = {
 "label": "Catalyst calendar",
 "source": "Seeded macro calendar",
 "sourceUrl": None,
}


def calendar_provider_configured():
 return bool(settings.tradingeconomics_api_key or (settings.tradingeconomics_username and settings.tradingeconomics_password))


def _calendar_cache_key(label):
 return "calendar:" + label


def _calendar_credentials():
 if settings.tradingeconomics_api_key:
  return settings.tradingeconomics_api_key
 if settings.tradingeconomics_username and settings.tradingeconomics_password:
  return settings.tradingeconomics_username + ":" + settings.tradingeconomics_password
 raise ProviderError("TradingEconomics credentials are not configured")


def _calendar_client():
 return httpx.Client(timeout=settings.provider_timeout_seconds)


def _slugify(value):
 return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def _impact_label(value):
 text = str(value or "").strip().lower()
 if text in {"3", "high"}:
  return "High"
 if text in {"2", "medium", "med"}:
  return "Medium"
 if text in {"1", "low"}:
  return "Low"
 return "Medium"


def _coerce_number(value):
 if value in (None, "", "NaN"):
  return None
 cleaned = str(value).replace(",", "").replace("%", "").strip()
 multiplier = 1.0
 if cleaned.endswith("K"):
  multiplier = 1000.0
  cleaned = cleaned[:-1]
 elif cleaned.endswith("M"):
  multiplier = 1000000.0
  cleaned = cleaned[:-1]
 elif cleaned.endswith("B"):
  multiplier = 1000000000.0
  cleaned = cleaned[:-1]
 try:
  return round(float(cleaned) * multiplier, 4)
 except ValueError:
  return None


def _event_category(title, category):
 text = (str(category or "") + " " + str(title or "")).lower()
 if any(token in text for token in ["rate decision", "central bank", "fomc", "fed", "ecb", "speaker", "minutes"]):
  return "Central bank"
 if any(token in text for token in ["cpi", "ppi", "inflation", "prices"]):
  return "Inflation"
 if any(token in text for token in ["payroll", "employment", "jobless", "labor", "wage"]):
  return "Labor"
 if any(token in text for token in ["gdp", "pmi", "ism", "retail", "industrial", "manufacturing", "services", "confidence"]):
  return "Growth"
 return str(category or "Macro")


def _event_status(event_time, actual):
 now = reference_now()
 delta_minutes = (event_time - now).total_seconds() / 60.0
 if actual is not None:
  return "Released"
 if delta_minutes >= -45 and delta_minutes <= 90:
  return "Live"
 if delta_minutes > 90:
  return "Upcoming"
 return "Released"


def _related_assets(currency, category, title):
 text = (str(category or "") + " " + str(title or "")).lower()
 currency_key = str(currency or "").upper()
 if "central bank" in text or "rate decision" in text or "fomc" in text or "fed" in text:
  return ["US2Y", "US10Y", "DXY", "SPX", "NDX", "XAU", "BTC"] if currency_key == "USD" else ["EURUSD", "DXY", "US10Y", "SPX"]
 if "inflation" in text or "cpi" in text or "ppi" in text:
  return ["US2Y", "US10Y", "DXY", "SPX", "XAU"] if currency_key == "USD" else ["EURUSD", "DXY", "US10Y", "XAU"]
 if "labor" in text or "payroll" in text or "jobless" in text:
  return ["SPX", "US10Y", "DXY", "US2Y"] if currency_key == "USD" else ["EURUSD", "DXY", "US10Y"]
 if currency_key == "EUR":
  return ["EURUSD", "DXY", "US10Y", "XAU"]
 if currency_key == "USD":
  return ["SPX", "US10Y", "DXY", "XAU"]
 return ["DXY", "XAU"]


def _te_last_updated(item):
 return item.get("LastUpdate") or item.get("lastUpdate") or item.get("ReferenceDate") or utc_now().isoformat()


def _normalize_te_event(item):
 event_time = item.get("Date") or item.get("date") or item.get("dateUtc")
 if not event_time:
  raise ProviderError("Calendar item is missing a timestamp")
 stamp = event_time.replace("Z", "+00:00") if isinstance(event_time, str) else event_time
 scheduled = datetime.fromisoformat(stamp)
 if scheduled.tzinfo is None:
  scheduled = scheduled.replace(tzinfo=timezone.utc)
 else:
  scheduled = scheduled.astimezone(timezone.utc)
 title = item.get("Event") or item.get("event") or item.get("Title") or "Macro event"
 raw_category = item.get("Category") or item.get("category") or "Macro"
 category = _event_category(title, raw_category)
 family = str(title).strip()
 country = item.get("Country") or item.get("country") or "Global"
 currency = item.get("Currency") or item.get("currency") or "USD"
 impact = _impact_label(item.get("Importance") or item.get("importance") or item.get("ImportanceLevel"))
 actual = _coerce_number(item.get("Actual") or item.get("actual"))
 forecast = _coerce_number(item.get("Forecast") or item.get("forecast"))
 previous = _coerce_number(item.get("Previous") or item.get("previous"))
 provider_id = item.get("CalendarId") or item.get("calendarId") or _slugify(title + "-" + scheduled.date().isoformat())
 slug = _slugify(title + "-" + scheduled.date().isoformat())
 return {
  "id": "te-" + str(provider_id),
  "family": family,
  "title": title,
  "slug": slug,
  "country": country,
  "currency": currency,
  "impact": impact,
  "category": category,
  "scheduledAt": scheduled.isoformat(),
  "status": _event_status(scheduled, actual),
  "previous": previous,
  "forecast": forecast,
  "actual": actual,
  "surprise": round(actual - forecast, 4) if actual is not None and forecast is not None else None,
  "whyItMatters": (item.get("Comment") or item.get("comment") or item.get("Reference") or "Live macro catalyst from TradingEconomics.")[:220],
  "relatedAssets": _related_assets(currency, category, title),
  "providerEventId": str(provider_id),
  "freshness": build_source_metadata(
   LIVE_SOURCE["label"],
   LIVE_SOURCE["source"],
   source_url=LIVE_SOURCE["sourceUrl"],
   mode="live",
   note="Live TradingEconomics calendar row.",
   last_updated=_te_last_updated(item),
  ),
 }


def _fallback_note(reason):
 return "Serving the seeded macro calendar because TradingEconomics is unavailable: " + reason


def _fallback_events(reason):
 rows = fetch_all(
  "select e.id, e.slug, e.title, e.status, e.scheduled_at, e.previous_value, e.forecast_value, e.actual_value, e.surprise_pct, e.why_it_matters, f.name as family, f.country, f.currency, f.importance, f.category from events e join event_families f on f.id = e.family_id order by e.scheduled_at asc"
 )
 events = []
 for row in rows:
  events.append(
   {
    "id": row["id"],
    "family": row["family"],
    "title": row["title"],
    "slug": row["slug"],
    "country": row["country"],
    "currency": row["currency"],
    "impact": row["importance"],
    "category": row["category"],
    "scheduledAt": row["scheduled_at"].isoformat(),
    "status": row["status"],
    "previous": float(row["previous_value"]) if row["previous_value"] is not None else None,
    "forecast": float(row["forecast_value"]) if row["forecast_value"] is not None else None,
    "actual": float(row["actual_value"]) if row["actual_value"] is not None else None,
    "surprise": float(row["surprise_pct"]) if row["surprise_pct"] is not None else None,
    "whyItMatters": row["why_it_matters"],
    "relatedAssets": _related_assets(row["currency"], row["category"], row["title"]),
    "providerEventId": row["id"],
    "freshness": build_source_metadata(
     FALLBACK_SOURCE["label"],
     FALLBACK_SOURCE["source"],
     source_url=FALLBACK_SOURCE["sourceUrl"],
     mode="demo" if settings.app_mode == "demo" else "fallback",
     freshness="degraded",
     note=_fallback_note(reason),
     fetched_at=utc_now().isoformat(),
    )
   }
  )
 return events


def _fetch_tradingeconomics(path):
 credentials = _calendar_credentials()
 separator = "&" if "?" in path else "?"
 url = settings.tradingeconomics_api_base_url.rstrip("/") + path + separator + "c=" + quote(credentials) + "&f=json"
 with _calendar_client() as client:
  response = client.get(url)
  response.raise_for_status()
  payload = response.json()
 if not isinstance(payload, list):
  raise ProviderError("TradingEconomics calendar payload was malformed")
 return payload


def _filter_events(events, search=None, family=None):
 filtered = []
 for item in events:
  if family:
   family_match = family.lower() in item["family"].lower() or family.lower() in item["title"].lower()
   if not family_match:
    continue
  if search:
   needle = search.lower()
   haystack = " ".join([item["title"], item["family"], item["country"], item["currency"], item["category"]]).lower()
   if needle not in haystack:
    continue
  filtered.append(item)
 return filtered


def calendar_feed(search=None, family=None, days_back=14, days_forward=45, prefer_cache=True):
 cache_key = _calendar_cache_key((family or "all") + ":" + str(days_back) + ":" + str(days_forward) + ":" + (search or ""))
 if prefer_cache:
  cached = read_provider_payload(cache_key)
  if cached and cached.get("payload"):
   return cached["payload"]
 if calendar_provider_configured():
  try:
   start = (reference_now() - timedelta(days=days_back)).date().isoformat()
   end = (reference_now() + timedelta(days=days_forward)).date().isoformat()
   raw_items = _fetch_tradingeconomics("/calendar/country/all/" + start + "/" + end)
   events = sorted(_filter_events([_normalize_te_event(item) for item in raw_items], search=search, family=family), key=lambda item: item["scheduledAt"])
   payload = {
    "events": events,
    "freshness": build_source_metadata(
     LIVE_SOURCE["label"],
     LIVE_SOURCE["source"],
     source_url=LIVE_SOURCE["sourceUrl"],
     mode="live",
     note="Live TradingEconomics calendar feed.",
     last_updated=utc_now().isoformat(),
 ),
    "provider": {"name": LIVE_SOURCE["source"], "status": "live", "detail": str(len(events)) + " calendar rows loaded", "mode": "live"},
   }
   cache_provider_payload(cache_key, payload, ttl=settings.calendar_cache_ttl_seconds)
   return payload
  except Exception as exc:
   failure_note = str(exc)
 else:
  failure_note = "TradingEconomics credentials are not configured"
 events = _filter_events(_fallback_events(failure_note), search=search, family=family)
 payload = {
  "events": events,
  "freshness": build_source_metadata(
   FALLBACK_SOURCE["label"],
   FALLBACK_SOURCE["source"],
   source_url=FALLBACK_SOURCE["sourceUrl"],
   mode="demo" if settings.app_mode == "demo" else "fallback",
   freshness="degraded",
   note=_fallback_note(failure_note),
   fetched_at=utc_now().isoformat(),
 ),
  "provider": {
   "name": FALLBACK_SOURCE["source"],
   "status": "fallback",
   "detail": _fallback_note(failure_note),
   "mode": "demo" if settings.app_mode == "demo" else "fallback",
  },
 }
 cache_provider_payload(cache_key, payload, ttl=settings.calendar_cache_ttl_seconds)
 return payload


def list_calendar_events(search=None, family=None, days_back=30, days_forward=60):
 return calendar_feed(search=search, family=family, days_back=days_back, days_forward=days_forward)["events"]


def get_calendar_event(event_id):
 for item in calendar_feed(days_back=90, days_forward=120)["events"]:
  if item["id"] == event_id or item["slug"] == event_id or item["providerEventId"] == event_id:
   return item
 return None
