import Link from "next/link"
import { createElement as h } from "react"
import type { ReactNode } from "react"
import type { EventRelease, MarketBiasSnapshot } from "@northstar/types"

import { Badge, DataTable, EventLink, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
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
 const orderedBiases = (payload.biases ? payload.biases : []).slice().sort(function (left, right) {
 return right.confidence - left.confidence
 })
 const bullish = orderedBiases.filter(function (item) { return item.direction === "Bullish" }).length
 const neutral = orderedBiases.filter(function (item) { return item.direction === "Neutral" }).length
 const bearish = orderedBiases.filter(function (item) { return item.direction === "Bearish" }).length
 const metrics = [
 { label: "Bullish calls", value: String(bullish), note: "Assets with constructive directional read" },
 { label: "Neutral calls", value: String(neutral), note: "Watchlist candidates waiting for cleaner confirmation" },
 { label: "Bearish calls", value: String(bearish), note: "Assets with softer relative setup" },
 { label: "Tracked assets", value: String(orderedBiases.length), note: "Current consensus coverage" },
 ]
 const biasRows: ReactNode[][] = orderedBiases.map(function (item: MarketBiasSnapshot) {
 const catalyst = nextCatalyst(item.symbol, events)
 return [item.symbol, item.direction, item.score.toFixed(0), Math.round(item.confidence * 100) + "%", item.change1d.toFixed(0), item.change5d.toFixed(0), catalyst ? h(EventLink, { eventId: catalyst.id, slug: catalyst.slug, title: catalyst.title, meta: catalyst.status + " / " + catalyst.scheduledAt.slice(0, 10) }) : "No catalyst mapped"]
 })
 const themeRows: ReactNode[][] = themeRowsFromBiases(orderedBiases)
 const catalystRows: ReactNode[][] = orderedBiases.slice(0, 5).map(function (item: MarketBiasSnapshot) {
 const catalyst = nextCatalyst(item.symbol, events)
 return [item.symbol + " / " + item.direction, catalyst ? h(EventLink, { eventId: catalyst.id, slug: catalyst.slug, title: catalyst.title, meta: catalyst.country + " / " + catalyst.impact }) : "No upcoming release", item.rationale.join(", ")]
 })
 const workflowRows: ReactNode[][] = [
 [h(Link, { href: "/app/dashboard", className: "text-sky-300 transition hover:text-sky-200" }, "Open dashboard"), "Check whether the key catalyst lines up with current consensus."],
 [h(Link, { href: "/app/regime-monitor", className: "text-sky-300 transition hover:text-sky-200" }, "Open liquidity regime"), "Use the macro backdrop to decide whether bias should be trusted or discounted."],
 [h(Link, { href: "/app/live-reactions", className: "text-sky-300 transition hover:text-sky-200" }, "Open live reactions"), "Test whether post-event tape confirms or fades the bias."],
 ]
 const narrativeCards = orderedBiases.slice(0, 4).map(function (item: MarketBiasSnapshot) {
 const catalyst = nextCatalyst(item.symbol, events)
 return h("div", { key: item.symbol, className: "ws-feed-card" }, [
 h("div", { key: "meta", className: "text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500" }, item.symbol + " / " + item.className),
 h("div", { key: "title", className: "mt-2 flex flex-wrap items-center gap-2 text-sm font-medium text-white" }, [item.symbol, h(Badge, { key: "direction" }, item.direction)]),
 h("p", { key: "body", className: "mt-2 text-sm leading-6 text-slate-400" }, item.rationale.join(". ") + "."),
 h("div", { key: "meta-2", className: "mt-3 text-[11px] uppercase tracking-[0.16em] text-slate-500" }, catalyst ? "Next catalyst: " + catalyst.title : "No linked catalyst in the current window"),
 ])
 })
 return h(PageShell, { title: "Market Bias", subtitle: "Consensus stance, recurring themes, and catalyst linkage in one scanning surface.", active: "market-bias" }, h("div", { className: "space-y-5" }, [
 h(MetricGrid, { key: "metrics", items: metrics }),
 h(Panel, { key: "consensus", title: "Consensus board", subtitle: "Use the board as a quick direction map before drilling into one asset." }, [
 h("div", { key: "status", className: "flex flex-wrap gap-2" }, [h(Badge, { key: "bull", accent: true }, String(bullish) + " bullish"), h(Badge, { key: "neutral" }, String(neutral) + " neutral"), h(Badge, { key: "bear" }, String(bearish) + " bearish")]),
 h("div", { key: "grid", className: "mt-4 ws-kpi-inline" }, [
 h("div", { key: "lead-score", className: "ws-kpi" }, [h("div", { key: "label", className: "text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500" }, "Lead asset"), h("div", { key: "value", className: "mt-2 font-mono text-xl text-white" }, orderedBiases[0] ? orderedBiases[0].symbol : "-"), h("div", { key: "note", className: "mt-2 text-xs text-slate-400" }, orderedBiases[0] ? orderedBiases[0].direction + " / " + Math.round(orderedBiases[0].confidence * 100) + "% confidence" : "No lead asset")]),
 h("div", { key: "theme-count", className: "ws-kpi" }, [h("div", { key: "label", className: "text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500" }, "Themes"), h("div", { key: "value", className: "mt-2 font-mono text-xl text-white" }, String(themeRows.length)), h("div", { key: "note", className: "mt-2 text-xs text-slate-400" }, "Recurring narratives in the active consensus")]),
 h("div", { key: "catalysts", className: "ws-kpi" }, [h("div", { key: "label", className: "text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500" }, "Mapped catalysts"), h("div", { key: "value", className: "mt-2 font-mono text-xl text-white" }, String(catalystRows.length)), h("div", { key: "note", className: "mt-2 text-xs text-slate-400" }, "Assets with an event already in the forward window")]),
 h("div", { key: "regime-link", className: "ws-kpi" }, [h("div", { key: "label", className: "text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500" }, "Best use"), h("div", { key: "value", className: "mt-2 text-base font-semibold text-white" }, "Bias plus catalysts"), h("div", { key: "note", className: "mt-2 text-xs text-slate-400" }, "Run this surface with regime and event detail, not in isolation")]),
 ]),
 ]),
 h("div", { key: "grid", className: "ws-two-panel" }, [
 h("div", { key: "left", className: "space-y-5" }, [
 h(Panel, { key: "table", title: "Per asset bias", subtitle: "Primary tape for score, confidence, trend, and the next catalyst." }, h(DataTable, { headers: ["Asset", "Direction", "Score", "Confidence", "1d", "5d", "Next catalyst"], rows: biasRows, numericColumns: [2, 3, 4, 5], dense: true })),
 h(Panel, { key: "themes", title: "Consensus themes", subtitle: "Recurring themes across the current asset stack." }, h(DataTable, { headers: ["Theme", "Mentions", "Assets"], rows: themeRows.length !== 0 ? themeRows : [["No theme", "0", "-"]], dense: true })),
 ]),
 h("div", { key: "right", className: "space-y-5" }, [
 h(Panel, { key: "notes", title: "Narrative stack", subtitle: "Short reads for the highest-confidence assets." }, h("div", { className: "grid gap-3" }, narrativeCards)),
 h(Panel, { key: "catalysts", title: "Catalyst linkage", subtitle: "Bias cards paired to the nearest mapped macro release." }, h(DataTable, { headers: ["Bias", "Next event", "Rationale"], rows: catalystRows.length !== 0 ? catalystRows : [["No bias", "-", "No linked catalyst"]], dense: true })),
 h(Panel, { key: "workflow", title: "Workflow use", subtitle: "Next surfaces that turn bias into a tradeable read." }, h(DataTable, { headers: ["Module", "Use"], rows: workflowRows, dense: true })),
 ]),
 ]),
 ]))
}
