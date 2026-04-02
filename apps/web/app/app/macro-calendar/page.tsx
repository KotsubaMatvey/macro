import Link from "next/link"
import { createElement as h } from "react"
import type { ReactNode } from "react"
import type { EventRelease, Watchlist } from "@macroaccess/types"

import { Badge, DataTable, EventLink, KeyValueList, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
import { getEvents, getWorkstation } from "@/lib/server/api"

interface CalendarSearchParams {
 impact?: string
 currency?: string
 status?: string
 search?: string
}

interface MacroCalendarPageProps {
 searchParams?: any
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
 const watchSymbols = Array.from(new Set((payload.watchlists ? payload.watchlists : []).flatMap(function (list: Watchlist) { return list.items.map(function (item) { return item.symbol }) })))
 const currencies = Array.from(new Set(events.map(function (item: EventRelease) { return item.currency })))
 const metrics = [
 { label: "Tracked releases", value: String(events.length), note: "Calendar rows across the demo tape" },
 { label: "Filtered rows", value: String(filtered.length), note: "Rows matching the current control deck" },
 { label: "High impact", value: String(events.filter(function (item: EventRelease) { return item.impact === "High" }).length), note: "Catalysts worth pre-positioning" },
 { label: "Watch context", value: String(watchSymbols.length), note: "Symbols already tracked by watchlists" },
 ]
 const rows: ReactNode[][] = filtered.map(function (item: EventRelease) {
 const watchedAssets = item.relatedAssets.filter(function (asset) { return watchSymbols.includes(asset) })
 return [timeLabel(item.scheduledAt), item.currency, h(EventLink, { eventId: item.id, slug: item.slug, title: item.title, meta: item.country + " / " + item.category }), item.actual !== undefined ? String(item.actual) : "-", item.forecast !== undefined ? String(item.forecast) : "-", item.previous !== undefined ? String(item.previous) : "-", verdict(item), watchedAssets.length !== 0 ? watchedAssets.join(", ") : "Open"]
 })
 const highImpact = events.filter(function (item: EventRelease) { return item.impact === "High" }).slice(0, 6)
 const workflowRows: ReactNode[][] = [
 [h(Link, { href: "/app/alerts", className: "text-sky-300 transition hover:text-sky-200" }, "Open alerts"), "Turn the filtered board into scheduled reminders before the print."],
 [h(Link, { href: "/app/watchlists", className: "text-sky-300 transition hover:text-sky-200" }, "Open watchlists"), "Use tracked baskets to focus on the rows that already matter to the desk."],
 [h(Link, { href: "/app/event-explorer", className: "text-sky-300 transition hover:text-sky-200" }, "Open event explorer"), "Move from one row into family-level archive and surprise context."],
 ]
 return h(PageShell, { title: "Macro Calendar", subtitle: "Dense event board with direct routing into the dynamic event detail surface.", active: "macro-calendar" }, h("div", { className: "space-y-5" }, [
 h(MetricGrid, { key: "metrics", items: metrics }),
 h(Panel, { key: "controls", title: "Control deck", subtitle: "Filter the tape by impact, currency, and event state without leaving the board." }, [
 h("div", { key: "toolbar", className: "ws-toolbar" }, [
 h(Link, { key: "today", href: "/app/macro-calendar", className: "ws-toolbar-chip" }, "Today"),
 h(Link, { key: "high", href: "/app/macro-calendar?impact=High", className: "ws-toolbar-chip" }, "High impact"),
 h(Link, { key: "upcoming", href: "/app/macro-calendar?status=Upcoming", className: "ws-toolbar-chip" }, "Upcoming"),
 currencies.slice(0, 6).map(function (currency: string) { return h(Link, { key: currency, href: "/app/macro-calendar?currency=" + currency, className: "ws-toolbar-chip" }, currency) }),
 ]),
 h("div", { key: "status", className: "mt-4 flex flex-wrap gap-2" }, [
 h(Badge, { key: "impact" }, filters.impact ? filters.impact : "All impact"),
 h(Badge, { key: "currency" }, filters.currency ? filters.currency : "All currencies"),
 h(Badge, { key: "status" }, filters.status ? filters.status : "All states"),
 ]),
 ]),
 h("div", { key: "grid", className: "ws-two-panel" }, [
 h("div", { key: "left", className: "space-y-5" }, [
 h(Panel, { key: "tape", title: "Calendar tape", subtitle: "Compact event board for release timing, values, verdict, and watch focus." }, h(DataTable, { headers: ["Time", "CCY", "Event", "Actual", "Forecast", "Previous", "Verdict", "Watch"], rows: rows.length !== 0 ? rows : [["-", "-", "No events match the current filters", "-", "-", "-", "-", "-"]], numericColumns: [3, 4, 5], dense: true })),
 ]),
 h("div", { key: "right", className: "space-y-5" }, [
 h(Panel, { key: "focus", title: "Desk focus", subtitle: "Quick read on the current filter state and watch overlap." }, h(KeyValueList, { items: [{ label: "Rows visible", value: String(filtered.length) }, { label: "Tracked symbols", value: String(watchSymbols.length) }, { label: "High impact rows", value: String(highImpact.length), tone: "High" }, { label: "Search", value: filters.search ? filters.search : "No search" }] })),
 h(Panel, { key: "high-board", title: "High impact board", subtitle: "The events most likely to set the tone for the session." }, highImpact.length !== 0 ? h("div", { className: "grid gap-3" }, highImpact.map(function (item: EventRelease) { return h(EventLink, { key: item.id, eventId: item.id, slug: item.slug, title: item.title, meta: item.status + " / " + timeLabel(item.scheduledAt) }) })) : h("div", { className: "text-sm text-slate-500" }, "No high-impact releases loaded.")),
 h(Panel, { key: "workflow", title: "Workflow use", subtitle: "Natural next steps after filtering the board." }, h(DataTable, { headers: ["Module", "Use"], rows: workflowRows, dense: true })),
 ]),
 ]),
 ]))
}
