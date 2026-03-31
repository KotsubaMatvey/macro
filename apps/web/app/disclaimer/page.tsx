import { createElement as h } from "react"

export default function DisclaimerPage() {
 return h("main", { className: "macro-home min-h-screen px-6 py-8 text-slate-100" }, h("div", { className: "mx-auto max-w-5xl space-y-6" }, [
 h("div", { key: "hero", className: "macro-card macro-card-hero" }, [
 h("div", { key: "eyebrow", className: "macro-kicker" }, "Disclaimer"),
 h("h1", { key: "title", className: "mt-5 text-4xl font-semibold tracking-tight text-white md:text-5xl" }, "Workflow tooling, not personalized investment advice"),
 h("p", { key: "body", className: "mt-5 max-w-3xl text-base leading-7 text-slate-300" }, "Macro Access provides workflow tooling and market context for educational and operational research purposes. Demo-mode prices, states, and job outcomes remain deterministic simulation artifacts."),
 ]),
 h("div", { key: "risk", className: "macro-card macro-card-rail" }, h("p", { className: "text-sm leading-6 text-slate-300" }, "Trading and investing involve risk of loss. Users remain responsible for independent decision-making, trade execution, and risk management.")),
 ]))
}
