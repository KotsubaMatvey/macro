from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from .cache import read_provider_payload
from .calendar_data import calendar_feed
from .db import fetch_all
from .geoboard_core.constants import FEED_CACHE_PREFIX
from .geoboard_service import geoboard_payload
from .market_data import MARKET_INSTRUMENTS
from .security import utc_now
from .source_meta import derive_freshness, parse_source_timestamp


def _to_iso(value: Any) -> str | None:
 parsed = parse_source_timestamp(value)
 if not parsed:
  return None
 return parsed.isoformat()


def _freshness(value: Any, mode: str) -> str:
 return derive_freshness(value, mode=mode)


def _state(mode: str, freshness: str) -> str:
 normalized_mode = str(mode or "fallback")
 normalized_freshness = str(freshness or "degraded")
 if normalized_mode == "live":
  if normalized_freshness in {"stale", "degraded"}:
   return "degraded"
  return "live"
 if normalized_mode == "demo":
  return "demo"
 if normalized_mode == "static":
  return "static"
 if normalized_mode == "derived":
  if normalized_freshness in {"fresh", "aging"}:
   return "derived"
  return "degraded"
 if normalized_mode == "replay":
  return "replay"
 return "fallback"


def _source_tier(source_type: str) -> str:
 return "primary" if source_type in {"official", "static"} else "secondary"


def _item(
 *,
 provider_key: str,
 label: str,
 domain_key: str,
 source_type: str,
 mode: str,
 freshness: str,
 note: str,
 last_refresh: str | None = None,
 last_updated: str | None = None,
 route_hint: str = "/app/dashboard",
 diagnostics_path: str | None = None,
 affected_surfaces: list[str] | None = None,
 meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
 return {
  "providerKey": provider_key,
  "label": label,
  "domainKey": domain_key,
  "sourceType": source_type,
  "sourceTier": _source_tier(source_type),
  "mode": mode,
  "freshness": freshness,
  "state": _state(mode, freshness),
  "note": note,
  "lastRefresh": last_refresh,
  "lastUpdated": last_updated,
  "routeHint": route_hint,
  "diagnosticsPath": diagnostics_path,
  "affectedSurfaces": list(affected_surfaces or []),
  "meta": meta or {},
 }


def _domain_counts(items: list[dict[str, Any]]) -> dict[str, int]:
 counts = {
  "total": len(items),
  "live": 0,
  "degraded": 0,
  "fallback": 0,
  "demo": 0,
  "derived": 0,
  "static": 0,
  "replay": 0,
 }
 for item in items:
  state = str(item.get("state") or "fallback")
  if state in counts:
   counts[state] += 1
  else:
   counts["fallback"] += 1
 return counts


def _market_domain() -> list[dict[str, Any]]:
 items: list[dict[str, Any]] = []
 for symbol, config in MARKET_INSTRUMENTS.items():
  cache_key = "market:" + symbol + ":1d:18mo"
  cached = read_provider_payload(cache_key)
  payload = cached.get("payload") if isinstance(cached, dict) else None
  if not isinstance(payload, dict):
   items.append(
    _item(
     provider_key=cache_key,
     label=symbol + " market tape",
     domain_key="market_data",
     source_type="fallback",
     mode="fallback",
     freshness="degraded",
     note="Series not loaded into provider cache yet.",
     route_hint="/app/dashboard?asset=" + symbol,
     diagnostics_path="/app/data-sources?domain=market_data",
     affected_surfaces=["dashboard", "market-bias", "track-record", "live-reactions"],
     meta={"symbol": symbol, "title": config.get("title")},
    ),
   )
   continue
  mode = str(payload.get("mode") or "fallback")
  source = str(payload.get("source") or "")
  source_type = "official" if "Yahoo Finance" in source else "fallback" if "FRED" in source else "derived"
  last_updated = _to_iso(payload.get("lastUpdated"))
  last_refresh = _to_iso(cached.get("cachedAt")) if isinstance(cached, dict) else None
  freshness = _freshness(last_updated or payload.get("fetchedAt"), mode)
  items.append(
   _item(
    provider_key=cache_key,
    label=symbol + " market tape",
    domain_key="market_data",
    source_type=source_type,
    mode=mode if mode in {"live", "fallback", "demo"} else "fallback",
    freshness=freshness,
    note=str(payload.get("note") or source or "Market tape provider row."),
    last_refresh=last_refresh,
    last_updated=last_updated,
    route_hint="/app/dashboard?asset=" + symbol,
    diagnostics_path="/app/data-sources?domain=market_data",
    affected_surfaces=["dashboard", "market-bias", "track-record", "live-reactions"],
    meta={"symbol": symbol, "title": config.get("title"), "source": source, "sourceSymbol": payload.get("sourceSymbol")},
   ),
  )
 return items


def _calendar_domain() -> list[dict[str, Any]]:
 payload = calendar_feed(days_back=30, days_forward=60, prefer_cache=True)
 freshness = payload.get("freshness") if isinstance(payload.get("freshness"), dict) else {}
 provider = payload.get("provider") if isinstance(payload.get("provider"), dict) else {}
 mode = str(freshness.get("mode") or provider.get("mode") or "fallback")
 source_name = str(freshness.get("source") or provider.get("name") or "Calendar provider")
 source_type = "official" if "TradingEconomics" in source_name else "fallback"
 return [
  _item(
   provider_key="calendar:primary",
   label="Macro calendar provider",
   domain_key="calendar_data",
   source_type=source_type,
   mode=mode if mode in {"live", "demo", "fallback"} else "fallback",
   freshness=str(freshness.get("freshness") or "degraded"),
   note=str(freshness.get("note") or provider.get("detail") or "Calendar provider status row."),
   last_refresh=_to_iso(freshness.get("fetchedAt")),
   last_updated=_to_iso(freshness.get("lastUpdated")),
   route_hint="/app/macro-calendar",
   diagnostics_path="/app/data-sources?domain=calendar_data",
   affected_surfaces=["dashboard", "macro-calendar", "event-explorer", "live-reactions"],
   meta={"events": len(payload.get("events") or []), "provider": source_name},
  ),
 ]


def _news_domain() -> list[dict[str, Any]]:
 rows = fetch_all(
  """
  select distinct on (provider_key, source_type)
   provider_key, source_type, status, fetched_count, normalized_count, deduped_count, error_message, started_at, finished_at, created_at
  from news_provider_runs
  order by provider_key, source_type, created_at desc
  """,
 )
 if not rows:
  return [
   _item(
    provider_key="news:seeded",
    label="Seeded news continuity",
    domain_key="news_feeds",
    source_type="seeded",
    mode="fallback",
    freshness="degraded",
    note="No provider run rows found. Seeded continuity is active.",
    route_hint="/app/news",
    diagnostics_path="/app/data-sources?domain=news_feeds",
    affected_surfaces=["news", "dashboard", "geoboard"],
   ),
  ]
 items: list[dict[str, Any]] = []
 for row in rows:
  provider_key = str(row.get("provider_key") or "news-provider")
  source_type = str(row.get("source_type") or "discovery")
  status = str(row.get("status") or "failed")
  mode = "live" if status == "completed" else "demo" if source_type == "official" else "fallback"
  last_updated = _to_iso(row.get("finished_at") or row.get("created_at"))
  detail = (
   str(int(row.get("normalized_count") or 0))
   + " normalized / "
   + str(int(row.get("deduped_count") or 0))
   + " deduped"
  )
  if row.get("error_message"):
   detail = str(row.get("error_message"))
  items.append(
   _item(
    provider_key=provider_key,
    label=provider_key.replace("-", " "),
    domain_key="news_feeds",
    source_type=source_type,
    mode=mode,
    freshness=_freshness(last_updated, mode),
    note=detail,
    last_refresh=_to_iso(row.get("started_at") or row.get("created_at")),
    last_updated=last_updated,
    route_hint="/app/news",
    diagnostics_path="/app/data-sources?domain=news_feeds",
    affected_surfaces=["news", "dashboard", "geoboard", "relationship-map"],
    meta={"status": status, "fetched": int(row.get("fetched_count") or 0)},
   ),
  )
 return items


def _geoboard_domain(user: dict[str, Any] | None) -> list[dict[str, Any]]:
 user_id = str(user.get("id")) if isinstance(user, dict) and user.get("id") else "anon"
 cache_key = FEED_CACHE_PREFIX + ":" + user_id + ":STANDARD"
 cached = read_provider_payload(cache_key)
 payload = cached.get("payload") if isinstance(cached, dict) else None
 if not isinstance(payload, dict):
  payload = geoboard_payload(user, "STANDARD")
 source_status = payload.get("sourceStatus") if isinstance(payload.get("sourceStatus"), list) else []
 generated_at = _to_iso(payload.get("generatedAt"))
 items: list[dict[str, Any]] = []
 for status in source_status:
  if not isinstance(status, dict):
   continue
  layer = str(status.get("layer") or "feed")
  state = str(status.get("state") or "fallback")
  source_type = str(status.get("sourceType") or "derived")
  mode = str(status.get("mode") or "fallback")
  freshness = "fresh" if state in {"live", "derived", "static"} else "degraded"
  items.append(
   _item(
    provider_key="geoboard:" + layer,
    label="Geoboard " + layer + " layer",
    domain_key="geoboard_layers",
    source_type=source_type,
    mode=mode,
    freshness=freshness,
    note=str(status.get("detail") or ""),
    last_refresh=_to_iso(cached.get("cachedAt")) if isinstance(cached, dict) else generated_at,
    last_updated=generated_at,
    route_hint="/app/geoboard",
    diagnostics_path="/app/data-sources?domain=geoboard_layers",
    affected_surfaces=["geoboard", "news", "dashboard", "relationship-map"],
    meta={"layer": layer, "state": state},
   ),
  )
 return items


def _evaluation_domain() -> list[dict[str, Any]]:
 evaluation_rows = fetch_all(
  """
  select surface, signal_type, signal_ref, mode, note, created_at
  from signal_evaluations
  where surface in ('news', 'geoboard', 'dashboard', 'alerts')
  order by created_at desc
  limit 24
  """,
 )
 latest_by_surface: dict[str, dict[str, Any]] = {}
 for row in evaluation_rows:
  surface = str(row.get("surface") or "")
  if surface and surface not in latest_by_surface:
   latest_by_surface[surface] = row

 job_rows = fetch_all(
  """
  select distinct on (job_type) job_type, status, started_at, finished_at, error_message
  from ingestion_jobs
  where job_type in ('evaluate_alerts', 'recompute_signal_evaluations', 'rebuild_news_rankings', 'score_geoboard_signals')
  order by job_type, created_at desc
  """,
 )
 items: list[dict[str, Any]] = []
 for surface, row in latest_by_surface.items():
  mode = str(row.get("mode") or "replay")
  updated = _to_iso(row.get("created_at"))
  items.append(
   _item(
    provider_key="evaluation:" + surface,
    label=surface + " evaluation",
    domain_key="evaluation_jobs",
    source_type="derived",
    mode=mode if mode in {"replay", "derived", "fallback", "live", "demo"} else "replay",
    freshness=_freshness(updated, "replay"),
    note=str(row.get("note") or "Evaluation metadata row."),
    last_refresh=updated,
    last_updated=updated,
    route_hint="/app/reports",
    diagnostics_path="/app/data-sources?domain=evaluation_jobs",
    affected_surfaces=[surface, "reports", "track-record"],
    meta={"signalType": str(row.get("signal_type") or ""), "signalRef": str(row.get("signal_ref") or "")},
   ),
  )
 for row in job_rows:
  job_type = str(row.get("job_type") or "")
  status = str(row.get("status") or "queued")
  finished_at = _to_iso(row.get("finished_at"))
  started_at = _to_iso(row.get("started_at"))
  mode = "derived" if status == "completed" else "fallback"
  items.append(
   _item(
    provider_key="worker:" + job_type,
    label=job_type,
    domain_key="evaluation_jobs",
    source_type="derived",
    mode=mode,
    freshness=_freshness(finished_at or started_at, mode),
    note=str(row.get("error_message") or ("status: " + status)),
    last_refresh=started_at,
    last_updated=finished_at or started_at,
    route_hint="/app/admin",
    diagnostics_path="/app/admin",
    affected_surfaces=["alerts", "news", "geoboard", "reports"],
    meta={"status": status},
   ),
  )
 return items


def _domain_block(key: str, label: str, description: str, items: list[dict[str, Any]]) -> dict[str, Any]:
 return {
  "key": key,
  "label": label,
  "description": description,
  "counts": _domain_counts(items),
  "items": items,
 }


def provider_control_plane_payload(user: dict[str, Any] | None = None) -> dict[str, Any]:
 domains = [
  _domain_block(
   "market_data",
   "Market data",
   "Provider-backed market series used by dashboard, bias, and reaction overlays.",
   _market_domain(),
  ),
  _domain_block(
   "calendar_data",
   "Calendar data",
   "Live TradingEconomics when configured, explicit seeded fallback otherwise.",
   _calendar_domain(),
  ),
  _domain_block(
   "news_feeds",
   "News official + discovery feeds",
   "Official and discovery ingestion runs with explicit degraded context.",
   _news_domain(),
  ),
  _domain_block(
   "geoboard_layers",
   "Geoboard layers",
   "Geo, macro, central bank, trade route, regime, and feed layer integrity states.",
   _geoboard_domain(user),
  ),
  _domain_block(
   "evaluation_jobs",
   "Evaluation + worker freshness",
   "Latest evaluation metadata and worker job states for ranking and alert pipelines.",
   _evaluation_domain(),
  ),
 ]
 flat_items = [item for domain in domains for item in domain["items"]]
 summary_counts = _domain_counts(flat_items)
 summary_counts["domains"] = len(domains)
 summary_counts["providers"] = len(flat_items)
 return {
  "generatedAt": utc_now().isoformat(),
  "summary": summary_counts,
  "domains": domains,
 }
