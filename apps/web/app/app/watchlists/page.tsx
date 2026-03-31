import Link from "next/link"
import { createElement as h } from "react"
import type { ReactNode } from "react"
import type { EventRelease, Watchlist } from "@northstar/types"

import { DataTable, EventLink, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
import { getEvents, getWorkstation } from "@/lib/server/api"

function nextCatalyst(symbol: string, events: EventRelease[]) {
 return events.find(function (item) {
 if (!item.relatedAssets.includes(symbol)) return false
 if (item.status === "Upcoming") return true
 return item.status === "Live"
 })
}

export default async function WatchlistsPage() {
 const payload = await getWorkstation()
 const events = await getEvents()
 const itemCount = payload.watchlists.reduce(function (total, item: Watchlist) { return total + item.itemCount }, 0)
 const alertCount = payload.watchlists.reduce(function (total, item: Watchlist) { return total + item.alertCount }, 0)
 const trackedSymbols = Array.from(new Set(payload.watchlists.flatMap(function (item: Watchlist) { return item.items.map(function (entry) { return entry.symbol }) })))
 const metrics = [
 { label: "Watchlists", value: String(payload.watchlists.length), note: "Saved baskets currently attached to the workstation" },
 { label: "Tracked items", value: String(itemCount), note: "Assets and events inside saved baskets" },
 { label: "Linked alerts", value: String(alertCount), note: "Alert load connected to these watchlists" },
 { label: "Unique symbols", value: String(trackedSymbols.length), note: "Breadth of current watchlist coverage" },
 ]
 const listRows: ReactNode[][] = payload.watchlists.map(function (item: Watchlist) {
 return [item.name, item.description, String(item.itemCount), String(item.alertCount)]
 })
 const itemRows: ReactNode[][] = payload.watchlists.flatMap(function (list: Watchlist) {
 return list.items.map(function (item) {
 const catalyst = nextCatalyst(item.symbol, events)
 return [list.name, item.symbol, item.itemType, catalyst ? h(EventLink, { eventId: catalyst.id, slug: catalyst.slug, title: catalyst.title, meta: catalyst.status + " / " + catalyst.scheduledAt.slice(0, 10) }) : "No catalyst", item.note ? item.note : "-"]
 })
 })
 const symbolRows: ReactNode[][] = trackedSymbols.map(function (symbol) {
 return [symbol, String(payload.watchlists.filter(function (list: Watchlist) { return list.items.some(function (item) { return item.symbol === symbol }) }).length) + " lists"]
 })
 const workflowRows: ReactNode[][] = [
 [h(Link, { href: "/app/alerts", className: "text-sky-300 transition hover:text-sky-200" }, "Open alerts"), "Attach trigger rules to the basket you already monitor."],
 [h(Link, { href: "/app/macro-calendar", className: "text-sky-300 transition hover:text-sky-200" }, "Open macro calendar"), "Use the saved symbols to prioritize which events matter most."],
 [h(Link, { href: "/app/news", className: "text-sky-300 transition hover:text-sky-200" }, "Open news tape"), "Track whether the headline tape is moving your watched assets."],
 ]
 return h(PageShell, { title: "Watchlists", subtitle: "Saved baskets of assets and catalysts that keep the desk focused on the right tape.", active: "watchlists" }, h("div", { className: "space-y-5" }, [
 h(MetricGrid, { key: "metrics", items: metrics }),
 h("div", { key: "grid", className: "grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_360px]" }, [
 h("div", { key: "left", className: "space-y-5" }, [
 h(Panel, { key: "lists", title: "Saved watchlists" }, h(DataTable, { headers: ["Name", "Description", "Items", "Alerts"], rows: listRows.length !== 0 ? listRows : [["No watchlists", "-", "0", "0"]] })),
 h(Panel, { key: "items", title: "Tracked symbols and events" }, h(DataTable, { headers: ["Watchlist", "Symbol", "Type", "Next catalyst", "Note"], rows: itemRows.length !== 0 ? itemRows : [["No items", "-", "-", "-", "-"]] })),
 ]),
 h("div", { key: "side", className: "space-y-5" }, [
 h(Panel, { key: "coverage", title: "Coverage map" }, h(DataTable, { headers: ["Symbol", "Presence"], rows: symbolRows.length !== 0 ? symbolRows : [["No symbols", "No current watchlist coverage"]] })),
 h(Panel, { key: "workflow", title: "Workflow use" }, h(DataTable, { headers: ["Module", "Use"], rows: workflowRows })),
 ]),
 ]),
 ]))
}
