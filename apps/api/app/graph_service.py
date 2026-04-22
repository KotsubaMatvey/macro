from __future__ import annotations

from typing import Any
from urllib.parse import quote

from .db import fetch_all, fetch_one
from .entity_graph import (
 materialize_event_links,
 materialize_geoboard_links,
 materialize_news_links,
 materialize_operator_links,
)
from .geoboard_service import geoboard_payload
from .security import utc_now

ENTITY_ALIASES = {
 "event": "scheduled_event",
 "scheduled_event": "scheduled_event",
 "news": "news_item",
 "news_item": "news_item",
 "cluster": "news_cluster",
 "news_cluster": "news_cluster",
 "signal": "geoboard_signal",
 "geoboard_signal": "geoboard_signal",
 "asset": "asset",
 "region": "region",
 "reaction": "reaction_family",
 "reaction_family": "reaction_family",
 "report": "report",
 "watchlist": "watchlist",
 "alert": "alert_rule",
 "alert_rule": "alert_rule",
}


def _normalize_entity_type(value: str) -> str:
 return ENTITY_ALIASES.get(str(value or "").strip().lower(), "scheduled_event")


def _route_hint(entity_type: str, ref_id: str) -> str:
 if entity_type == "scheduled_event":
  return "/app/events/" + quote(ref_id)
 if entity_type == "news_item":
  return "/app/news?focus=" + quote(ref_id)
 if entity_type == "news_cluster":
  return "/app/news?cluster=" + quote(ref_id)
 if entity_type == "geoboard_signal":
  return "/app/relationship-map?entity_type=geoboard_signal&ref_id=" + quote(ref_id)
 if entity_type == "asset":
  return "/app/market-bias?asset=" + quote(ref_id)
 if entity_type == "region":
  return "/app/geoboard?region=" + quote(ref_id)
 if entity_type == "reaction_family":
  return "/app/live-reactions?family=" + quote(ref_id)
 if entity_type == "report":
  return "/app/reports"
 if entity_type == "watchlist":
  return "/app/watchlists"
 if entity_type == "alert_rule":
  return "/app/alerts"
 return "/app/dashboard"


def _surface_hint(entity_type: str) -> str:
 if entity_type == "scheduled_event":
  return "macro-calendar"
 if entity_type in {"news_item", "news_cluster"}:
  return "news"
 if entity_type == "geoboard_signal":
  return "geoboard"
 if entity_type == "asset":
  return "market-bias"
 if entity_type == "reaction_family":
  return "live-reactions"
 if entity_type == "report":
  return "reports"
 if entity_type == "watchlist":
  return "watchlists"
 if entity_type == "alert_rule":
  return "alerts"
 return "dashboard"


def _entity_row_to_node(row: dict[str, Any]) -> dict[str, Any]:
 entity_type = str(row.get("entity_type") or "")
 ref_id = str(row.get("ref_id") or "")
 return {
  "id": str(row.get("id") or ""),
  "entityType": entity_type,
  "refId": ref_id,
  "title": str(row.get("title") or ref_id),
  "source": str(row.get("source") or ""),
  "sourceType": str(row.get("source_type") or "derived"),
  "sourceTier": str(row.get("source_tier") or "secondary"),
  "sourceUrl": row.get("source_url"),
  "mode": str(row.get("mode") or "fallback"),
  "freshness": str(row.get("freshness") or "degraded"),
  "confidenceScore": float(row.get("confidence_score") or 0.0),
  "metadata": row.get("metadata") if isinstance(row.get("metadata"), dict) else {},
  "routeHint": _route_hint(entity_type, ref_id),
  "surfaceHint": _surface_hint(entity_type),
 }


def _seed_nodes(limit: int = 16) -> list[dict[str, Any]]:
 rows = fetch_all(
  """
  select id, entity_type, ref_id, title, mode, freshness, updated_at
  from intelligence_entities
  where entity_type in ('scheduled_event', 'news_item', 'geoboard_signal', 'asset', 'reaction_family', 'report', 'watchlist', 'alert_rule')
  order by updated_at desc
  limit %s
  """,
  (limit,),
 )
 out: list[dict[str, Any]] = []
 for row in rows:
  entity_type = str(row.get("entity_type") or "")
  ref_id = str(row.get("ref_id") or "")
  out.append(
   {
    "id": str(row.get("id") or ""),
    "entityType": entity_type,
    "refId": ref_id,
    "title": str(row.get("title") or ref_id),
    "mode": str(row.get("mode") or "fallback"),
    "freshness": str(row.get("freshness") or "degraded"),
    "routeHint": _route_hint(entity_type, ref_id),
   },
  )
 return out


def _latest_scores(entity_ids: list[str]) -> dict[str, dict[str, Any]]:
 if not entity_ids:
  return {}
 rows = fetch_all(
  """
  select distinct on (entity_id)
   entity_id,
   importance_score,
   urgency_score,
   confidence_score,
   market_relevance_score,
   desk_relevance_score,
   rank_score,
   rationale,
   computed_at
  from intelligence_scores
  where entity_id = any(%s)
  order by entity_id, computed_at desc
  """,
  (entity_ids,),
 )
 out: dict[str, dict[str, Any]] = {}
 for row in rows:
  out[str(row["entity_id"])] = {
   "importanceScore": float(row.get("importance_score") or 0.0),
   "urgencyScore": float(row.get("urgency_score") or 0.0),
   "confidenceScore": float(row.get("confidence_score") or 0.0),
   "marketRelevanceScore": float(row.get("market_relevance_score") or 0.0),
   "deskRelevanceScore": float(row.get("desk_relevance_score") or 0.0),
   "rankScore": float(row.get("rank_score") or 0.0),
   "rationale": list(row.get("rationale") or []),
   "computedAt": row.get("computed_at").isoformat() if row.get("computed_at") else None,
  }
 return out


def _fetch_link_rows(frontier_ids: list[str], link_types: list[str], *, per_hop_limit: int) -> list[dict[str, Any]]:
 if not frontier_ids:
  return []
 params: list[Any] = [frontier_ids, frontier_ids]
 link_clause = ""
 if link_types:
  link_clause = "and l.link_type = any(%s)"
  params.append(link_types)
 params.append(max(1, per_hop_limit))
 query = (
  """
  select
   l.id as link_id,
   l.link_type,
   l.confidence_score,
   l.rationale,
   l.from_entity_id,
   l.to_entity_id,
   f.id as from_id,
   f.entity_type as from_entity_type,
   f.ref_id as from_ref_id,
   f.title as from_title,
   f.source as from_source,
   f.source_type as from_source_type,
   f.source_tier as from_source_tier,
   f.source_url as from_source_url,
   f.mode as from_mode,
   f.freshness as from_freshness,
   f.confidence_score as from_confidence_score,
   f.metadata as from_metadata,
   t.id as to_id,
   t.entity_type as to_entity_type,
   t.ref_id as to_ref_id,
   t.title as to_title,
   t.source as to_source,
   t.source_type as to_source_type,
   t.source_tier as to_source_tier,
   t.source_url as to_source_url,
   t.mode as to_mode,
   t.freshness as to_freshness,
   t.confidence_score as to_confidence_score,
   t.metadata as to_metadata
  from intelligence_links l
  join intelligence_entities f on f.id = l.from_entity_id
  join intelligence_entities t on t.id = l.to_entity_id
  where (l.from_entity_id = any(%s) or l.to_entity_id = any(%s))
  """
  + link_clause
  + """
  order by l.confidence_score desc, l.created_at desc
  limit %s
  """
 )
 return fetch_all(query, tuple(params))


def refresh_graph_materialization(user: dict[str, Any] | None = None) -> dict[str, int]:
 user_id = str(user.get("id")) if isinstance(user, dict) and user.get("id") else None
 news_stats = materialize_news_links(limit=280)
 event_stats = materialize_event_links(limit=260)
 operator_stats = {"entities": 0, "links": 0}
 if user_id:
  operator_stats = materialize_operator_links(user_id, limit=320)
 geoboard_stats = {"entities": 0, "links": 0}
 try:
  payload = geoboard_payload(user, "STANDARD")
  geoboard_stats = materialize_geoboard_links(payload.get("feed") if isinstance(payload, dict) else [])
 except Exception:
  geoboard_stats = {"entities": 0, "links": 0}
 return {
  "entities": int(news_stats.get("entities", 0))
  + int(event_stats.get("entities", 0))
  + int(operator_stats.get("entities", 0))
  + int(geoboard_stats.get("entities", 0)),
  "links": int(news_stats.get("links", 0))
  + int(event_stats.get("links", 0))
  + int(operator_stats.get("links", 0))
  + int(geoboard_stats.get("links", 0)),
 }


def graph_neighborhood(
 *,
 entity_type: str,
 ref_id: str,
 depth: int = 1,
 limit: int = 80,
 link_types: list[str] | None = None,
 per_hop_limit: int = 240,
) -> dict[str, Any]:
 normalized_entity_type = _normalize_entity_type(entity_type)
 normalized_ref_id = str(ref_id or "").strip()
 if not normalized_ref_id:
  raise ValueError("ref_id is required")
 root_row = fetch_one(
  """
  select id, entity_type, ref_id, title, source, source_type, source_tier, source_url, mode, freshness, confidence_score, metadata
  from intelligence_entities
  where entity_type = %s and ref_id = %s
  """,
  (normalized_entity_type, normalized_ref_id),
 )
 if not root_row:
  return {
   "generatedAt": utc_now().isoformat(),
   "root": {
    "entityType": normalized_entity_type,
    "refId": normalized_ref_id,
    "title": normalized_ref_id,
    "routeHint": _route_hint(normalized_entity_type, normalized_ref_id),
   },
   "nodes": [],
   "edges": [],
   "summary": {"nodeCount": 0, "edgeCount": 0, "truncated": False},
   "filters": {"depth": 0, "limit": max(1, limit), "linkTypes": []},
   "seedEntities": _seed_nodes(),
  }

 link_filter = [str(item).strip() for item in (link_types or []) if str(item).strip()]
 requested_depth = max(1, min(int(depth), 2))
 requested_limit = max(1, min(int(limit), 220))
 visited_nodes: set[str] = {str(root_row["id"])}
 nodes_by_id: dict[str, dict[str, Any]] = {str(root_row["id"]): _entity_row_to_node(root_row)}
 frontier: list[str] = [str(root_row["id"])]
 edge_rows: list[dict[str, Any]] = []
 seen_edges: set[str] = set()
 truncated = False

 for _level in range(requested_depth):
  if not frontier:
   break
  links = _fetch_link_rows(frontier, link_filter, per_hop_limit=per_hop_limit)
  next_frontier: list[str] = []
  for row in links:
   edge_id = str(row.get("link_id") or "")
   if not edge_id or edge_id in seen_edges:
    continue
   seen_edges.add(edge_id)
   edge_rows.append(
    {
     "id": edge_id,
     "fromId": str(row.get("from_id") or ""),
     "toId": str(row.get("to_id") or ""),
     "linkType": str(row.get("link_type") or ""),
     "confidenceScore": float(row.get("confidence_score") or 0.0),
     "rationale": str(row.get("rationale") or ""),
    },
   )
   for side in ("from", "to"):
    node_id = str(row.get(side + "_id") or "")
    if not node_id:
     continue
    if node_id not in nodes_by_id:
      node_row = {
       "id": row.get(side + "_id"),
       "entity_type": row.get(side + "_entity_type"),
       "ref_id": row.get(side + "_ref_id"),
       "title": row.get(side + "_title"),
       "source": row.get(side + "_source"),
       "source_type": row.get(side + "_source_type"),
       "source_tier": row.get(side + "_source_tier"),
       "source_url": row.get(side + "_source_url"),
       "mode": row.get(side + "_mode"),
       "freshness": row.get(side + "_freshness"),
       "confidence_score": row.get(side + "_confidence_score"),
       "metadata": row.get(side + "_metadata"),
      }
      nodes_by_id[node_id] = _entity_row_to_node(node_row)
    if node_id not in visited_nodes:
      visited_nodes.add(node_id)
      next_frontier.append(node_id)
    if len(nodes_by_id) >= requested_limit:
      truncated = True
      break
   if truncated:
    break
  frontier = next_frontier
  if truncated:
   break

 node_ids = list(nodes_by_id.keys())
 score_map = _latest_scores(node_ids)
 nodes = [nodes_by_id[node_id] for node_id in node_ids]
 for node in nodes:
  score = score_map.get(node["id"])
  if not score:
   continue
  node["scores"] = score

 available_link_types = sorted({str(item["linkType"]) for item in edge_rows if item.get("linkType")})
 return {
  "generatedAt": utc_now().isoformat(),
  "root": nodes_by_id[str(root_row["id"])],
  "nodes": nodes,
  "edges": edge_rows,
  "summary": {
   "nodeCount": len(nodes),
   "edgeCount": len(edge_rows),
   "truncated": truncated,
  },
  "filters": {
   "depth": requested_depth,
   "limit": requested_limit,
   "linkTypes": available_link_types,
  },
  "seedEntities": _seed_nodes(),
 }
