import { createElement as h } from "react"

export default function AppLoading() {
 return h("main", { className: "min-h-screen bg-[#05070b] px-5 py-10 text-slate-300" },
 h("div", { className: "mx-auto max-w-5xl rounded-3xl border border-white/10 bg-white/[0.02] p-6" }, [
 h("div", { key: "label", className: "text-[11px] uppercase tracking-[0.18em] text-slate-500" }, "Loading workspace"),
 h("div", { key: "title", className: "mt-4 text-2xl font-semibold text-white" }, "Rebuilding macro surfaces"),
 h("p", { key: "body", className: "mt-3 max-w-2xl text-sm leading-7 text-slate-400" }, "Fetching calendar, regime, bias, and catalyst context."),
 ])
 )
}
