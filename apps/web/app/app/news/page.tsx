/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { createElement as h } from "react"

import { DataTable, EventLink, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
import { getEvents, getNews } from "@/lib/server/api"

function timeLabel(value: string) {
 return value.replace("T", " ").slice(0, 16)
}

export default async function NewsPage() {
 const items = await getNews()
 const events = await getEvents()
 const eventMap = new Map(events.map(function (item: any) { return [item.id, item] }))
 const linked = items.filter(function (item: any) {
 if (!item.relatedEventId) return false
 return eventMap.has(item.relatedEventId)
 })
 const categories = Array.from(new Set(items.map(function (item: any) { return item.category })))
 const metrics = [
 { label: "Feed items", value: String(items.length), note: "Headlines available in the active seeded tape" },
 { label: "Linked catalysts", value: String(linked.length), note: "Items already mapped directly to an event detail route" },
 { label: "Sources", value: String(Array.from(new Set(items.map(function (item: any) { return item.source }))).length), note: "Distinct demo providers feeding the tape" },
 { label: "Categories", value: String(categories.length), note: "Topic buckets covered by the current feed" },
 ]
 const rows = items.map(function (item: any) {
 return [timeLabel(item.publishedAt), item.source, item.category, item.sentiment, item.title]
 })
 const categoryRows = categories.map(function (category) {
 return [category, String(items.filter(function (item: any) { return item.category === category }).length), linked.filter(function (item: any) { return item.category === category }).length ? "Linked" : "Context only"]
 })
 return h(PageShell, { title: "Market News", subtitle: "Headline tape connected back to the catalyst, category, and market context that matters for decision-making.", active: "news" }, h("div", { className: "space-y-5" }, [
 h(MetricGrid, { key: "metrics", items: metrics }),
 h("div", { key: "grid", className: "grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_360px]" }, [
 h("div", { key: "left", className: "space-y-5" }, [
 h(Panel, { key: "feed", title: "Live-style tape" }, h(DataTable, { headers: ["Time", "Source", "Category", "Sentiment", "Headline"], rows })),
 h(Panel, { key: "categories", title: "Category map" }, h(DataTable, { headers: ["Category", "Count", "Event linkage"], rows: categoryRows })),
 ]),
 h("div", { key: "side", className: "space-y-5" }, [
 h(Panel, { key: "linked", title: "Catalyst linkage" }, linked.length ? h("div", { className: "grid gap-3" }, linked.slice(0, 8).map(function (item: any) {
 const event = eventMap.get(item.relatedEventId)
 return h("div", { key: item.id, className: "rounded-xl border border-white/8 p-4 text-sm text-slate-300" }, [
 h("div", { key: "headline", className: "text-lg font-medium text-white" }, item.title),
 h("div", { key: "meta", className: "mt-1 text-xs uppercase tracking-[0.14em] text-slate-500" }, item.source + " / " + item.category + " / " + item.sentiment),
 h("p", { key: "summary", className: "mt-3 leading-7 text-slate-400" }, item.summary),
 h("div", { key: "link", className: "mt-4" }, h(EventLink, { eventId: event.id, slug: event.slug, title: event.title, meta: event.country + " / " + event.impact + " / " + event.status })),
 ])
 })) : h("div", { className: "text-sm text-slate-500" }, "No linked event news yet.")),
 ]),
 ]),
 ]))
}
