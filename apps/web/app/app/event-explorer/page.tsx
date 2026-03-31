/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import Link from "next/link"
import { createElement as h } from "react"

import { DataTable, EventLink, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
import { getEventDetail, getEvents } from "@/lib/server/api"

function readParam(searchParams: any, key: string) {
 const value = searchParams ? searchParams[key] : null
 if (Array.isArray(value)) return value[0]
 return value ? String(value) : ""
}

function show(value: any) {
 if (value == null) return "-"
 return String(value)
}

export default async function EventExplorerPage(props: any) {
 const events = await getEvents()
 const familyMap: any = {}
 events.forEach(function (item: any) {
 if (!familyMap[item.family]) familyMap[item.family] = { family: item.family, count: 0, impact: item.impact, latest: item, assets: [] }
 familyMap[item.family].count += 1
 familyMap[item.family].latest = item
 item.relatedAssets.forEach(function (asset: string) { if (!familyMap[item.family].assets.includes(asset)) familyMap[item.family].assets.push(asset) })
 })
 const families = Object.values(familyMap) as any[]
 let selectedFamily = readParam(props.searchParams, "family")
 if (!selectedFamily) { if (families[0]) selectedFamily = families[0].family }
 const selectedEvents = events.filter(function (item: any) { return item.family === selectedFamily })
 let selectedDetail: any = null
 if (selectedEvents[0]) { try { selectedDetail = await getEventDetail(selectedEvents[0].id) } catch {} }
 let selectedLabel = selectedFamily
 if (!selectedLabel) selectedLabel = "None"
 const metrics = [
 { label: "Event families", value: String(families.length), note: "Distinct macro families in the explorer" },
 { label: "Total releases", value: String(events.length), note: "All seeded releases available for drill-down" },
 { label: "Selected family", value: selectedLabel, note: "Current family filter applied to the history table" },
 { label: "Family releases", value: String(selectedEvents.length), note: "Release count inside the current family window" },
 ]
 const familyRows = families.map(function (item: any) { return [item.family, String(item.count), item.impact, item.assets.join(", ")] })
 const historyRows = selectedEvents.map(function (item: any) {
 return [h(EventLink, { eventId: item.id, slug: item.slug, title: item.title, meta: item.country + " / " + item.status }), show(item.actual), show(item.forecast), show(item.surprise), item.relatedAssets.join(", ")]
 })
 const reactionRows = selectedDetail ? selectedDetail.historicalReactions.map(function (item: any) { return [item.window, item.avgMovePct.toFixed(2) + "%", Math.round(item.consistency * 100) + "%", item.narrative] }) : [["No archive", "-", "-", "Open a family release to load reaction context"]]
 return h(PageShell, { title: "Event Explorer", subtitle: "Family-level release coverage with history, drill-down links, and catalyst context.", active: "event-explorer" }, h("div", { className: "space-y-5" }, [
 h(MetricGrid, { key: "metrics", items: metrics }),
 h(Panel, { key: "families", title: "Family filters" }, h("div", { className: "flex flex-wrap gap-2 text-sm text-slate-300" }, families.map(function (item: any) { return h(Link, { key: item.family, href: "/app/event-explorer?family=" + encodeURIComponent(item.family), className: "rounded-full border border-white/10 px-3 py-2" }, item.family) }))),
 h("div", { key: "grid", className: "grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_360px]" }, [
 h("div", { key: "left", className: "space-y-5" }, [
 h(Panel, { key: "overview", title: "Family overview" }, h(DataTable, { headers: ["Family", "Releases", "Impact", "Assets"], rows: familyRows })),
 h(Panel, { key: "history", title: "Release history" }, h(DataTable, { headers: ["Release", "Actual", "Forecast", "Surprise", "Assets"], rows: historyRows.length ? historyRows : [["No releases", "-", "-", "-", "-"]] })),
 ]),
 h("div", { key: "side", className: "space-y-5" }, [
 h(Panel, { key: "detail", title: "Selected family reaction map" }, h(DataTable, { headers: ["Window", "Average move", "Consistency", "Narrative"], rows: reactionRows })),
 h(Panel, { key: "workflow", title: "Workflow use" }, h(DataTable, { headers: ["Module", "Use"], rows: [["Event detail", "Open a specific release to inspect archive context and linked intelligence"], ["Impact lab", "Use family history to compare reactions before leaning on a fresh print"], ["Dashboard", "Bring the same family context back into the next catalyst workflow"]] })),
 ]),
 ]),
 ]))
}
