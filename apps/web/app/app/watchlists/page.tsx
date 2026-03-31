/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { createElement as h } from "react"

import { DataTable, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
import { getWorkstation } from "@/lib/server/api"

export default async function WatchlistsPage() {
 const payload = await getWorkstation()
 const itemCount = payload.watchlists.reduce(function (total: number, item: any) { return total + item.itemCount }, 0)
 const alertCount = payload.watchlists.reduce(function (total: number, item: any) { return total + item.alertCount }, 0)
 const trackedSymbols = Array.from(new Set(payload.watchlists.flatMap(function (item: any) { return item.items.map(function (entry: any) { return entry.symbol }) })))
 const metrics = [
 { label: "Watchlists", value: String(payload.watchlists.length), note: "Saved baskets currently attached to the workstation" },
 { label: "Tracked items", value: String(itemCount), note: "Assets and events inside saved baskets" },
 { label: "Linked alerts", value: String(alertCount), note: "Alert load connected to these watchlists" },
 { label: "Unique symbols", value: String(trackedSymbols.length), note: "Breadth of current watchlist coverage" },
 ]
 const listRows = payload.watchlists.map(function (item: any) {
 return [item.name, item.description, String(item.itemCount), String(item.alertCount)]
 })
 const itemRows = payload.watchlists.flatMap(function (list: any) {
 return list.items.map(function (item: any) { return [list.name, item.symbol, item.itemType, item.note ? item.note : "-"] })
 })
 const symbolRows = trackedSymbols.map(function (symbol) {
 return [symbol, String(payload.watchlists.filter(function (list: any) { return list.items.some(function (item: any) { return item.symbol === symbol }) }).length) + " lists"]
 })
 return h(PageShell, { title: "Watchlists", subtitle: "Saved baskets of assets and catalysts that keep the desk focused on the right tape.", active: "watchlists" }, h("div", { className: "space-y-5" }, [
 h(MetricGrid, { key: "metrics", items: metrics }),
 h("div", { key: "grid", className: "grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_360px]" }, [
 h("div", { key: "left", className: "space-y-5" }, [
 h(Panel, { key: "lists", title: "Saved watchlists" }, h(DataTable, { headers: ["Name", "Description", "Items", "Alerts"], rows: listRows.length ? listRows : [["No watchlists", "-", "0", "0"]] })),
 h(Panel, { key: "items", title: "Tracked symbols and events" }, h(DataTable, { headers: ["Watchlist", "Symbol", "Type", "Note"], rows: itemRows.length ? itemRows : [["No items", "-", "-", "-"]] })),
 ]),
 h("div", { key: "side", className: "space-y-5" }, [
 h(Panel, { key: "coverage", title: "Coverage map" }, h(DataTable, { headers: ["Symbol", "Presence"], rows: symbolRows.length ? symbolRows : [["No symbols", "No current watchlist coverage"]] })),
 h(Panel, { key: "workflow", title: "Workflow use" }, h(DataTable, { headers: ["Module", "Use"], rows: [["Alerts", "Attach trigger rules to the basket you already monitor"], ["Calendar", "Use the saved symbols to prioritize which events matter most"], ["News", "Track whether the headline tape is moving your watched assets"]] })),
 ]),
 ]),
 ]))
}
