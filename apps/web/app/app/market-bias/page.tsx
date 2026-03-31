/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { createElement as h } from "react"

import { DataTable, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
import { getWorkstation } from "@/lib/server/api"

export default async function MarketBiasPage() {
 const payload = await getWorkstation()
 const bullish = payload.biases.filter(function (item: any) { return item.direction === "Bullish" }).length
 const neutral = payload.biases.filter(function (item: any) { return item.direction === "Neutral" }).length
 const bearish = payload.biases.filter(function (item: any) { return item.direction === "Bearish" }).length
 const themes = payload.biases.flatMap(function (item: any) { return item.rationale })
 const uniqueThemes = Array.from(new Set(themes))
 const metrics = [
 { label: "Bullish calls", value: String(bullish), note: "Assets with constructive directional read" },
 { label: "Neutral calls", value: String(neutral), note: "Watchlist candidates waiting for stronger confirmation" },
 { label: "Bearish calls", value: String(bearish), note: "Assets with softer relative setup" },
 { label: "Tracked assets", value: String(payload.biases.length), note: "Current demo consensus coverage" },
 ]
 const rows = payload.biases.map(function (item: any) {
 return [item.symbol, item.direction, item.score.toFixed(0), Math.round(item.confidence * 100) + "%", item.change1d.toFixed(0), item.change5d.toFixed(0), item.rationale.join(", ")]
 })
 const themeRows = uniqueThemes.map(function (theme) {
 return [theme, String(themes.filter(function (item: any) { return item === theme }).length), payload.biases.filter(function (item: any) { return item.rationale.includes(theme) }).map(function (item: any) { return item.symbol }).join(", ")]
 })
 return h(PageShell, { title: "Market Bias", subtitle: "Consensus stance, recurring themes, and asset-level conviction gathered into one compact decision surface.", active: "market-bias" }, h("div", { className: "space-y-5" }, [
 h(MetricGrid, { key: "metrics", items: metrics }),
 h("div", { key: "grid", className: "grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_360px]" }, [
 h("div", { key: "left", className: "space-y-5" }, [
 h(Panel, { key: "table", title: "Per asset bias" }, h(DataTable, { headers: ["Asset", "Direction", "Score", "Confidence", "1d", "5d", "Themes"], rows })),
 h(Panel, { key: "themes", title: "Consensus themes" }, h(DataTable, { headers: ["Theme", "Mentions", "Assets"], rows: themeRows.length ? themeRows : [["No theme", "0", "-"]] })),
 ]),
 h("div", { key: "side", className: "space-y-5" }, [
 h(Panel, { key: "notes", title: "Narrative stack" }, h("div", { className: "grid gap-3" }, payload.biases.slice(0, 4).map(function (item: any) {
 return h("div", { key: item.symbol, className: "rounded-xl border border-white/8 p-4 text-sm text-slate-300" }, [
 h("div", { key: "symbol", className: "text-lg font-medium text-white" }, item.symbol + " / " + item.direction),
 h("p", { key: "body", className: "mt-2 leading-7 text-slate-400" }, item.rationale.join(". ") + "."),
 ])
 }))),
 h(Panel, { key: "workflow", title: "Workflow use" }, h(DataTable, { headers: ["Module", "Use"], rows: [["Dashboard", "Confirm whether the top catalyst lines up with the existing consensus read"], ["Event detail", "Check related assets before leaning on a catalyst reaction"], ["Live reactions", "Use the tape to test whether bias is being confirmed or faded"]] })),
 ]),
 ]),
 ]))
}
