import Link from "next/link"
import { createElement as h } from "react"

import { Badge, DataTable, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
import { getReactions } from "@/lib/server/api"

function readParam(value: unknown) {
 if (Array.isArray(value)) return value[0]
 if (typeof value === "string") return value
 return ""
}

function pct(value?: number) {
 return value === undefined || value === null ? "-" : value.toFixed(2) + "%"
}

function hitRate(value: number) {
 return Math.round(value * 100) + "%"
}

export default async function LiveReactionsPage(props: { searchParams?: Promise<{ [key: string]: unknown }> }) {
 const searchParams = props.searchParams ? await props.searchParams : {}
 const family = readParam(searchParams.family)
 const asset = readParam(searchParams.asset) || "SPX"
 const country = readParam(searchParams.country)
 const currency = readParam(searchParams.currency)
 const payload = await getReactions(family, asset, country, currency)
 const metrics = [
  { label: "Sample size", value: String(payload.summary.sampleSize), note: payload.summary.note },
  { label: "Positive", value: String(payload.summary.directionDistribution.positive), note: "Positive windows in the filtered study set" },
  { label: "Negative", value: String(payload.summary.directionDistribution.negative), note: "Negative windows in the filtered study set" },
  { label: "Mode", value: payload.summary.freshness.mode, note: payload.summary.freshness.freshness + " / " + payload.calendar.note },
 ]
 const statRows = payload.summary.windowStats.map(function (item) { return [item.window, String(item.sampleSize), pct(item.meanMovePct), pct(item.medianMovePct), hitRate(item.positiveHitRate), hitRate(item.negativeHitRate)] })
 const recordRows = payload.records.map(function (item) { return [h(Link, { href: item.href, className: "text-sky-300 transition hover:text-sky-200" }, item.title), item.scheduledAt.replace("T", " ").slice(0, 16), item.country, item.currency, pct(item.windows.immediate), pct(item.windows["1h"]), pct(item.windows["4h"]), pct(item.windows["1d"]), pct(item.windows["5d"])] })
 const familyLinks = payload.familyOptions.slice(0, 6).map(function (item) { return h(Link, { key: item, href: "/app/live-reactions?family=" + encodeURIComponent(item), className: "ws-toolbar-chip" }, item) })
 const assetLinks = payload.assetOptions.map(function (item) { return h(Link, { key: item, href: "/app/live-reactions?asset=" + encodeURIComponent(item), className: "ws-toolbar-chip" }, item) })
 return h(PageShell, { title: "Reactions", subtitle: "Historical event-family reaction study using the live calendar and provider-backed market history where available.", active: "live-reactions", mode: payload.summary.freshness.mode === "live" ? "live" : "fallback" }, h("div", { className: "space-y-5" }, [
  h(MetricGrid, { key: "metrics", items: metrics }),
  h(Panel, { key: "filters", title: "Control deck", subtitle: "Pivot the study by event family and asset without leaving the tape." }, [
   h("div", { key: "badges", className: "flex flex-wrap gap-2" }, [h(Badge, { key: "family" }, payload.filters.family ? payload.filters.family : "All families"), h(Badge, { key: "asset", accent: true }, payload.filters.asset), h(Badge, { key: "country" }, payload.filters.country ? payload.filters.country : "All countries"), h(Badge, { key: "currency" }, payload.filters.currency ? payload.filters.currency : "All currencies")]),
   h("div", { key: "families", className: "ws-toolbar mt-4" }, [h(Link, { key: "all", href: "/app/live-reactions", className: "ws-toolbar-chip" }, "All families"), ...familyLinks]),
   h("div", { key: "assets", className: "ws-toolbar mt-3" }, assetLinks),
  ]),
  h("div", { key: "grid", className: "ws-two-panel" }, [
   h("div", { key: "left", className: "space-y-5" }, [
    h(Panel, { key: "summary", title: "Window summary", subtitle: "Only windows supportable by the current data resolution are shown." }, h(DataTable, { headers: ["Window", "Samples", "Mean", "Median", "Positive", "Negative"], rows: statRows.length !== 0 ? statRows : [["-", "0", "-", "-", "-", "-"]], dense: true, numericColumns: [1, 2, 3, 4, 5] })),
    h(Panel, { key: "records", title: "Reaction tape", subtitle: "Event-level reaction records with direct routing back to event context." }, h(DataTable, { headers: ["Event", "Scheduled", "Country", "CCY", "Immediate", "1h", "4h", "1d", "5d"], rows: recordRows.length !== 0 ? recordRows : [["No matching reactions", "-", "-", "-", "-", "-", "-", "-", "-"]], dense: true, numericColumns: [4, 5, 6, 7, 8], stickyHeader: true })),
   ]),
   h("div", { key: "right", className: "space-y-5" }, [
    h(Panel, { key: "integrity", title: "Integrity notes", subtitle: "Live and fallback states are surfaced directly in the research view." }, h(DataTable, { headers: ["Field", "Value"], rows: [["Calendar mode", payload.calendar.mode], ["Calendar freshness", payload.calendar.freshness], ["Market freshness", payload.summary.freshness.freshness], ["Study note", payload.summary.note]], dense: true })),
    h(Panel, { key: "distribution", title: "Directional distribution", subtitle: "Simple directional counts for the current study set." }, h(DataTable, { headers: ["Direction", "Count"], rows: [["Positive", String(payload.summary.directionDistribution.positive)], ["Negative", String(payload.summary.directionDistribution.negative)], ["Flat", String(payload.summary.directionDistribution.flat)]], dense: true, numericColumns: [1] })),
   ]),
  ]),
 ]))
}
