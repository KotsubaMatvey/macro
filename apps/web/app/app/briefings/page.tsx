import { createElement as h } from "react"
import type { ReactNode } from "react"
import type { Briefing, EventRelease } from "@northstar/types"

import { DataTable, EventLink, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
import { getBriefings, getEvents } from "@/lib/server/api"

export default async function BriefingsPage() {
 const items = await getBriefings()
 const events = await getEvents()
 const eventMap = new Map(events.map(function (item: EventRelease) { return [item.id, item] }))
 const linked = items.filter(function (item: Briefing) {
 if (!item.relatedEventId) return false
 return eventMap.has(item.relatedEventId)
 })
 const analysts = Array.from(new Set(items.map(function (item: Briefing) { return item.analystName })))
 const assets = Array.from(new Set(items.flatMap(function (item: Briefing) { return item.assetSymbols })))
 const metrics = [
 { label: "Published", value: String(items.length), note: "Desk notes and event intelligence available now" },
 { label: "Linked catalysts", value: String(linked.length), note: "Briefings already attached to an event route" },
 { label: "Analysts", value: String(analysts.length), note: "Distinct voices publishing into the workstation" },
 { label: "Asset coverage", value: String(assets.length), note: "Symbols referenced across the active briefing stack" },
 ]
 const analystRows: ReactNode[][] = analysts.map(function (name) {
 const posts = items.filter(function (item: Briefing) { return item.analystName === name })
 return [name, String(posts.length), posts[0] ? posts[0].kind : "-", posts[0] ? posts[0].assetSymbols.join(", ") : "-"]
 })
 const stackRows: ReactNode[][] = items.map(function (item: Briefing) {
 return [item.title, item.kind, item.analystName, item.assetSymbols.join(", ")]
 })
 return h(PageShell, { title: "Briefings", subtitle: "Desk notes that translate catalysts into assets, positioning risk, and follow-through expectations.", active: "briefings" }, h("div", { className: "space-y-5" }, [
 h(MetricGrid, { key: "metrics", items: metrics }),
 h(Panel, { key: "desk", title: "Desk note stack", subtitle: "Read these beside event detail and bias, not as isolated research notes." }, h("p", { className: "text-sm leading-6 text-slate-400" }, "Each note is kept compact, tagged by analyst and kind, and routed back to the catalyst or asset set it is trying to explain.")),
 h("div", { key: "grid", className: "ws-two-panel" }, [
 h("div", { key: "left", className: "space-y-5" }, [
 h(Panel, { key: "stack", title: "Briefing stack", subtitle: "Primary board for title, note type, lead analyst, and covered assets." }, h(DataTable, { headers: ["Title", "Type", "Analyst", "Assets"], rows: stackRows.length !== 0 ? stackRows : [["No briefing", "-", "-", "-"]], dense: true })),
 h(Panel, { key: "analysts", title: "Analyst coverage", subtitle: "Who is driving note volume and what they usually cover." }, h(DataTable, { headers: ["Analyst", "Notes", "Lead type", "Assets"], rows: analystRows.length !== 0 ? analystRows : [["No analyst", "0", "-", "-"]], dense: true })),
 ]),
 h("div", { key: "right", className: "space-y-5" }, [
 h(Panel, { key: "linked", title: "Linked catalysts", subtitle: "Briefings already paired with a macro event route." }, linked.length !== 0 ? h("div", { className: "grid gap-3" }, linked.map(function (item: Briefing) { const event = eventMap.get(item.relatedEventId ? item.relatedEventId : ""); return event ? h(EventLink, { key: item.id, eventId: event.id, slug: event.slug, title: event.title, meta: item.kind + " / " + item.analystName }) : null })) : h("div", { className: "text-sm text-slate-500" }, "No linked catalysts found.")),
 h(Panel, { key: "workflow", title: "Workflow use", subtitle: "Where these notes should be consumed next." }, h(DataTable, { headers: ["Module", "Use"], rows: [["Event detail", "Pair the note with release history and reactions before the print"], ["Market bias", "Check whether note language confirms or challenges consensus"], ["Live reactions", "Compare the note with the post-release tape after the event"]], dense: true })),
 ]),
 ]),
 ]))
}
