import Link from "next/link"
import { createElement as h } from "react"
import type { ReactNode } from "react"
import type { EventRelease, MarketBiasSnapshot } from "@northstar/types"

import { DataTable, EventLink, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
import { getEvents, getWorkstation } from "@/lib/server/api"

function nextCatalyst(symbol: string, events: EventRelease[]) {
 return events.find(function (item) {
 if (!item.relatedAssets.includes(symbol)) return false
 if (item.status === "Upcoming") return true
 return item.status === "Live"
 })
}

function themeRowsFromBiases(biases: MarketBiasSnapshot[]) {
 const themes = biases.flatMap(function (item) { return item.rationale })
 const uniqueThemes = Array.from(new Set(themes))
 return uniqueThemes.map(function (theme) {
 const linkedAssets = biases.filter(function (item) { return item.rationale.includes(theme) }).map(function (item) { return item.symbol }).join(", ")
 return [theme, String(themes.filter(function (item) { return item === theme }).length), linkedAssets]
 })
}

export default async function MarketBiasPage() {
 const payload = await getWorkstation()
 const events = await getEvents()
 const orderedBiases = payload.biases.slice().sort(function (left, right) {
 return right.confidence - left.confidence
 })
 const bullish = orderedBiases.filter(function (item) { return item.direction === "Bullish" }).length
 const neutral = orderedBiases.filter(function (item) { return item.direction === "Neutral" }).length
 const bearish = orderedBiases.filter(function (item) { return item.direction === "Bearish" }).length
 const metrics = [
 { label: "Bullish calls", value: String(bullish), note: "Assets with constructive directional read" },
 { label: "Neutral calls", value: String(neutral), note: "Watchlist candidates waiting for stronger confirmation" },
 { label: "Bearish calls", value: String(bearish), note: "Assets with softer relative setup" },
 { label: "Tracked assets", value: String(orderedBiases.length), note: "Current demo consensus coverage" },
 ]
 const biasRows: ReactNode[][] = orderedBiases.map(function (item: MarketBiasSnapshot) {
 const catalyst = nextCatalyst(item.symbol, events)
 return [
 item.symbol,
 item.direction,
 item.score.toFixed(0),
 Math.round(item.confidence * 100) + "%",
 item.change1d.toFixed(0),
 item.change5d.toFixed(0),
 catalyst ? h(EventLink, { eventId: catalyst.id, slug: catalyst.slug, title: catalyst.title, meta: catalyst.status + " / " + catalyst.scheduledAt.slice(0, 10) }) : "No catalyst mapped",
 ]
 })
 const themeRows: ReactNode[][] = themeRowsFromBiases(orderedBiases)
 const catalystRows: ReactNode[][] = orderedBiases.slice(0, 4).map(function (item: MarketBiasSnapshot) {
 const catalyst = nextCatalyst(item.symbol, events)
 return [
 item.symbol + " / " + item.direction,
 catalyst ? h(EventLink, { eventId: catalyst.id, slug: catalyst.slug, title: catalyst.title, meta: catalyst.country + " / " + catalyst.impact }) : "No upcoming release",
 item.rationale.join(", "),
 ]
 })
 const workflowRows: ReactNode[][] = [
 [h(Link, { href: "/app/dashboard", className: "text-sky-300 transition hover:text-sky-200" }, "Open dashboard"), "Check whether the top catalyst lines up with the current consensus read."],
 [h(Link, { href: "/app/regime-monitor", className: "text-sky-300 transition hover:text-sky-200" }, "Open liquidity regime"), "Use the macro backdrop to decide whether bias should be trusted or discounted."],
 [h(Link, { href: "/app/live-reactions", className: "text-sky-300 transition hover:text-sky-200" }, "Open live reactions"), "Test whether post-event tape confirms or fades the bias."],
 ]
 const narrativeCards = orderedBiases.slice(0, 4).map(function (item: MarketBiasSnapshot) {
 const catalyst = nextCatalyst(item.symbol, events)
 return h("div", { key: item.symbol, className: "rounded-xl border border-white/8 p-4 text-sm text-slate-300" }, [
 h("div", { key: "symbol", className: "text-lg font-medium text-white" }, item.symbol + " / " + item.direction),
 h("p", { key: "body", className: "mt-2 leading-7 text-slate-400" }, item.rationale.join(". ") + "."),
 h("div", { key: "meta", className: "mt-3 text-xs uppercase tracking-[0.14em] text-slate-500" }, catalyst ? "Next catalyst: " + catalyst.title : "No linked catalyst in the current window"),
 ])
 })
 return h(PageShell, { title: "Market Bias", subtitle: "Consensus stance, recurring themes, and asset-level conviction gathered into one compact decision surface.", active: "market-bias" }, h("div", { className: "space-y-5" }, [
 h(MetricGrid, { key: "metrics", items: metrics }),
 h("div", { key: "grid", className: "grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_360px]" }, [
 h("div", { key: "left", className: "space-y-5" }, [
 h(Panel, { key: "table", title: "Per asset bias" }, h(DataTable, { headers: ["Asset", "Direction", "Score", "Confidence", "1d", "5d", "Next catalyst"], rows: biasRows })),
 h(Panel, { key: "themes", title: "Consensus themes" }, h(DataTable, { headers: ["Theme", "Mentions", "Assets"], rows: themeRows.length !== 0 ? themeRows : [["No theme", "0", "-"]] })),
 h(Panel, { key: "catalysts", title: "Catalyst linkage" }, h(DataTable, { headers: ["Bias", "Next event", "Rationale"], rows: catalystRows })),
 ]),
 h("div", { key: "side", className: "space-y-5" }, [
 h(Panel, { key: "notes", title: "Narrative stack" }, h("div", { className: "grid gap-3" }, narrativeCards)),
 h(Panel, { key: "workflow", title: "Workflow use" }, h(DataTable, { headers: ["Module", "Use"], rows: workflowRows })),
 ]),
 ]),
 ]))
}
