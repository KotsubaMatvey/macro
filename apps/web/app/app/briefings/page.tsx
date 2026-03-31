/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { createElement as h } from "react"

import { DataTable, EventLink, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
import { getBriefings, getEvents } from "@/lib/server/api"

export default async function BriefingsPage() {
 const items = await getBriefings()
 const events = await getEvents()
 const eventMap = new Map(events.map(function (item: any) { return [item.id, item] }))
 const linked = items.filter(function (item: any) {
 if (!item.relatedEventId) return false
 return eventMap.has(item.relatedEventId)
 })
 const analysts = Array.from(new Set(items.map(function (item: any) { return item.analystName })))
 const assets = Array.from(new Set(items.flatMap(function (item: any) { return item.assetSymbols })))
 const metrics = [
 { label: "Published", value: String(items.length), note: "Desk notes and event intelligence available now" },
 { label: "Linked catalysts", value: String(linked.length), note: "Briefings already attached to a seeded event route" },
 { label: "Analysts", value: String(analysts.length), note: "Distinct voices currently publishing into the workstation" },
 { label: "Asset coverage", value: String(assets.length), note: "Symbols referenced across the active briefing stack" },
 ]
 const analystRows = analysts.map(function (name) {
 const posts = items.filter(function (item: any) { return item.analystName === name })
 return [name, String(posts.length), posts[0].kind, posts[0].assetSymbols.join(", ")]
 })
 const stackRows = items.map(function (item: any) {
 return [item.title, item.kind, item.analystName, item.assetSymbols.join(", ")]
 })
 return h(PageShell, { title: "Briefings", subtitle: "Desk notes that translate catalysts into assets, positioning risk, and follow-through expectations.", active: "briefings" }, h("div", { className: "space-y-5" }, [
 h(MetricGrid, { key: "metrics", items: metrics }),
 h("div", { key: "grid", className: "grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_360px]" }, [
 h("div", { key: "left", className: "space-y-5" }, [
 h(Panel, { key: "stack", title: "Briefing stack" }, h(DataTable, { headers: ["Title", "Type", "Analyst", "Assets"], rows: stackRows.length ? stackRows : [["No briefing", "-", "-", "-"]] })),
 h(Panel, { key: "analysts", title: "Analyst coverage" }, h(DataTable, { headers: ["Analyst", "Notes", "Lead type", "Assets"], rows: analystRows.length ? analystRows : [["No analyst", "0", "-", "-"]] })),
 ]),
 h("div", { key: "side", className: "space-y-5" }, [
 h(Panel, { key: "linked", title: "Linked catalysts" }, linked.length ? h("div", { className: "grid gap-3" }, linked.map(function (item: any) {
 const event = eventMap.get(item.relatedEventId)
 return h(EventLink, { key: item.id, eventId: event.id, slug: event.slug, title: event.title, meta: item.kind + " / " + item.analystName })
 })) : h("div", { className: "text-sm text-slate-500" }, "No linked catalysts found.")),
 h(Panel, { key: "workflow", title: "Workflow use" }, h(DataTable, { headers: ["Module", "Use"], rows: [["Event detail", "Open the linked catalyst to pair the note with release history and reactions"], ["Market bias", "Use briefing language to validate whether consensus already leans the same way"], ["Live reactions", "Check whether the note aligns with the reaction tape after the print"]] })),
 ]),
 ]),
 ]))
}
