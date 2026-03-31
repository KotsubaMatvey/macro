/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { createElement as h } from "react"

import { DataTable, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
import { getWorkstation } from "@/lib/server/api"

export default async function RegimeMonitorPage() {
 const payload = await getWorkstation()
 const macroKeys = ["growth", "liquidity", "inflation"]
 const macroLayer = payload.regime.components.filter(function (item: any) { return macroKeys.includes(item.key) })
 const riskLayer = payload.regime.components.filter(function (item: any) { return !macroKeys.includes(item.key) })
 const metrics = [
 { label: "State", value: payload.regime.label, note: payload.regime.trend },
 { label: "Score", value: payload.regime.score.toFixed(2), note: "Directional composite" },
 { label: "Confidence", value: Math.round(payload.regime.confidence * 100) + "%", note: "Model certainty" },
 { label: "Components", value: String(payload.regime.components.length), note: "Tracked regime dimensions" },
 ]
 const macroRows = macroLayer.map(function (item: any) { return [item.label, item.value.toFixed(2)] })
 const riskRows = riskLayer.map(function (item: any) { return [item.label, item.value.toFixed(2)] })
 const componentRows = payload.regime.components.map(function (item: any) {
 return [item.key, item.label, item.value.toFixed(2)]
 })
 return h(PageShell, { title: "Liquidity Regime", subtitle: payload.regime.interpretation, active: "regime-monitor" }, h("div", { className: "space-y-5" }, [
 h(MetricGrid, { key: "metrics", items: metrics }),
 h("div", { key: "grid", className: "grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_360px]" }, [
 h("div", { key: "left", className: "space-y-5" }, [
 h(Panel, { key: "layers", title: "Model layers" }, h(DataTable, { headers: ["Macro liquidity", "Score"], rows: macroRows.length ? macroRows : [["No macro layer", "-"]] })),
 h(Panel, { key: "risk", title: "Risk appetite layer" }, h(DataTable, { headers: ["Risk dimension", "Score"], rows: riskRows.length ? riskRows : [["No risk layer", "-"]] })),
 h(Panel, { key: "components", title: "Regime components" }, h(DataTable, { headers: ["Key", "Label", "Score"], rows: componentRows })),
 ]),
 h("div", { key: "side", className: "space-y-5" }, [
 h(Panel, { key: "method", title: "Methodology" }, h("div", { className: "space-y-3 text-sm text-slate-300" }, [
 h("p", { key: "copy", className: "leading-7 text-slate-400" }, payload.regime.methodology),
 h("div", { key: "score", className: "rounded-xl border border-white/8 p-4 text-slate-400" }, "Use the regime as a risk filter before leaning on bias, catalysts, or live reactions."),
 ])),
 h(Panel, { key: "workflow", title: "Workflow use" }, h(DataTable, { headers: ["Module", "Use"], rows: [["Dashboard", "Check whether the next catalyst sits inside a supportive or hostile backdrop"], ["Market bias", "Use the regime to decide whether consensus should be trusted or discounted"], ["Live reactions", "Higher confidence regimes usually support cleaner post-event follow-through"]] })),
 ]),
 ]),
 ]))
}
