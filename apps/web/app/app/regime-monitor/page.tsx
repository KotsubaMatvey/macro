import Link from "next/link"
import { createElement as h } from "react"
import type { ReactNode } from "react"
import type { EventRelease, MarketBiasSnapshot, RegimeComponent } from "@northstar/types"

import { Badge, DataTable, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
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
 return [item.title, item.relatedAssets.join(", "), item.whyItMatters]
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
 h(Panel, { key: "board", title: "Regime board", subtitle: "Use the regime as a filter before trusting catalysts, bias, or reaction follow-through." }, [
 h("div", { key: "badges", className: "flex flex-wrap gap-2" }, [h(Badge, { key: "state", accent: true }, payload.regime.label), h(Badge, { key: "trend" }, payload.regime.trend), h(Badge, { key: "score" }, payload.regime.score.toFixed(2))]),
 h("div", { key: "grid", className: "mt-4 ws-kpi-inline" }, [
 h("div", { key: "method", className: "ws-kpi" }, [h("div", { key: "label", className: "text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500" }, "Method"), h("div", { key: "value", className: "mt-2 text-base font-semibold text-white" }, "Layered composite"), h("div", { key: "note", className: "mt-2 text-xs text-slate-400" }, payload.regime.methodology)]),
 h("div", { key: "macro", className: "ws-kpi" }, [h("div", { key: "label", className: "text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500" }, "Macro layer"), h("div", { key: "value", className: "mt-2 font-mono text-xl text-white" }, String(macroLayer.length)), h("div", { key: "note", className: "mt-2 text-xs text-slate-400" }, "Growth, liquidity, and inflation inputs")]),
 h("div", { key: "risk", className: "ws-kpi" }, [h("div", { key: "label", className: "text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500" }, "Risk layer"), h("div", { key: "value", className: "mt-2 font-mono text-xl text-white" }, String(riskLayer.length)), h("div", { key: "note", className: "mt-2 text-xs text-slate-400" }, "Risk appetite and tape participation inputs")]),
 h("div", { key: "stress", className: "ws-kpi" }, [h("div", { key: "label", className: "text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500" }, "Event stress"), h("div", { key: "value", className: "mt-2 font-mono text-xl text-white" }, String(eventRiskRows.length)), h("div", { key: "note", className: "mt-2 text-xs text-slate-400" }, "High-impact events still in the forward window")]),
 ]),
 ]),
 h("div", { key: "grid", className: "ws-two-panel" }, [
 h("div", { key: "left", className: "space-y-5" }, [
 h(Panel, { key: "layers", title: "Macro liquidity layer", subtitle: "Primary macro inputs driving the current regime state." }, h(DataTable, { headers: ["Macro liquidity", "Score"], rows: macroRows.length !== 0 ? macroRows : [["No macro layer", "-"]], numericColumns: [1], dense: true })),
 h(Panel, { key: "risk", title: "Risk appetite layer", subtitle: "Secondary risk-taking inputs supporting or fighting the macro layer." }, h(DataTable, { headers: ["Risk dimension", "Score"], rows: riskRows.length !== 0 ? riskRows : [["No risk layer", "-"]], numericColumns: [1], dense: true })),
 h(Panel, { key: "components", title: "Regime components", subtitle: "Full component list for desk transparency." }, h(DataTable, { headers: ["Key", "Label", "Score"], rows: componentRows, numericColumns: [2], dense: true })),
 ]),
 h("div", { key: "right", className: "space-y-5" }, [
 h(Panel, { key: "events", title: "Event risk window", subtitle: "High-impact catalysts that can still stress the regime read." }, h(DataTable, { headers: ["Event", "Assets", "Why it matters"], rows: eventRiskRows.length !== 0 ? eventRiskRows : [["No high-impact events", "-", "No catalyst stress tests are loaded right now"]], dense: true })),
 h(Panel, { key: "bias", title: "Bias fit", subtitle: "Highest-conviction bias calls measured against the current regime." }, h(DataTable, { headers: ["Asset", "Direction", "Confidence", "Regime read"], rows: biasFitRows.length !== 0 ? biasFitRows : [["No bias", "-", "-", "No bias payload returned"]], dense: true })),
 h(Panel, { key: "workflow", title: "Workflow use", subtitle: "Next surfaces that need the regime filter." }, h(DataTable, { headers: ["Module", "Use"], rows: workflowRows, dense: true })),
 ]),
 ]),
 ]))
}
