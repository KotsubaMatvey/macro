import { createElement as h } from "react"
import type { ReactNode } from "react"
import type { EventRelease, NewsItem } from "@northstar/types"

import { Badge, DataTable, EventLink, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
import { getEvents, getNews } from "@/lib/server/api"

function timeLabel(value: string) {
 return value.replace("T", " ").slice(0, 16)
}

export default async function NewsPage() {
 const items = await getNews()
 const events = await getEvents()
 const eventMap = new Map(events.map(function (item: EventRelease) { return [item.id, item] }))
 const linked = items.filter(function (item: NewsItem) {
 if (!item.relatedEventId) return false
 return eventMap.has(item.relatedEventId)
 })
 const categories = Array.from(new Set(items.map(function (item: NewsItem) { return item.category })))
 const metrics = [
 { label: "Feed items", value: String(items.length), note: "Headlines available in the active seeded tape" },
 { label: "Linked catalysts", value: String(linked.length), note: "Items already mapped directly to an event route" },
 { label: "Sources", value: String(Array.from(new Set(items.map(function (item: NewsItem) { return item.source }))).length), note: "Distinct demo providers feeding the tape" },
 { label: "Categories", value: String(categories.length), note: "Topic buckets covered by the current feed" },
 ]
 const rows: ReactNode[][] = items.map(function (item: NewsItem) {
 return [timeLabel(item.publishedAt), item.source, item.category, item.sentiment, item.title]
 })
 const categoryRows: ReactNode[][] = categories.map(function (category) {
 return [category, String(items.filter(function (item: NewsItem) { return item.category === category }).length), linked.filter(function (item: NewsItem) { return item.category === category }).length !== 0 ? "Linked" : "Context only"]
 })
 return h(PageShell, { title: "Market News", subtitle: "Headline tape connected back to catalysts, categories, and market context.", active: "news" }, h("div", { className: "space-y-5" }, [
 h(MetricGrid, { key: "metrics", items: metrics }),
 h(Panel, { key: "status", title: "Feed state", subtitle: "Use the tape as event context, not a standalone news reader." }, [
 h("div", { key: "badges", className: "flex flex-wrap gap-2" }, [h(Badge, { key: "live", accent: true }, "Live style"), h(Badge, { key: "linked" }, String(linked.length) + " linked items"), h(Badge, { key: "cats" }, String(categories.length) + " categories")]),
 h("p", { key: "body", className: "mt-3 text-sm leading-6 text-slate-400" }, "The tape is strongest when read beside event detail, calendar, and briefings. Category context keeps the flow actionable instead of noisy."),
 ]),
 h("div", { key: "grid", className: "ws-two-panel" }, [
 h("div", { key: "left", className: "space-y-5" }, [
 h(Panel, { key: "feed", title: "News tape", subtitle: "Primary board for time, source, category, and headline." }, h(DataTable, { headers: ["Time", "Source", "Category", "Sentiment", "Headline"], rows: rows, dense: true })),
 h(Panel, { key: "categories", title: "Category map", subtitle: "Coverage depth by category and event linkage." }, h(DataTable, { headers: ["Category", "Count", "Event linkage"], rows: categoryRows, dense: true })),
 ]),
 h("div", { key: "right", className: "space-y-5" }, [
 h(Panel, { key: "linked", title: "Catalyst linkage", subtitle: "Headlines already tied directly to a macro release." }, linked.length !== 0 ? h("div", { className: "grid gap-3" }, linked.slice(0, 8).map(function (item: NewsItem) { const event = eventMap.get(item.relatedEventId ? item.relatedEventId : ""); return event ? h("div", { key: item.id, className: "ws-feed-card" }, [h("div", { key: "meta", className: "text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500" }, item.source + " / " + item.category + " / " + item.sentiment), h("div", { key: "title", className: "mt-2 text-sm font-medium text-white" }, item.title), h("p", { key: "summary", className: "mt-2 text-sm leading-6 text-slate-400" }, item.summary), h("div", { key: "link", className: "mt-4" }, h(EventLink, { eventId: event.id, slug: event.slug, title: event.title, meta: event.country + " / " + event.impact + " / " + event.status }))]) : null })) : h("div", { className: "text-sm text-slate-500" }, "No linked event news yet.")),
 ]),
 ]),
 ]))
}
