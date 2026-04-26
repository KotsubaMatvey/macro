import Link from "next/link"
import { createElement as h } from "react"
import type { ReactNode } from "react"
import type { GraphEdge, GraphNeighborhoodPayload, GraphNode, GraphSeedEntity } from "@macroaccess/types"

import { Badge, DataTable, EmptyState, KeyValueList, MetricGrid, PageShell, Panel, ScoreBar, SourceCell } from "@/components/app/chrome"
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
 return h(SourceCell, { state: item.entityType, mode: item.mode, freshness: item.freshness, sourceType: item.sourceType })
}

function scorePct(value: unknown) {
 const numeric = typeof value === "number" ? value : Number(value)
 if (!Number.isFinite(numeric)) return 0
 return Math.max(0, Math.min(100, numeric > 1 ? numeric : numeric * 100))
}

function nodeRows(nodes: GraphNode[]): ReactNode[][] {
 return nodes.map(function (item) {
  const rank = item.scores && typeof item.scores.rankScore === "number" ? scorePct(item.scores.rankScore) : scorePct(item.confidenceScore)
  return [
   h("div", { key: item.id, className: "min-w-[220px]" }, [
    h("div", { key: "title", className: "text-[11px] font-medium text-white" }, item.title),
    h("div", { key: "ref", className: "mt-1 ws-mono text-[10px] text-slate-500" }, item.refId),
   ]),
   modeBand(item),
   item.surfaceHint,
   h(ScoreBar, { key: "rank", value: rank, label: "rank", tone: rank >= 70 ? "live" : "neutral" }),
   h(ScoreBar, { key: "confidence", value: scorePct(item.confidenceScore), label: "conf", tone: scorePct(item.confidenceScore) >= 70 ? "live" : "warn" }),
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
   h(ScoreBar, { key: "confidence", value: scorePct(item.confidenceScore), label: "conf", tone: scorePct(item.confidenceScore) >= 70 ? "live" : "warn" }),
   item.rationale ? item.rationale : "--",
  ]
 })
}

function laneLabel(type: string) {
 if (type === "scheduled_event") return "Events"
 if (type === "news_item") return "News"
 if (type === "asset") return "Assets"
 if (type === "report") return "Reports"
 if (type === "reaction_family") return "Reactions"
 if (type === "region") return "Regions"
 return type.replace(/_/g, " ")
}

function relationshipLanes(nodes: GraphNode[], edges: GraphEdge[]) {
 const grouped = nodes.reduce(function (acc, node) {
  const key = laneLabel(node.entityType)
  if (!acc[key]) acc[key] = []
  acc[key].push(node)
  return acc
 }, {} as Record<string, GraphNode[]>)
 const laneNames = Object.keys(grouped).sort(function (left, right) { return grouped[right].length - grouped[left].length })
 return laneNames.slice(0, 6).map(function (name) {
  const laneNodes = grouped[name].slice().sort(function (left, right) { return scorePct(right.confidenceScore) - scorePct(left.confidenceScore) }).slice(0, 5)
  return h("div", { key: name, className: "ws-feed-card" }, [
   h("div", { key: "head", className: "flex items-center justify-between gap-3" }, [
    h("div", { key: "title", className: "text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300" }, name),
    h(Badge, { key: "count", quiet: true }, String(grouped[name].length) + " nodes"),
   ]),
   h("div", { key: "nodes", className: "mt-2 grid gap-2" }, laneNodes.map(function (node) {
    const linkedEdges = edges.filter(function (edge) { return edge.fromId === node.id || edge.toId === node.id }).length
    return h(Link, { key: node.id, href: "/app/relationship-map?entity_type=" + encodeURIComponent(node.entityType) + "&ref_id=" + encodeURIComponent(node.refId), className: "group block rounded-[8px] border border-white/[0.045] bg-white/[0.01] px-2 py-2 transition hover:border-white/[0.11] hover:bg-white/[0.025]" }, [
     h("div", { key: "row", className: "flex items-start justify-between gap-2" }, [
      h("div", { key: "copy", className: "min-w-0" }, [
       h("div", { key: "title", className: "truncate text-[11px] font-medium text-white group-hover:text-sky-100" }, node.title),
       h("div", { key: "meta", className: "mt-1 ws-mono text-[9px] text-slate-500" }, node.refId),
      ]),
      h("span", { key: "edges", className: "ws-mono text-[10px] text-slate-500" }, String(linkedEdges)),
     ]),
     h(ScoreBar, { key: "conf", value: scorePct(node.confidenceScore), tone: scorePct(node.confidenceScore) >= 70 ? "live" : "warn", className: "mt-2" }),
    ])
   })),
  ])
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
 const lanes = relationshipLanes(nodes, edges)
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
    h(Panel, { key: "lanes", title: "Relationship lanes", subtitle: "Grouped neighbor lanes keep graph context readable before drilling into full node and edge tables.", level: "command" }, lanes.length !== 0 ? h("div", { className: "grid gap-2 xl:grid-cols-2" }, lanes) : h(EmptyState, { title: "Graph not materialized", body: "No linked entities are available for this root. Open seed entities or inspect Data Sources if graph feeds are degraded.", action: h(Link, { href: "/app/data-sources", className: "desk-tab" }, "Inspect providers"), tone: "integrity" })),
    h(Panel, { key: "nodes", title: "Node neighborhood", subtitle: "All related entities in the current neighborhood window.", level: "command" }, h(DataTable, { headers: ["Entity", "Status", "Surface", "Rank", "Confidence", "Open", "Pivot"], rows: nodes.length !== 0 ? nodeRows(nodes) : [], dense: true, stickyHeader: true, emptyMessage: "No graph nodes are available for this root." })),
    h(Panel, { key: "edges", title: "Relationship edges", subtitle: "Explicit graph links with confidence and rationale from backend intelligence contracts.", level: "integrity" }, h(DataTable, { headers: ["Link type", "From", "To", "Confidence", "Rationale"], rows: edges.length !== 0 ? edgeRows(edges, nodeMap) : [], dense: true, stickyHeader: true, emptyMessage: "No relationship edges are materialized for this root." })),
   ]),
   h("div", { key: "right", className: "space-y-4" }, [
    h(Panel, { key: "seed", title: "Seed entities", subtitle: "Fast pivots into high-value entities for desk exploration.", level: "support" }, payload.seedEntities && payload.seedEntities.length !== 0 ? h("div", { className: "grid gap-2.5" }, seedCards(payload.seedEntities)) : h(EmptyState, { title: "No seed entities", body: "Graph seed rows are not available. Open Data Sources to inspect graph and event provider states.", action: h(Link, { href: "/app/data-sources", className: "desk-tab" }, "Open data sources") })),
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
