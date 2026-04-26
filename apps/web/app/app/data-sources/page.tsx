import Link from "next/link"
import { createElement as h } from "react"
import type { ReactNode } from "react"
import type { ProviderControlPlanePayload, ProviderDomainBlock, ProviderStatusItem } from "@macroaccess/types"

import { Badge, DataTable, EmptyState, MetricGrid, PageShell, Panel, ScoreBar, SourceCell } from "@/components/app/chrome"
import { getProviderStatus } from "@/lib/server/api"

type DataSourcesSearchParam = string | readonly string[] | undefined

interface DataSourcesSearchParams {
 domain?: DataSourcesSearchParam
}

interface DataSourcesPageProps {
 searchParams?: Promise<DataSourcesSearchParams | undefined>
}

function readParam(value: DataSourcesSearchParam) {
 if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : ""
 if (typeof value === "string") return value
 return ""
}

function formatTime(value?: string | null) {
 if (!value) return "--"
 return value.replace("T", " ").slice(0, 16)
}

function stateBadge(item: ProviderStatusItem) {
 return h(SourceCell, { state: item.state, mode: item.mode, freshness: item.freshness, sourceType: item.sourceType })
}

function providerHealth(item: ProviderStatusItem) {
 if (item.state === "live" && item.freshness === "fresh") return 96
 if (item.state === "live") return 84
 if (item.state === "degraded") return 46
 if (item.state === "fallback") return 28
 if (item.mode === "demo" || item.mode === "replay") return 54
 return 38
}

function healthTone(value: number) {
 if (value >= 80) return "live" as const
 if (value >= 45) return "warn" as const
 return "bad" as const
}

function routeLink(item: ProviderStatusItem) {
 return h("div", { className: "grid gap-1" }, [
  h(Link, { key: "route", href: item.routeHint, className: "terminal-link text-xs" }, "Open surface"),
  item.diagnosticsPath ? h(Link, { key: "diag", href: item.diagnosticsPath, className: "terminal-link text-xs" }, "Diagnostics") : null,
 ])
}

function rowsForDomain(domain: ProviderDomainBlock): ReactNode[][] {
 return domain.items.map(function (item) {
  const health = providerHealth(item)
  return [
   h("div", { key: item.providerKey, className: "min-w-[180px]" }, [
    h("div", { key: "title", className: "text-[11px] font-medium text-white" }, item.label),
    h("div", { key: "id", className: "mt-1 ws-mono text-[10px] text-slate-500" }, item.providerKey),
   ]),
   stateBadge(item),
   h(ScoreBar, { key: "health", value: health, label: "health", tone: healthTone(health) }),
   item.sourceType + " / " + item.sourceTier,
   formatTime(item.lastUpdated),
   h("div", { key: "surfaces", className: "text-[11px] text-slate-400" }, item.affectedSurfaces.join(", ")),
   h("div", { key: "note", className: "max-w-[380px] text-[11px] leading-5 text-slate-400" }, item.note),
   routeLink(item),
  ]
 })
}

function domainSummary(domain: ProviderDomainBlock) {
 return h("div", { className: "flex flex-wrap gap-1.5" }, [
  h(Badge, { key: "live" }, "live " + String(domain.counts.live ? domain.counts.live : 0)),
  h(Badge, { key: "degraded" }, "degraded " + String(domain.counts.degraded ? domain.counts.degraded : 0)),
  h(Badge, { key: "fallback" }, "fallback " + String(domain.counts.fallback ? domain.counts.fallback : 0)),
  h(Badge, { key: "demo", quiet: true }, "demo " + String(domain.counts.demo ? domain.counts.demo : 0)),
  h(Badge, { key: "derived", quiet: true }, "derived " + String(domain.counts.derived ? domain.counts.derived : 0)),
  h(Badge, { key: "static", quiet: true }, "static " + String(domain.counts.static ? domain.counts.static : 0)),
 ])
}

function summaryFromDomains(domains: ProviderDomainBlock[]) {
 return domains.reduce(function (acc, domain) {
  const counts = domain.counts || {}
  acc.live += Number(counts.live || 0)
  acc.degraded += Number(counts.degraded || 0)
  acc.fallback += Number(counts.fallback || 0)
  acc.demo += Number(counts.demo || 0)
  acc.derived += Number(counts.derived || 0)
  acc.static += Number(counts.static || 0)
  acc.replay += Number(counts.replay || 0)
  acc.total += Number(counts.total || domain.items.length || 0)
  acc.providers += domain.items.length
  return acc
 }, { domains: domains.length, providers: 0, total: 0, live: 0, degraded: 0, fallback: 0, demo: 0, derived: 0, static: 0, replay: 0 })
}

function degradedQueue(domains: ProviderDomainBlock[]) {
 return domains.flatMap(function (domain) {
  return domain.items.filter(function (item) { return item.state === "degraded" || item.state === "fallback" }).map(function (item) {
   return { domain: domain.label, item: item }
  })
 })
}

export default async function DataSourcesPage(props: DataSourcesPageProps) {
 const params = props.searchParams ? await props.searchParams : undefined
 const domainFilter = readParam(params ? params.domain : undefined).trim()
 const payload = await getProviderStatus() as ProviderControlPlanePayload
 const domains = domainFilter ? payload.domains.filter(function (item) { return item.key === domainFilter }) : payload.domains
 const scopedSummary = summaryFromDomains(domains)
 const queue = degradedQueue(domains)
 const metrics = [
  { label: "Domains", value: String(scopedSummary.domains), note: domainFilter ? "Filtered by selected domain key." : "Provider-backed areas currently tracked by the desk." },
  { label: "Providers", value: String(scopedSummary.providers), note: "Concrete provider/layer rows with explicit state and provenance." },
  { label: "Live", value: String(scopedSummary.live), note: "Rows currently running in live mode." },
  { label: "Degraded + fallback", value: String(scopedSummary.degraded + scopedSummary.fallback), note: "Rows that need operator attention or fallback context." },
 ]
 return h(PageShell, { title: "Data Sources", subtitle: "Provider control plane for runtime integrity: mode, source type, freshness, fallback notes, and affected surfaces.", active: "data-sources" }, h("div", { className: "space-y-4" }, [
  h(MetricGrid, { key: "metrics", items: metrics }),
  h(Panel, { key: "overview", title: "Control plane overview", subtitle: "Operational status board for provider-backed and derived layers currently powering the workstation.", level: "command" }, [
   h("div", { key: "summary", className: "terminal-strip" }, [
    h("span", { key: "generated", className: "terminal-meta" }, ["Generated ", h("strong", { key: "value" }, formatTime(payload.generatedAt))]),
    h("span", { key: "live", className: "terminal-meta" }, ["Live ", h("strong", { key: "value" }, String(scopedSummary.live))]),
   h("span", { key: "degraded", className: "terminal-meta" }, ["Degraded ", h("strong", { key: "value" }, String(scopedSummary.degraded))]),
   h("span", { key: "fallback", className: "terminal-meta" }, ["Fallback ", h("strong", { key: "value" }, String(scopedSummary.fallback))]),
    domainFilter ? h("span", { key: "filter", className: "terminal-meta" }, ["Domain ", h("strong", { key: "value" }, domainFilter)]) : null,
   ]),
   h("div", { key: "health", className: "mt-3 grid gap-2 md:grid-cols-3" }, [
    h(ScoreBar, { key: "live", value: scopedSummary.providers === 0 ? 0 : (scopedSummary.live / scopedSummary.providers) * 100, label: "live coverage", tone: "live" }),
    h(ScoreBar, { key: "attention", value: scopedSummary.providers === 0 ? 0 : ((scopedSummary.degraded + scopedSummary.fallback) / scopedSummary.providers) * 100, label: "attention queue", tone: scopedSummary.degraded + scopedSummary.fallback === 0 ? "neutral" : "warn" }),
    h(ScoreBar, { key: "continuity", value: scopedSummary.providers === 0 ? 0 : ((scopedSummary.demo + scopedSummary.derived + scopedSummary.static + scopedSummary.replay) / scopedSummary.providers) * 100, label: "continuity rows", tone: "neutral" }),
   ]),
   h("p", { key: "note", className: "mt-3 ws-note-muted" }, "This board does not hide continuity states. Live, fallback, derived, static, demo, and replay remain explicit for each row."),
  ]),
  h(Panel, { key: "queue", title: "Degraded / fallback queue", subtitle: "Rows requiring operator attention, grouped with affected surfaces and next inspection route.", level: queue.length === 0 ? "support" : "integrity" }, queue.length !== 0 ? h(DataTable, { headers: ["Domain", "Provider", "State", "Affected surfaces", "Impact note", "Action"], rows: queue.map(function (entry) {
   return [
    entry.domain,
    entry.item.label,
    h(SourceCell, { state: entry.item.state, mode: entry.item.mode, freshness: entry.item.freshness, sourceType: entry.item.sourceType, compact: true }),
    entry.item.affectedSurfaces.join(", "),
    entry.item.note,
    routeLink(entry.item),
   ]
  }), dense: true, stickyHeader: true, emptyMessage: "No degraded provider rows" }) : h(EmptyState, { title: "No provider rows require attention", body: "All rows in this scope are live or continuity-labeled. Runtime honesty remains visible in each domain table." })),
 ].concat(domains.map(function (domain: ProviderDomainBlock) {
  const rows = rowsForDomain(domain)
  return h(Panel, { key: domain.key, title: domain.label, subtitle: domain.description, level: domain.key === "market_data" || domain.key === "news_feeds" ? "command" : "integrity", actions: domainSummary(domain) }, h(DataTable, { headers: ["Provider", "State", "Health", "Source", "Updated", "Affected surfaces", "Degraded/fallback note", "Actions"], rows: rows.length !== 0 ? rows : [], dense: true, stickyHeader: true, emptyMessage: "No provider rows are registered for this domain." }))
 })).concat(domainFilter && domains.length === 0 ? [h(Panel, { key: "empty", title: "No matching domain", subtitle: "The requested domain filter returned no rows.", level: "integrity" }, h(EmptyState, { title: "Domain not found", body: "Use /app/data-sources without a domain filter to inspect all provider domains.", action: h(Link, { href: "/app/data-sources", className: "desk-tab desk-tab-active" }, "Open all domains") }))] : [])))
}
