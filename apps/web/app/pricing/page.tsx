import { createElement as h } from "react"

const tiers = [
 ["Pro", "Single operator seat", "Workstation plus alerts plus briefings plus impact lab", "Demo tier"],
 ["Team", "Desk collaboration", "Role-aware access plus admin operations plus shared context", "Demo tier"],
 ["Enterprise", "Multi-desk rollout", "Deployment controls and integration planning", "Contact"],
]

export default function PricingPage() {
 return h("main", { className: "macro-home min-h-screen px-6 py-8 text-slate-100" }, h("div", { className: "mx-auto max-w-6xl space-y-6" }, [
 h("div", { key: "hero", className: "macro-card macro-card-hero" }, [
 h("div", { key: "eyebrow", className: "macro-kicker" }, "Pricing"),
 h("h1", { key: "title", className: "mt-5 text-4xl font-semibold tracking-tight text-white md:text-6xl" }, "Serious tooling, clear scope, no packaged hype"),
 h("p", { key: "body", className: "mt-5 max-w-3xl text-base leading-7 text-slate-300" }, "Billing remains demo-backed, but the plan boundaries reflect how the workstation scales from one operator to a multi-desk rollout."),
 ]),
 h("div", { key: "tiers", className: "grid gap-4 lg:grid-cols-3" }, tiers.map(function (row) {
 return h("div", { key: row[0], className: "macro-card macro-card-rail" }, [
 h("div", { key: "name", className: "text-[11px] uppercase tracking-[0.18em] text-amber-300/80" }, row[0]),
 h("div", { key: "seat", className: "mt-4 text-2xl font-semibold text-white" }, row[1]),
 h("div", { key: "scope", className: "mt-3 text-sm leading-6 text-slate-400" }, row[2]),
 h("div", { key: "price", className: "mt-5 font-mono text-sm uppercase tracking-[0.18em] text-slate-200" }, row[3]),
 ])
 })),
 ]))
}
