import { createElement as h } from "react"

export default function AboutPage() {
 return h("main", { className: "macro-home min-h-screen px-6 py-8 text-slate-100" }, h("div", { className: "mx-auto max-w-5xl space-y-6" }, [
 h("div", { key: "hero", className: "macro-card macro-card-hero" }, [
 h("div", { key: "eyebrow", className: "macro-kicker" }, "About"),
 h("h1", { key: "title", className: "mt-5 text-4xl font-semibold tracking-tight text-white md:text-6xl" }, "Northstar Macro"),
 h("p", { key: "body", className: "mt-5 max-w-3xl text-base leading-7 text-slate-300" }, "Built as a premium macro intelligence workstation for event-driven traders who need dense, actionable context without switching between disconnected tools."),
 ]),
 h("div", { key: "principles", className: "grid gap-4 md:grid-cols-3" }, [
 "Transparent methodology over black-box claims.",
 "Operator-first workflows over feed noise.",
 "Deterministic demo mode over fake live data marketing.",
 ].map(function (item) { return h("div", { key: item, className: "macro-card macro-card-rail text-sm leading-6 text-slate-300" }, item) })),
 ]))
}
