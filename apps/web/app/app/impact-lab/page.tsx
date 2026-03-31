import { createElement as h } from "react"

import { DataTable, EventLink, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
import { getEventDetail, getEvents } from "@/lib/server/api"

export default async function ImpactLabPage() {
 const events = await getEvents()
 const selected = events.slice(0, 4)
 const details = await Promise.all(selected.map(function (item: any) { return getEventDetail(item.id) }))
 const rows = details.flatMap(function (event: any) {
 return event.historicalReactions.map(function (item: any) { return [event.family, event.title, item.window, item.avgMovePct.toFixed(2) + "%", Math.round(item.consistency * 100) + "%", item.narrative] })
 })
 const metrics = [
 { label: "Tracked releases", value: String(selected.length), note: "Seeded catalysts currently loaded into the lab" },
 { label: "Reaction rows", value: String(rows.length), note: "Historical windows available for comparison work" },
 { label: "Families", value: String(Array.from(new Set(selected.map(function (item: any) { return item.family }))).length), note: "Event families represented in the current slice" },
 { label: "Assets", value: String(Array.from(new Set(selected.flatMap(function (item: any) { return item.relatedAssets }))).length), note: "Asset touchpoints linked to the selected catalysts" },
 ]
 return h(PageShell, { title: "Impact Lab", subtitle: "Historical reaction reading across multiple catalysts, with family context and event drill-downs.", active: "impact-lab" }, h("div", { className: "space-y-5" }, [
 h(MetricGrid, { key: "metrics", items: metrics }),
 h("div", { key: "grid", className: "grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_360px]" }, [
 h("div", { key: "left", className: "space-y-5" }, [
 h(Panel, { key: "windows", title: "Historical reaction windows" }, h(DataTable, { headers: ["Family", "Release", "Window", "Average move", "Consistency", "Narrative"], rows: rows })),
 ]),
 h("div", { key: "side", className: "space-y-5" }, [
 h(Panel, { key: "events", title: "Tracked events" }, h("div", { className: "grid gap-3" }, selected.map(function (item: any) { return h(EventLink, { key: item.id, eventId: item.id, slug: item.slug, title: item.title, meta: item.family + " / " + item.status }) }))),
 h(Panel, { key: "workflow", title: "Workflow use" }, h(DataTable, { headers: ["Module", "Use"], rows: [["Event explorer", "Move from family history into release-by-release comparison"], ["Event detail", "Open the catalyst with the strongest archive context for deeper review"], ["Live reactions", "Compare the current tape against the historical baseline before acting"]] })),
 ]),
 ]),
 ]))
}
