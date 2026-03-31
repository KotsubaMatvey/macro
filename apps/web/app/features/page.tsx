import { createElement as h } from "react"

import Link from "next/link"

const blocks = [
 { title: "Event routing", body: "Calendar, explorer, briefings, and news surfaces route into one dynamic event detail contract." },
 { title: "Regime plus bias", body: "Transparent regime components and per-asset directional bias stay readable inside the same workstation shell." },
 { title: "Worker runtime", body: "Demo jobs refresh market state, recompute snapshots, and publish scheduled content into visible UI surfaces." },
 { title: "Role-aware UX", body: "Admin surfaces stay hidden for non-admin users and remain protected by the backend role checks." },
]

export default function FeaturesPage() {
 return h("main", { className: "macro-home min-h-screen px-6 py-8 text-slate-100" }, h("div", { className: "mx-auto max-w-6xl space-y-6" }, [
 h("section", { key: "hero", className: "macro-grid gap-6" }, [
 h("div", { key: "copy", className: "macro-card macro-card-hero" }, [
 h("div", { key: "eyebrow", className: "macro-kicker" }, "Features"),
 h("h1", { key: "title", className: "mt-5 text-4xl font-semibold tracking-tight text-white md:text-6xl" }, "Macro workstation surfaces organized around the decision stack"),
 h("p", { key: "body", className: "mt-5 max-w-3xl text-base leading-7 text-slate-300" }, "Northstar Macro is structured around event routing, regime interpretation, bias, briefings, live reactions, and operator-facing admin visibility."),
 h("div", { key: "actions", className: "mt-8 flex flex-wrap gap-3" }, [
 h(Link, { key: "app", href: "/sign-in", className: "rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[var(--accent-strong)]" }, "Open workstation"),
 h(Link, { key: "pricing", href: "/pricing", className: "rounded-full border border-white/12 bg-white/[0.04] px-5 py-3 text-sm text-white transition hover:border-white/25 hover:bg-white/[0.08]" }, "View pricing"),
 ]),
 ]),
 h("div", { key: "rail", className: "macro-card macro-card-rail" }, [
 h("div", { key: "eyebrow", className: "macro-kicker" }, "Operator lens"),
 h("div", { key: "list", className: "mt-5 grid gap-3" }, [
 "One workstation shell across all core surfaces.",
 "Dense pages designed for scanning, not browsing.",
 "Route continuity from catalyst to reaction.",
 "Demo mode remains deterministic and honest.",
 ].map(function (item) { return h("div", { key: item, className: "macro-list-row" }, item) })),
 ]),
 ]),
 h("section", { key: "grid", className: "grid gap-4 lg:grid-cols-2" }, blocks.map(function (item) {
 return h("div", { key: item.title, className: "macro-card macro-card-rail" }, [
 h("div", { key: "title", className: "text-[11px] uppercase tracking-[0.18em] text-amber-300/80" }, item.title),
 h("p", { key: "body", className: "mt-3 text-sm leading-6 text-slate-400" }, item.body),
 ])
 })),
 ]))
}
