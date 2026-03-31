import { createElement as h } from "react"

export default function ContactPage() {
 return h("main", { className: "macro-home min-h-screen px-6 py-8 text-slate-100" }, h("div", { className: "mx-auto max-w-4xl space-y-6" }, [
 h("div", { key: "hero", className: "macro-card macro-card-hero" }, [
 h("div", { key: "eyebrow", className: "macro-kicker" }, "Contact"),
 h("h1", { key: "title", className: "mt-5 text-4xl font-semibold tracking-tight text-white md:text-5xl" }, "Operational contact and product feedback"),
 h("p", { key: "body", className: "mt-5 max-w-3xl text-base leading-7 text-slate-300" }, "Use repository issues and pull requests for product feedback, implementation questions, and demo environment problems. Admin users should route operational incidents through the workstation."),
 ]),
 h("div", { key: "scope", className: "grid gap-4" }, [
 "Platform behavior and bug reports.",
 "Data model and methodology clarification.",
 "Deployment and environment setup support.",
 ].map(function (item) { return h("div", { key: item, className: "macro-card macro-card-rail text-sm leading-6 text-slate-300" }, item) })),
 ]))
}
