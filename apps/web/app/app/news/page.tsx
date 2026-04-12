import Link from "next/link"
import { createElement as h } from "react"
import type { ReactNode } from "react"
import type { NewsFeedPayload, NewsItem } from "@macroaccess/types"

import { Badge, DataTable, EventLink, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
import { getNews } from "@/lib/server/api"

type NewsSearchParamValue = string | readonly string[] | undefined

interface NewsSearchParams {
 mode?: NewsSearchParamValue
 search?: NewsSearchParamValue
 source_type?: NewsSearchParamValue
 region?: NewsSearchParamValue
 topic?: NewsSearchParamValue
 category?: NewsSearchParamValue
 currency?: NewsSearchParamValue
 asset?: NewsSearchParamValue
 event_family?: NewsSearchParamValue
 official_only?: NewsSearchParamValue
 watchlist_only?: NewsSearchParamValue
 min_urgency?: NewsSearchParamValue
}

interface NewsPageProps {
 searchParams?: Promise<NewsSearchParams | undefined>
}

function readParam(value: NewsSearchParamValue) {
 if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : ""
 if (typeof value === "string") return value
 return ""
}

function boolParam(value: string) {
 const normalized = value.trim().toLowerCase()
 return normalized === "1" || normalized === "true" || normalized === "yes"
}

function modeParam(value: string): "wire" | "macro" | "watchlist" {
 if (value === "macro") return "macro"
 if (value === "watchlist") return "watchlist"
 return "wire"
}

function formatTime(value: string) {
 return value.replace("T", " ").slice(0, 16)
}

function modeLabel(value: "wire" | "macro" | "watchlist") {
 if (value === "macro") return "Macro Only"
 if (value === "watchlist") return "Watchlist"
 return "Wire"
}

function buildHref(filters: Record<string, string>, overrides: Record<string, string>) {
 const params = new URLSearchParams()
 const next = { ...filters, ...overrides }
 Object.keys(next).forEach(function (key) {
  const value = next[key]
  if (!value) return
  params.set(key, value)
 })
 const query = params.toString()
 return query ? "/app/news?" + query : "/app/news"
}

function sourceBadge(item: NewsItem) {
 const sourceType = item.sourceType ? item.sourceType : "discovery"
 const mode = item.mode ? item.mode : "fallback"
 return h("div", { className: "flex flex-wrap gap-1.5" }, [
  h(Badge, { key: "type", accent: sourceType === "official" }, sourceType),
  h(Badge, { key: "mode" }, mode),
  h(Badge, { key: "fresh" }, item.freshness ? item.freshness : "degraded"),
 ])
}

function itemRow(item: NewsItem): ReactNode[] {
 const assets = item.assetSymbols && item.assetSymbols.length !== 0 ? item.assetSymbols.join(", ") : "--"
 const sourceLink = item.sourceUrl
  ? h("a", { href: item.sourceUrl, target: "_blank", rel: "noreferrer", className: "terminal-link text-xs" }, "Source")
  : h("span", { className: "text-xs text-slate-500" }, "No source URL")
 const eventLink = item.relatedEventId
  ? h(Link, { href: "/app/events/" + item.relatedEventId, className: "terminal-link text-xs" }, "Event")
  : h("span", { className: "text-xs text-slate-500" }, "No event")
 return [
  formatTime(item.publishedAt),
  item.source,
  sourceBadge(item),
  item.category,
  h("div", { className: "min-w-[340px]" }, [
   h(Link, { key: "headline", href: "/app/news?focus=" + item.id, className: "text-sm font-medium text-white transition hover:text-sky-200" }, item.title),
   h("p", { key: "summary", className: "mt-1 text-xs leading-5 text-slate-400" }, item.summary),
   h("div", { key: "links", className: "mt-2 flex flex-wrap gap-3" }, [eventLink, sourceLink, h(Link, { key: "reactions", href: "/app/live-reactions", className: "terminal-link text-xs" }, "Reactions"), h(Link, { key: "bias", href: "/app/market-bias", className: "terminal-link text-xs" }, "Bias")]),
  ]),
  assets,
  item.clusterCount ? String(item.clusterCount) : "1",
 ]
}

function railList(title: string, subtitle: string, items: NewsItem[]) {
 return h(Panel, { title: title, subtitle: subtitle }, items.length !== 0 ? h("div", { className: "grid gap-3" }, items.slice(0, 6).map(function (item) {
  if (item.relatedEventId) {
   return h(EventLink, { key: item.id, eventId: item.relatedEventId, slug: item.relatedEventSlug ? item.relatedEventSlug : item.slug, title: item.title, meta: item.source + " / " + item.category + " / " + (item.mode ? item.mode : "fallback") })
  }
  return h("div", { key: item.id, className: "ws-feed-card" }, [
   h("div", { key: "meta", className: "text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500" }, item.source + " / " + item.category),
   h("div", { key: "title", className: "mt-2 text-sm font-medium text-white" }, item.title),
   h("p", { key: "why", className: "mt-2 text-xs leading-5 text-slate-400" }, item.whyItMatters ? item.whyItMatters : item.summary),
  ])
 })) : h("div", { className: "text-sm text-slate-500" }, "No items in this rail."))
}

export default async function NewsPage(props: NewsPageProps) {
 const params = props.searchParams ? await props.searchParams : undefined
 const mode = modeParam(readParam(params ? params.mode : undefined))
 const search = readParam(params ? params.search : undefined)
 const sourceType = readParam(params ? params.source_type : undefined)
 const region = readParam(params ? params.region : undefined)
 const topic = readParam(params ? params.topic : undefined)
 const category = readParam(params ? params.category : undefined)
 const currency = readParam(params ? params.currency : undefined)
 const asset = readParam(params ? params.asset : undefined)
 const eventFamily = readParam(params ? params.event_family : undefined)
 const officialOnly = boolParam(readParam(params ? params.official_only : undefined))
 const watchlistOnly = boolParam(readParam(params ? params.watchlist_only : undefined))
 const minUrgencyRaw = readParam(params ? params.min_urgency : undefined)
 const minUrgency = minUrgencyRaw ? Number(minUrgencyRaw) : 0
 const payload = await getNews({
  mode: mode,
  search: search,
  sourceType: sourceType,
  region: region,
  topic: topic,
  category: category,
  currency: currency,
  asset: asset,
  eventFamily: eventFamily,
  officialOnly: officialOnly,
  watchlistOnly: watchlistOnly,
  minUrgency: Number.isFinite(minUrgency) ? minUrgency : 0,
  limit: 90,
 }) as NewsFeedPayload

 const filters = {
  mode: mode,
  search: search,
  source_type: sourceType,
  region: region,
  topic: topic,
  category: category,
  currency: currency,
  asset: asset,
  event_family: eventFamily,
  official_only: officialOnly ? "true" : "",
  watchlist_only: watchlistOnly ? "true" : "",
  min_urgency: minUrgency > 0 ? String(minUrgency) : "",
 }

 const metrics = [
  { label: "Rows", value: String(payload.summary.total), note: "Canonical clustered rows after ranking and filtering." },
  { label: "Official", value: String(payload.summary.official), note: "Primary-source rows in the current view." },
  { label: "Discovery", value: String(payload.summary.discovery), note: "Secondary discovery rows still shown with explicit labels." },
  { label: "Watchlist hits", value: String(payload.summary.watchlistHits), note: "Rows overlapping desk watchlists or context." },
 ]

 const rows: ReactNode[][] = payload.items.length !== 0
  ? payload.items.map(itemRow)
  : [["--", "--", "--", "--", "No items match current filters", "--", "--"]]

 const statusRows: ReactNode[][] = payload.rails.sourceStatus.length !== 0
  ? payload.rails.sourceStatus.map(function (item) {
   return [item.providerKey, item.sourceType, item.status, item.mode, item.detail]
  })
  : [["No provider runs", "--", "fallback", "fallback", "Run ingest_official_news or refresh_news_cache job."]]

 const modeTabs = ["wire", "macro", "watchlist"].map(function (entry) {
  const tabMode = modeParam(entry)
  const active = tabMode === mode
  return h(Link, { key: entry, href: buildHref(filters, { mode: tabMode }), className: active ? "desk-tab desk-tab-active" : "desk-tab" }, modeLabel(tabMode))
 })

 const quickFilters = h("div", { className: "ws-toolbar" }, [
  h(Link, { key: "all", href: buildHref(filters, { source_type: "", official_only: "", watchlist_only: "", min_urgency: "" }), className: "ws-toolbar-chip" }, "All"),
  h(Link, { key: "official", href: buildHref(filters, { official_only: "true", source_type: "official" }), className: "ws-toolbar-chip" }, "Official only"),
  h(Link, { key: "urgent", href: buildHref(filters, { min_urgency: "0.7" }), className: "ws-toolbar-chip" }, "High urgency"),
  h(Link, { key: "watch", href: buildHref(filters, { mode: "watchlist", watchlist_only: "true" }), className: "ws-toolbar-chip" }, "Watchlist only"),
  h(Link, { key: "macro", href: buildHref(filters, { mode: "macro" }), className: "ws-toolbar-chip" }, "Macro only"),
 ])

 return h(PageShell, { title: "News Wire", subtitle: "Terminal-grade macro feed with official-source priority, clustering, and watchlist context.", active: "news", mode: payload.shellMode }, h("div", { className: "space-y-5" }, [
  h(MetricGrid, { key: "metrics", items: metrics }),
  h(Panel, { key: "control", title: "Mode / filters", subtitle: "Switch between Wire, Macro Only, and Watchlist while keeping source honesty explicit." }, [
   h("div", { key: "modes", className: "flex flex-wrap gap-2" }, modeTabs),
   h("div", { key: "quick", className: "mt-3" }, quickFilters),
   h("div", { key: "meta", className: "mt-4 flex flex-wrap gap-2" }, [
    h(Badge, { key: "mode" }, payload.modeLabel),
    h(Badge, { key: "shell", accent: payload.shellMode === "live" }, payload.shellMode),
    h(Badge, { key: "fresh" }, payload.freshness),
    h(Badge, { key: "source" }, payload.sourceMeta.source),
   ]),
   h("p", { key: "note", className: "mt-3 text-sm leading-6 text-slate-400" }, payload.sourceMeta.note),
  ]),
  h("div", { key: "grid", className: "ws-two-panel" }, [
   h("div", { key: "left", className: "space-y-5" }, [
    h(Panel, { key: "feed", title: "Wire feed", subtitle: "Dense ranked tape with source labels, clusters, assets, and workstation links." }, h(DataTable, { headers: ["Time", "Source", "Type", "Category", "Headline", "Assets", "Cluster"], rows: rows, dense: true, stickyHeader: true, ariaLabel: "News feed" })),
    h(Panel, { key: "status", title: "Source status", subtitle: "Provider ingest status across official and discovery adapters." }, h(DataTable, { headers: ["Provider", "Type", "Status", "Mode", "Detail"], rows: statusRows, dense: true })),
   ]),
   h("div", { key: "right", className: "space-y-5" }, [
    railList("Top now", "Highest ranked stories right now.", payload.rails.topNow),
    railList("Calendar linked", "Rows linked directly into macro event detail.", payload.rails.calendarLinked),
    railList("Watchlist news", "Rows that overlap watched assets or desk context.", payload.rails.watchlistNews),
    railList("High urgency", "Fast-moving rows with urgency >= 0.70.", payload.rails.highUrgency),
   ]),
  ]),
 ]))
}
