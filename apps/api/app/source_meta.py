from datetime import date, datetime, timezone
from typing import Optional

from .intelligence_semantics import normalize_freshness, normalize_mode, normalize_text
from .security import utc_now


def parse_source_timestamp(value: object):
 if value in (None, ""):
  return None
 if isinstance(value, datetime):
  parsed = value
 elif isinstance(value, date):
  parsed = datetime.combine(value, datetime.min.time(), tzinfo=timezone.utc)
 else:
  raw = str(value).strip()
  if not raw:
   return None
  try:
   parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
  except ValueError:
   try:
    parsed = datetime.fromisoformat(raw + "T00:00:00+00:00")
   except ValueError:
    return None
 if parsed.tzinfo is None:
  return parsed.replace(tzinfo=timezone.utc)
 return parsed.astimezone(timezone.utc)


def derive_freshness(
 last_updated: object = None,
 *,
 mode: str = "live",
 freshness: Optional[str] = None,
):
 normalized_mode = normalize_mode(mode)
 if freshness:
  return normalize_freshness(freshness, mode=normalized_mode)
 parsed_last_updated = parse_source_timestamp(last_updated)
 if parsed_last_updated is None:
  return normalize_freshness("", mode=normalized_mode)
 age_hours = (utc_now() - parsed_last_updated).total_seconds() / 3600.0
 if age_hours > 72:
  return "stale"
 if age_hours > 24:
  return "aging"
 return "fresh"


def build_source_metadata(
 label: str,
 source: str,
 *,
 payload: Optional[dict] = None,
 source_url: Optional[str] = None,
 mode: str = "live",
 note: str = "",
 fetched_at: Optional[str] = None,
 last_updated: object = None,
 freshness: Optional[str] = None,
):
 payload = payload or {}
 resolved_mode = normalize_mode(payload.get("mode", mode))
 resolved_fetched_at = payload.get("fetchedAt", fetched_at or utc_now().isoformat())
 resolved_last_updated = payload.get("lastUpdated", last_updated)
 return {
  "label": normalize_text(label),
  "source": normalize_text(source),
  "sourceUrl": payload.get("sourceUrl", source_url),
  "fetchedAt": resolved_fetched_at,
  "lastUpdated": resolved_last_updated,
  "freshness": derive_freshness(resolved_last_updated, mode=resolved_mode, freshness=freshness),
  "mode": resolved_mode,
  "note": normalize_text(note or payload.get("note", "")),
 }
