import { createElement as h } from "react"

export default function AppLoading() {
 return h("main", { className: "min-h-screen bg-[#05070b] px-5 py-10 text-slate-300" },
 h("div", { className: "mx-auto max-w-5xl rounded-[10px] border border-white/[0.07] bg-white/[0.018] p-5 shadow-[0_18px_42px_rgba(0,0,0,0.36)]" }, [
 h("div", { key: "label", className: "text-[10px] uppercase tracking-[0.2em] text-slate-500" }, "Workspace hydrate"),
 h("div", { key: "title", className: "mt-3 text-[18px] font-semibold text-white" }, "Rebuilding macro surfaces"),
 h("p", { key: "body", className: "mt-2 max-w-2xl text-[12px] leading-6 text-slate-400" }, "Loading calendar, provider, graph, and market context. Fallback and replay states remain explicit after hydrate."),
 h("div", { key: "skeleton", className: "mt-5 grid gap-2" }, [0, 1, 2, 3].map(function (item) {
  return h("div", { key: item, className: "h-9 animate-pulse rounded-[8px] border border-white/[0.045] bg-white/[0.018]" })
 })),
 ])
 )
}
