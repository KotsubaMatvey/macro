import Link from "next/link"
import { createElement as h } from "react"
import type { ReactNode } from "react"
import type { EventRelease, Watchlist } from "@northstar/types"

import { DataTable, EventLink, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
import { getEvents, getWorkstation } from "@/lib/server/api"

interface CalendarSearchParams {
 impact?: string
 currency?: string
 status?: string
 search?: string
}

interface MacroCalendarPageProps {
 searchParams?: CalendarSearchParams
}

function verdict(item: EventRelease) {
 if (item.actual === undefined) return "Pending"
 if (item.forecast === undefined) return "Pending"
 if (item.surprise !== undefined) {
 const surpriseDirection = Math.sign(item.surprise)
 if (surpriseDirection === -1) return "Miss"
 if (surpriseDirection === 0) return "Inline"
 return "Beat"
 }
 const printDirection = Math.sign(item.actual - item.forecast)
 if (printDirection === -1) return "Miss"
 if (printDirection === 0) return "Inline"
 return "Beat"
}

function timeLabel(value: string) {
 return value.replace("T", " ").slice(0, 16)
}

function readParam(value: unknown) {
 if (Array.isArray(value)) return value[0]
 if (typeof value === "string") return value
 return ""
}

function filterEvents(events: EventRelease[], filters: CalendarSearchParams) {
 return events.filter(function (item: EventRelease) {
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

export default async function MacroCalendarPage(props: MacroCalendarPageProps) {
 const events = await getEvents()
 const payload = await getWorkstation()
 const searchParams = props.searchParams ? await props.searchParams : undefined
 const filters = {
 impact: readParam(searchParams ? searchParams.impact : undefined),
 currency: readParam(searchParams ? searchParams.currency : undefined),
 status: readParam(searchParams ? searchParams.status : undefined),
 search: readParam(searchParams ? searchParams.search : undefined),
 }
 const filtered = filterEvents(events, filters)
 const watchSymbols = Array.from(new Set(payload.watchlists.flatMap(function (list: Watchlist) { return list.items.map(function (item) { return item.symbol }) })))
 const currencies = Array.from(new Set(events.map(function (item: EventRelease) { return item.currency })))
 const metrics = [
 { label: "Tracked releases", value: String(events.length), note: "Calendar rows across the demo tape" },
 { label: "Filtered rows", value: String(filtered.length), note: "Rows currently matching the selected filter state" },
 { label: "High impact", value: String(events.filter(function (item: EventRelease) { return item.impact === "High" }).length), note: "Macro catalysts worth pre-positioning" },
 { label: "Watch context", value: String(watchSymbols.length), note: "Symbols already covered by user watchlists" },
 ]
 const rows: ReactNode[][] = filtered.map(function (item: EventRelease) {
 const watchedAssets = item.relatedAssets.filter(function (asset) { return watchSymbols.includes(asset) })
 return [timeLabel(item.scheduledAt), item.currency, h(EventLink, { eventId: item.id, slug: item.slug, title: item.title, meta: item.country + " / " + item.category }), String(item.actual !== undefined ? item.actual : "-"), String(item.forecast !== undefined ? item.forecast : "-"), String(item.previous !== undefined ? item.previous : "-"), verdict(item), watchedAssets.length !== 0 ? watchedAssets.join(", ") : "Open"]
 })
 const focusRows: ReactNode[][] = events.filter(function (item: EventRelease) { return item.impact === "High" }).slice(0, 6).map(function (item: EventRelease) {
 return [item.currency, item.title, item.status, timeLabel(item.scheduledAt)]
 })
 const workflowRows: ReactNode[][] = [
 [h(Link, { href: "/app/alerts", className: "text-sky-300 transition hover:text-sky-200" }, "Open alerts"), "Turn the filtered calendar into scheduled reminders before the print."],
 [h(Link, { href: "/app/watchlists", className: "text-sky-300 transition hover:text-sky-200" }, "Open watchlists"), "Use tracked baskets to focus on the rows that already matter to the desk."],
 [h(Link, { href: "/app/event-explorer", className: "text-sky-300 transition hover:text-sky-200" }, "Open event explorer"), "Move from a single row into family-level archive and surprise context."],
 ]
 return h(PageShell, { title: "Macro Calendar", subtitle: "Event schedule, release context, and direct routing into the dynamic event detail surface.", active: "macro-calendar" }, h("div", { className: "space-y-5" }, [
 h(MetricGrid, { key: "metrics", items: metrics }),
 h(Panel, { key: "filters", title: "Filters" }, h("div", { className: "flex flex-wrap gap-2 text-sm text-slate-300" }, [
 h(Link, { key: "today", href: "/app/macro-calendar", className: "rounded-full border border-white/10 px-3 py-2" }, "Today"),
 h(Link, { key: "high", href: "/app/macro-calendar?impact=High", className: "rounded-full border border-white/10 px-3 py-2" }, "High impact"),
 h(Link, { key: "upcoming", href: "/app/macro-calendar?status=Upcoming", className: "rounded-full border border-white/10 px-3 py-2" }, "Upcoming"),
 currencies.slice(0, 5).map(function (currency: string) { return h(Link, { key: currency, href: "/app/macro-calendar?currency=" + currency, className: "rounded-full border border-white/10 px-3 py-2" }, currency) }),
 ])),
 h("div", { key: "grid", className: "grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_360px]" }, [
 h(Panel, { key: "table", title: "Calendar tape" }, h(DataTable, { headers: ["Time", "CCY", "Event", "Actual", "Forecast", "Previous", "Verdict", "Watch"], rows: rows.length !== 0 ? rows : [["-", "-", "No events match the current filters", "-", "-", "-", "-", "-"]] })),
 h("div", { key: "side", className: "space-y-5" }, [
 h(Panel, { key: "focus", title: "High impact focus" }, h(DataTable, { headers: ["CCY", "Event", "Status", "Time"], rows: focusRows })),
 h(Panel, { key: "workflow", title: "Workflow use" }, h(DataTable, { headers: ["Module", "Use"], rows: workflowRows })),
 ]),
 ]),
 ]))
}
