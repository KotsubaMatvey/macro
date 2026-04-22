import Link from "next/link"
import { createElement as h } from "react"
import type { ReactNode } from "react"
import type { GraphEdge, GraphNeighborhoodPayload, GraphNode, GraphSeedEntity } from "@macroaccess/types"

import { Badge, DataTable, KeyValueList, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
import { getEvents, getGraphNeighborhood } from "@/lib/server/api"

type MapSearchValue = string | readonly string[] | undefined

interface RelationshipMapSearchParams {
 entity_type?: MapSearchValue
 ref_id?: MapSearchValue
 depth?: MapSearchValue
 limit?: MapSearchValue
 link_types?: MapSearchValue
}

interface RelationshipMapPageProps {
 searchParams?: Promise<RelationshipMapSearchParams | undefined>
}

function readParam(value: MapSearchValue) {
 if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : ""
 if (typeof value === "string") return value
 return ""
}

function toNumber(value: string, fallback: number) {
 const parsed = Number(value)
 if (!Number.isFinite(parsed)) return fallback
 return parsed
}

function hrefFor(base: Record<string, string>, override: Record<string, string>) {
 const params = new URLSearchParams()
 const merged = { ...base, ...override }
 Object.keys(merged).forEach(function (key) {
  const value = merged[key]
  if (!value) return
  params.set(key, value)
 })
 const query = params.toString()
 return query ? "/app/relationship-map?" + query : "/app/relationship-map"
}

function modeBand(item: GraphNode) {
 return h("div", { className: "ws-status-band" }, [
  h(Badge, { key: "type" }, item.entityType),
  h(Badge, { key: "mode", accent: item.mode === "live" }, item.mode),
  h(Badge, { key: "fresh" }, item.freshness),
  h(Badge, { key: "source" }, item.sourceType),
 ])
}

function nodeRows(nodes: GraphNode[]): ReactNode[][] {
 return nodes.map(function (item) {
  return [
   h("div", { key: item.id, className: "min-w-[220px]" }, [
    h("div", { key: "title", className: "text-[11px] font-medium text-white" }, item.title),
    h("div", { key: "ref", className: "mt-1 ws-mono text-[10px] text-slate-500" }, item.refId),
   ]),
   modeBand(item),
   item.surfaceHint,
   item.scores && typeof item.scores.rankScore === "number" ? String(Math.round(Number(item.scores.rankScore) * 100)) : "--",
   h(Link, { key: "route", href: item.routeHint, className: "terminal-link text-xs" }, "Open surface"),
   h(Link, { key: "pivot", href: "/app/relationship-map?entity_type=" + encodeURIComponent(item.entityType) + "&ref_id=" + encodeURIComponent(item.refId), className: "terminal-link text-xs" }, "Pivot"),
  ]
 })
}

function edgeRows(edges: GraphEdge[], nodesById: Map<string, GraphNode>): ReactNode[][] {
 return edges.map(function (item) {
  const from = nodesById.get(item.fromId)
  const to = nodesById.get(item.toId)
  return [
   item.linkType,
   from ? from.title : item.fromId,
   to ? to.title : item.toId,
   String(Math.round(item.confidenceScore * 100)),
   item.rationale ? item.rationale : "--",
  ]
 })
}

function seedCards(seeds: GraphSeedEntity[]) {
 return seeds.map(function (seed) {
  return h(Link, { key: seed.id, href: "/app/relationship-map?entity_type=" + encodeURIComponent(seed.entityType) + "&ref_id=" + encodeURIComponent(seed.refId), className: "ws-link-card" }, [
   h("div", { key: "meta", className: "ws-status-band" }, [
    h(Badge, { key: "type" }, seed.entityType),
    h(Badge, { key: "mode", accent: seed.mode === "live" }, seed.mode),
    h(Badge, { key: "fresh" }, seed.freshness),
   ]),
   h("div", { key: "title", className: "mt-2 text-sm font-medium text-white" }, seed.title),
   h("div", { key: "ref", className: "mt-1 ws-mono text-[10px] text-slate-500" }, seed.refId),
  ])
 })
}

export default async function RelationshipMapPage(props: RelationshipMapPageProps) {
 const params = props.searchParams ? await props.searchParams : undefined
 const seededEvents = await getEvents()
 const fallbackRef = seededEvents.length !== 0 ? seededEvents[0].id : "event-cpi-mar"
 const entityType = readParam(params ? params.entity_type : undefined) || "scheduled_event"
 const refId = readParam(params ? params.ref_id : undefined) || fallbackRef
 const depth = Math.max(1, Math.min(2, toNumber(readParam(params ? params.depth : undefined), 1)))
 const limit = Math.max(20, Math.min(220, toNumber(readParam(params ? params.limit : undefined), 80)))
 const linkTypesRaw = readParam(params ? params.link_types : undefined)
 const linkTypes = linkTypesRaw ? linkTypesRaw.split(",").map(function (item) { return item.trim() }).filter(Boolean) : []

 const payload = await getGraphNeighborhood({ entityType: entityType, refId: refId, depth: depth, limit: limit, linkTypes: linkTypes, refresh: true }) as GraphNeighborhoodPayload
 const root = payload.root as Record<string, unknown>
 const rootEntityType = String(root.entityType ? root.entityType : entityType)
 const rootRefId = String(root.refId ? root.refId : refId)
 const rootRouteHint = String(root.routeHint ? root.routeHint : "/app/dashboard")
 const filters = {
  entity_type: entityType,
  ref_id: refId,
  depth: String(depth),
  limit: String(limit),
  link_types: linkTypes.join(","),
 }
 const nodes = payload.nodes ? payload.nodes : []
 const edges = payload.edges ? payload.edges : []
 const nodeMap = new Map(nodes.map(function (item) { return [item.id, item] }))
 const metrics = [
  { label: "Nodes", value: String(payload.summary.nodeCount ? payload.summary.nodeCount : nodes.length), note: "Entities currently in this neighborhood graph window." },
  { label: "Edges", value: String(payload.summary.edgeCount ? payload.summary.edgeCount : edges.length), note: "Relationship links from intelligence graph materialization." },
  { label: "Depth", value: String(depth), note: "Hop depth around selected root entity." },
  { label: "Limit", value: String(limit), note: payload.summary.truncated ? "Result was truncated by node limit." : "Result fits inside current graph limits." },
 ]
 const primaryWorkflowLink = rootEntityType === "scheduled_event"
  ? h(Link, { href: "/app/events/" + encodeURIComponent(rootRefId), className: "terminal-link text-sm" }, "Open event detail")
  : h(Link, { href: rootRouteHint, className: "terminal-link text-sm" }, "Open root surface")
 const primaryWorkflowUse = rootEntityType === "scheduled_event"
  ? "Inspect release-level context and linked intelligence."
  : "Jump to the primary surface for the current root entity."

 return h(PageShell, { title: "Relationship Map", subtitle: "Desk intelligence graph explorer: inspect linked entities and pivot directly into the right surface.", active: "relationship-map" }, h("div", { className: "space-y-4" }, [
  h(MetricGrid, { key: "metrics", items: metrics }),
  h(Panel, { key: "controls", title: "Graph controls", subtitle: "Adjust neighborhood depth and link filters while preserving source and mode context.", level: "command" }, [
   h("div", { key: "toolbar", className: "ws-toolbar" }, [
    h(Link, { key: "d1", href: hrefFor(filters, { depth: "1" }), className: depth === 1 ? "desk-tab desk-tab-active" : "desk-tab" }, "Depth 1"),
    h(Link, { key: "d2", href: hrefFor(filters, { depth: "2" }), className: depth === 2 ? "desk-tab desk-tab-active" : "desk-tab" }, "Depth 2"),
    h(Link, { key: "l80", href: hrefFor(filters, { limit: "80" }), className: limit === 80 ? "desk-tab desk-tab-active" : "desk-tab" }, "Limit 80"),
    h(Link, { key: "l140", href: hrefFor(filters, { limit: "140" }), className: limit === 140 ? "desk-tab desk-tab-active" : "desk-tab" }, "Limit 140"),
    h(Link, { key: "clear", href: hrefFor(filters, { link_types: "" }), className: linkTypes.length === 0 ? "desk-tab desk-tab-active" : "desk-tab" }, "All link types"),
   ]),
   h("div", { key: "links", className: "ws-toolbar mt-2" }, (payload.filters && Array.isArray(payload.filters.linkTypes) ? payload.filters.linkTypes : []).map(function (type) {
    const typeLabel = String(type)
    const active = linkTypes.includes(typeLabel)
    return h(Link, { key: typeLabel, href: hrefFor(filters, { link_types: active ? "" : typeLabel }), className: active ? "ws-toolbar-chip desk-tab-active" : "ws-toolbar-chip" }, typeLabel)
   })),
   h("div", { key: "status", className: "ws-status-band mt-3" }, [
    h(Badge, { key: "entity" }, entityType),
    h(Badge, { key: "ref" }, refId),
    h(Badge, { key: "generated", accent: true }, payload.generatedAt.replace("T", " ").slice(0, 16)),
   ]),
  ]),
  h("div", { key: "grid", className: "ws-two-panel" }, [
   h("div", { key: "left", className: "space-y-4" }, [
    h(Panel, { key: "root", title: "Root entity", subtitle: "Selected anchor entity with direct routing and source integrity metadata.", level: "context" }, h(KeyValueList, { items: [
     { label: "Entity", value: String((payload.root as Record<string, unknown>).entityType ? (payload.root as Record<string, unknown>).entityType : entityType) },
     { label: "Ref", value: String((payload.root as Record<string, unknown>).refId ? (payload.root as Record<string, unknown>).refId : refId) },
     { label: "Title", value: String((payload.root as Record<string, unknown>).title ? (payload.root as Record<string, unknown>).title : refId) },
     { label: "Source", value: String((payload.root as Record<string, unknown>).source ? (payload.root as Record<string, unknown>).source : "--") },
     { label: "Mode", value: String((payload.root as Record<string, unknown>).mode ? (payload.root as Record<string, unknown>).mode : "--") },
     { label: "Freshness", value: String((payload.root as Record<string, unknown>).freshness ? (payload.root as Record<string, unknown>).freshness : "--") },
    ] })),
    h(Panel, { key: "nodes", title: "Node neighborhood", subtitle: "All related entities in the current neighborhood window.", level: "command" }, h(DataTable, { headers: ["Entity", "Status", "Surface", "Rank", "Open", "Pivot"], rows: nodes.length !== 0 ? nodeRows(nodes) : [["No nodes", "-", "-", "-", "-", "-"]], dense: true, stickyHeader: true })),
    h(Panel, { key: "edges", title: "Relationship edges", subtitle: "Explicit graph links with confidence and rationale from backend intelligence contracts.", level: "integrity" }, h(DataTable, { headers: ["Link type", "From", "To", "Conf", "Rationale"], rows: edges.length !== 0 ? edgeRows(edges, nodeMap) : [["No edges", "-", "-", "-", "-"]], dense: true, stickyHeader: true })),
   ]),
   h("div", { key: "right", className: "space-y-4" }, [
    h(Panel, { key: "seed", title: "Seed entities", subtitle: "Fast pivots into high-value entities for desk exploration.", level: "support" }, payload.seedEntities && payload.seedEntities.length !== 0 ? h("div", { className: "grid gap-2.5" }, seedCards(payload.seedEntities)) : h("div", { className: "text-sm text-slate-500" }, "No seed entities are available yet.")),
    h(Panel, { key: "workflow", title: "Workflow pivots", subtitle: "Cross-surface routes from graph context into the workstation.", level: "support" }, h(DataTable, { headers: ["Module", "Use"], rows: [
     [primaryWorkflowLink, primaryWorkflowUse],
     [h(Link, { href: "/app/news", className: "terminal-link text-sm" }, "Open news tape"), "Move from graph node into ranked headline tape."],
     [h(Link, { href: "/app/geoboard", className: "terminal-link text-sm" }, "Open geoboard"), "Inspect geo and macro feed layers in map context."],
     [h(Link, { href: "/app/data-sources", className: "terminal-link text-sm" }, "Open data sources"), "Validate provider states behind current graph rows."],
     [h(Link, { href: "/app/workspaces", className: "terminal-link text-sm" }, "Open workspaces"), "Save this graph and module route chain into a reusable desk preset."],
    ], dense: true })),
   ]),
  ]),
 ]))
}
