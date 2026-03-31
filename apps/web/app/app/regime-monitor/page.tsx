import Link from "next/link"
import { createElement as h } from "react"
import type { ReactNode } from "react"
import type { EventRelease, MarketBiasSnapshot, RegimeComponent } from "@northstar/types"

import { DataTable, EventLink, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
import { getEvents, getWorkstation } from "@/lib/server/api"

function alignmentRead(score: number, bias: MarketBiasSnapshot) {
 const regimeDirection = Math.sign(score)
 if (regimeDirection === 0) return "Backdrop is mixed, so bias needs cleaner catalyst confirmation."
 if (regimeDirection === 1) {
 if (bias.direction === "Bullish") return "Bias is aligned with the supportive regime backdrop."
 }
 if (regimeDirection === -1) {
 if (bias.direction === "Bearish") return "Bias is aligned with the defensive regime backdrop."
 }
 return "Bias is fighting the current regime, so conviction should stay lower."
}

export default async function RegimeMonitorPage() {
 const payload = await getWorkstation()
 const events = await getEvents()
 const macroKeys = ["growth", "liquidity", "inflation"]
 const macroLayer = payload.regime.components.filter(function (item: RegimeComponent) { return macroKeys.includes(item.key) })
 const riskLayer = payload.regime.components.filter(function (item: RegimeComponent) { return !macroKeys.includes(item.key) })
 const eventRiskRows: ReactNode[][] = events.filter(function (item: EventRelease) {
 if (item.impact !== "High") return false
 if (item.status === "Upcoming") return true
 return item.status === "Live"
 }).slice(0, 6).map(function (item: EventRelease) {
 return [h(EventLink, { eventId: item.id, slug: item.slug, title: item.title, meta: item.country + " / " + item.status }), item.relatedAssets.join(", "), item.whyItMatters]
 })
 const biasFitRows: ReactNode[][] = payload.biases.slice().sort(function (left, right) {
 return right.confidence - left.confidence
 }).slice(0, 5).map(function (item: MarketBiasSnapshot) {
 return [item.symbol, item.direction, Math.round(item.confidence * 100) + "%", alignmentRead(payload.regime.score, item)]
 })
 const metrics = [
 { label: "State", value: payload.regime.label, note: payload.regime.trend },
 { label: "Score", value: payload.regime.score.toFixed(2), note: "Directional composite" },
 { label: "Confidence", value: Math.round(payload.regime.confidence * 100) + "%", note: "Model certainty" },
 { label: "Components", value: String(payload.regime.components.length), note: "Tracked regime dimensions" },
 ]
 const macroRows: ReactNode[][] = macroLayer.map(function (item: RegimeComponent) { return [item.label, item.value.toFixed(2)] })
 const riskRows: ReactNode[][] = riskLayer.map(function (item: RegimeComponent) { return [item.label, item.value.toFixed(2)] })
 const componentRows: ReactNode[][] = payload.regime.components.map(function (item: RegimeComponent) { return [item.key, item.label, item.value.toFixed(2)] })
 const workflowRows: ReactNode[][] = [
 [h(Link, { href: "/app/dashboard", className: "text-sky-300 transition hover:text-sky-200" }, "Open dashboard"), "Check whether the next catalyst sits inside a supportive or hostile backdrop."],
 [h(Link, { href: "/app/market-bias", className: "text-sky-300 transition hover:text-sky-200" }, "Open market bias"), "Use the regime to decide whether consensus should be trusted or discounted."],
 [h(Link, { href: "/app/live-reactions", className: "text-sky-300 transition hover:text-sky-200" }, "Open live reactions"), "Higher-conviction regimes usually support cleaner post-event follow-through."],
 ]
 return h(PageShell, { title: "Liquidity Regime", subtitle: payload.regime.interpretation, active: "regime-monitor" }, h("div", { className: "space-y-5" }, [
 h(MetricGrid, { key: "metrics", items: metrics }),
 h("div", { key: "grid", className: "grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_360px]" }, [
 h("div", { key: "left", className: "space-y-5" }, [
 h(Panel, { key: "layers", title: "Model layers" }, h(DataTable, { headers: ["Macro liquidity", "Score"], rows: macroRows.length !== 0 ? macroRows : [["No macro layer", "-"]] })),
 h(Panel, { key: "risk", title: "Risk appetite layer" }, h(DataTable, { headers: ["Risk dimension", "Score"], rows: riskRows.length !== 0 ? riskRows : [["No risk layer", "-"]] })),
 h(Panel, { key: "components", title: "Regime components" }, h(DataTable, { headers: ["Key", "Label", "Score"], rows: componentRows })),
 h(Panel, { key: "events", title: "Event risk window" }, h(DataTable, { headers: ["Event", "Assets", "Why it matters"], rows: eventRiskRows.length !== 0 ? eventRiskRows : [["No high-impact events", "-", "No catalyst stress tests are loaded right now"]] })),
 h(Panel, { key: "bias", title: "Bias fit" }, h(DataTable, { headers: ["Asset", "Direction", "Confidence", "Regime read"], rows: biasFitRows })),
 ]),
 h("div", { key: "side", className: "space-y-5" }, [
 h(Panel, { key: "method", title: "Methodology" }, h("div", { className: "space-y-3 text-sm text-slate-300" }, [
 h("p", { key: "copy", className: "leading-7 text-slate-400" }, payload.regime.methodology),
 h("div", { key: "score", className: "rounded-xl border border-white/8 p-4 text-slate-400" }, "Use the regime as a risk filter before leaning on bias, catalysts, or live reactions."),
 ])),
 h(Panel, { key: "workflow", title: "Workflow use" }, h(DataTable, { headers: ["Module", "Use"], rows: workflowRows })),
 ]),
 ]),
 ]))
}
