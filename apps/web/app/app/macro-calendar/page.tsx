/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import Link from "next/link"
import { createElement as h } from "react"

import { DataTable, EventLink, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
import { getEvents, getWorkstation } from "@/lib/server/api"

function verdict(item: any) {
 if (item.actual == null) return "Pending"
 if (item.forecast == null) return "Pending"
 if (item.actual === item.forecast) return "Inline"
 return item.actual ? "Beat" : "Miss"
}

function timeLabel(value: string) {
 return value.replace("T", " ").slice(0, 16)
}

function readParam(searchParams: any, key: string) {
 const value = searchParams ? searchParams[key] : null
 if (Array.isArray(value)) return value[0]
 return value ? String(value) : ""
}

function filterEvents(events: any[], filters: any) {
 return events.filter(function (item: any) {
 if (filters.impact) {
 if (item.impact !== filters.impact) return false
 }
 if (filters.currency) {
 if (item.currency !== filters.currency) return false
 }
 if (filters.status) {
 if (item.status !== filters.status) return false
 }
 if (filters.search) {
 const needle = filters.search.toLowerCase()
 const text = [item.title, item.family, item.country, item.category].join(" ").toLowerCase()
 if (!text.includes(needle)) return false
 }
 return true
 })
}

export default async function MacroCalendarPage(props: any) {
 const events = await getEvents()
 const payload = await getWorkstation()
 const filters = {
 impact: readParam(props.searchParams, "impact"),
 currency: readParam(props.searchParams, "currency"),
 status: readParam(props.searchParams, "status"),
 search: readParam(props.searchParams, "search"),
 }
 const filtered = filterEvents(events, filters)
 const watchSymbols = Array.from(new Set(payload.watchlists.flatMap(function (list: any) { return list.items.map(function (item: any) { return item.symbol }) })))
 const currencies = Array.from(new Set(events.map(function (item: any) { return item.currency })))
 const metrics = [
 { label: "Tracked releases", value: String(events.length), note: "Calendar rows across the demo tape" },
 { label: "Filtered rows", value: String(filtered.length), note: "Rows currently matching the selected filter state" },
 { label: "High impact", value: String(events.filter(function (item: any) { return item.impact === "High" }).length), note: "Macro catalysts worth pre-positioning" },
 { label: "Watch context", value: String(watchSymbols.length), note: "Symbols already covered by user watchlists" },
 ]
 const rows = filtered.map(function (item: any) {
 return [timeLabel(item.scheduledAt), item.currency, h(EventLink, { eventId: item.id, slug: item.slug, title: item.title, meta: item.country + " / " + item.category }), String(item.actual ?? "-"), String(item.forecast ?? "-"), String(item.previous ?? "-"), verdict(item), watchSymbols.includes(item.currency) ? "Watched" : "Open"]
 })
 const focusRows = events.filter(function (item: any) { return item.impact === "High" }).slice(0, 6).map(function (item: any) {
 return [item.currency, item.title, item.status, timeLabel(item.scheduledAt)]
 })
 return h(PageShell, { title: "Macro Calendar", subtitle: "Event schedule, release context, and direct routing into the dynamic event detail surface.", active: "macro-calendar" }, h("div", { className: "space-y-5" }, [
 h(MetricGrid, { key: "metrics", items: metrics }),
 h(Panel, { key: "filters", title: "Filters" }, h("div", { className: "flex flex-wrap gap-2 text-sm text-slate-300" }, [
 h(Link, { key: "today", href: "/app/macro-calendar", className: "rounded-full border border-white/10 px-3 py-2" }, "Today"),
 h(Link, { key: "high", href: "/app/macro-calendar?impact=High", className: "rounded-full border border-white/10 px-3 py-2" }, "High impact"),
 h(Link, { key: "upcoming", href: "/app/macro-calendar?status=Upcoming", className: "rounded-full border border-white/10 px-3 py-2" }, "Upcoming"),
 currencies.slice(0, 5).map(function (currency: string) { return h(Link, { key: currency, href: "/app/macro-calendar?currency=" + currency, className: "rounded-full border border-white/10 px-3 py-2" }, currency) }),
 ])),
 h("div", { key: "grid", className: "grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_360px]" }, [
 h(Panel, { key: "table", title: "Calendar tape" }, h(DataTable, { headers: ["Time", "CCY", "Event", "Actual", "Forecast", "Previous", "Verdict", "Watch"], rows: rows.length ? rows : [["-", "-", "No events match the current filters", "-", "-", "-", "-", "-"]] })),
 h("div", { key: "side", className: "space-y-5" }, [
 h(Panel, { key: "focus", title: "High impact focus" }, h(DataTable, { headers: ["CCY", "Event", "Status", "Time"], rows: focusRows })),
 h(Panel, { key: "workflow", title: "Workflow use" }, h(DataTable, { headers: ["Module", "Use"], rows: [["Event detail", "Open any catalyst row to review archive, related news, and reaction history"], ["Alerts", "Turn the filtered calendar into scheduled reminders before the print"], ["Watchlists", "Use currency context to keep focus on symbols you already monitor"]] })),
 ]),
 ]),
 ]))
}
