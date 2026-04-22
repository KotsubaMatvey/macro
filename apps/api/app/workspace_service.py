from __future__ import annotations

import json
import uuid
from typing import Any

from .db import fetch_all, fetch_one, get_connection
from .security import utc_now


def _id(prefix: str) -> str:
 return prefix + "-" + uuid.uuid4().hex[:12]


def _normalize_route(value: object) -> str:
 route = str(value or "").strip()
 if not route:
  return "/app/dashboard"
 if not route.startswith("/"):
  route = "/" + route
 if not route.startswith("/app/"):
  return "/app/dashboard"
 return route


def _as_list(value: object) -> list[str]:
 if not isinstance(value, list):
  return []
 seen: set[str] = set()
 out: list[str] = []
 for item in value:
  normalized = str(item or "").strip()
  if not normalized or normalized in seen:
   continue
  seen.add(normalized)
  out.append(normalized)
 return out


def _as_route_list(value: object) -> list[str]:
 if not isinstance(value, list):
  return []
 seen: set[str] = set()
 out: list[str] = []
 for item in value:
  route = _normalize_route(item)
  if route in seen:
   continue
  seen.add(route)
  out.append(route)
 return out


def _as_dict(value: object) -> dict[str, Any]:
 if isinstance(value, dict):
  return value
 return {}


def _default_presets() -> list[dict[str, Any]]:
 return [
  {
   "preset_key": "macro_desk",
   "name": "Macro Desk",
   "module_keys": ["dashboard", "macro-calendar", "market-bias", "live-reactions"],
   "routes": ["/app/dashboard", "/app/macro-calendar", "/app/market-bias"],
   "active_route": "/app/dashboard",
   "layout": {"density": "dense", "split": "command"},
   "filters": {"dashboardWindow": "48h"},
  },
  {
   "preset_key": "event_day",
   "name": "Event Day",
   "module_keys": ["macro-calendar", "event-explorer", "live-reactions", "alerts"],
   "routes": ["/app/macro-calendar?impact=High", "/app/event-explorer", "/app/live-reactions", "/app/alerts"],
   "active_route": "/app/macro-calendar?impact=High",
   "layout": {"density": "dense", "split": "calendar"},
   "filters": {"impact": "High", "status": "Upcoming"},
  },
  {
   "preset_key": "news_calendar",
   "name": "News + Calendar",
   "module_keys": ["news", "macro-calendar", "dashboard"],
   "routes": ["/app/news?mode=macro", "/app/macro-calendar", "/app/dashboard"],
   "active_route": "/app/news?mode=macro",
   "layout": {"density": "dense", "split": "news"},
   "filters": {"newsMode": "macro"},
  },
  {
   "preset_key": "geoboard_focus",
   "name": "Geoboard Focus",
   "module_keys": ["geoboard", "news", "reports", "alerts"],
   "routes": ["/app/geoboard", "/app/news?mode=wire", "/app/reports", "/app/alerts"],
   "active_route": "/app/geoboard",
   "layout": {"density": "dense", "split": "map"},
   "filters": {"geoboardMode": "RISK"},
  },
  {
   "preset_key": "reactions_bias_review",
   "name": "Reactions / Bias Review",
   "module_keys": ["live-reactions", "market-bias", "track-record", "reports"],
   "routes": ["/app/live-reactions", "/app/market-bias", "/app/track-record", "/app/reports"],
   "active_route": "/app/live-reactions",
   "layout": {"density": "dense", "split": "review"},
   "filters": {"reactionAsset": "SPX"},
  },
 ]


def _audit(user_id: str, action: str, entity_id: str, payload: dict[str, Any] | None = None) -> None:
 with get_connection() as conn:
  with conn.cursor() as cur:
   cur.execute(
    "insert into audit_logs (id, actor_user_id, action, entity_type, entity_id, payload) values (%s, %s, %s, %s, %s, %s::jsonb)",
    (_id("audit"), user_id, action, "workspace", entity_id, json.dumps(payload or {})),
   )


def _row_to_workspace(row: dict[str, Any]) -> dict[str, Any]:
 return {
  "id": row["id"],
  "name": row["name"],
  "presetKey": row.get("preset_key"),
  "isPreset": bool(row.get("is_preset")),
  "moduleKeys": _as_list(row.get("module_keys")),
  "filters": _as_dict(row.get("filters")),
  "layout": _as_dict(row.get("layout")),
  "routes": _as_route_list(row.get("routes")),
  "activeRoute": _normalize_route(row.get("active_route")),
  "createdAt": row["created_at"].isoformat() if row.get("created_at") else utc_now().isoformat(),
  "updatedAt": row["updated_at"].isoformat() if row.get("updated_at") else utc_now().isoformat(),
  "lastUsedAt": row["last_used_at"].isoformat() if row.get("last_used_at") else utc_now().isoformat(),
 }


def ensure_default_workspaces(user_id: str) -> None:
 rows = fetch_all("select preset_key from user_workspaces where user_id = %s", (user_id,))
 existing_keys = {str(item.get("preset_key") or "").strip() for item in rows}
 for preset in _default_presets():
  if preset["preset_key"] in existing_keys:
   continue
  with get_connection() as conn:
   with conn.cursor() as cur:
    cur.execute(
     """
     insert into user_workspaces
     (id, user_id, name, preset_key, is_preset, module_keys, filters, layout, routes, active_route)
     values (%s, %s, %s, %s, true, %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb, %s)
     on conflict do nothing
     """,
     (
      _id("workspace"),
      user_id,
      preset["name"],
      preset["preset_key"],
      json.dumps(preset["module_keys"]),
      json.dumps(preset["filters"]),
      json.dumps(preset["layout"]),
      json.dumps(preset["routes"]),
      _normalize_route(preset["active_route"]),
     ),
    )


def list_workspaces(user_id: str) -> list[dict[str, Any]]:
 ensure_default_workspaces(user_id)
 rows = fetch_all(
  """
  select id, name, preset_key, is_preset, module_keys, filters, layout, routes, active_route, created_at, updated_at, last_used_at
  from user_workspaces
  where user_id = %s
  order by is_preset desc, last_used_at desc, updated_at desc
  """,
  (user_id,),
 )
 return [_row_to_workspace(row) for row in rows]


def get_workspace(user_id: str, workspace_id: str) -> dict[str, Any] | None:
 ensure_default_workspaces(user_id)
 row = fetch_one(
  """
  select id, name, preset_key, is_preset, module_keys, filters, layout, routes, active_route, created_at, updated_at, last_used_at
  from user_workspaces
  where id = %s and user_id = %s
  """,
  (workspace_id, user_id),
 )
 return _row_to_workspace(row) if row else None


def create_workspace(user_id: str, payload: Any) -> str:
 name = str(payload.name or "").strip()
 if len(name) < 2:
  raise ValueError("Workspace name must have at least 2 characters.")
 workspace_id = _id("workspace")
 module_keys = _as_list(getattr(payload, "moduleKeys", []))
 filters = _as_dict(getattr(payload, "filters", {}))
 layout = _as_dict(getattr(payload, "layout", {}))
 routes = _as_route_list(getattr(payload, "routes", []))
 active_route = _normalize_route(getattr(payload, "activeRoute", "/app/dashboard"))
 if not routes:
  routes = [active_route]
 with get_connection() as conn:
  with conn.cursor() as cur:
   cur.execute(
    """
    insert into user_workspaces
    (id, user_id, name, preset_key, is_preset, module_keys, filters, layout, routes, active_route)
    values (%s, %s, %s, null, false, %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb, %s)
    """,
    (
     workspace_id,
     user_id,
     name,
     json.dumps(module_keys),
     json.dumps(filters),
     json.dumps(layout),
     json.dumps(routes),
     active_route,
    ),
   )
 _audit(user_id, "create_workspace", workspace_id, {"name": name})
 return workspace_id


def update_workspace(user_id: str, workspace_id: str, payload: Any) -> dict[str, Any]:
 row = fetch_one(
  """
  select id, name, preset_key, is_preset, module_keys, filters, layout, routes, active_route
  from user_workspaces
  where id = %s and user_id = %s
  """,
  (workspace_id, user_id),
 )
 if not row:
  raise LookupError("Workspace not found.")
 if bool(row.get("is_preset")) and getattr(payload, "name", None):
  raise ValueError("Preset workspaces cannot be renamed.")
 name = str(getattr(payload, "name", row["name"]) or "").strip()
 if len(name) < 2:
  raise ValueError("Workspace name must have at least 2 characters.")
 module_keys = _as_list(getattr(payload, "moduleKeys", row.get("module_keys")))
 filters = _as_dict(getattr(payload, "filters", row.get("filters")))
 layout = _as_dict(getattr(payload, "layout", row.get("layout")))
 routes = _as_route_list(getattr(payload, "routes", row.get("routes")))
 active_route = _normalize_route(getattr(payload, "activeRoute", row.get("active_route")))
 if not routes:
  routes = [active_route]
 with get_connection() as conn:
  with conn.cursor() as cur:
   cur.execute(
    """
    update user_workspaces
    set name = %s,
        module_keys = %s::jsonb,
        filters = %s::jsonb,
        layout = %s::jsonb,
        routes = %s::jsonb,
        active_route = %s,
        updated_at = now(),
        last_used_at = now()
    where id = %s and user_id = %s
    """,
    (
     name,
     json.dumps(module_keys),
     json.dumps(filters),
     json.dumps(layout),
     json.dumps(routes),
     active_route,
     workspace_id,
     user_id,
    ),
   )
 _audit(user_id, "update_workspace", workspace_id, {"name": name})
 updated = get_workspace(user_id, workspace_id)
 if not updated:
  raise LookupError("Workspace not found.")
 return updated


def delete_workspace(user_id: str, workspace_id: str) -> None:
 row = fetch_one("select id, is_preset from user_workspaces where id = %s and user_id = %s", (workspace_id, user_id))
 if not row:
  raise LookupError("Workspace not found.")
 if bool(row.get("is_preset")):
  raise ValueError("Preset workspaces cannot be deleted.")
 with get_connection() as conn:
  with conn.cursor() as cur:
   cur.execute("delete from user_workspaces where id = %s and user_id = %s", (workspace_id, user_id))
 _audit(user_id, "delete_workspace", workspace_id, {})
