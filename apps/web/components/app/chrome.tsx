import Link from "next/link"
import { createElement as h } from "react"
import type { ReactNode } from "react"

import { APP_NAME, APP_SECTIONS } from "@northstar/config"
import { cx, surfaces, toneClass } from "@northstar/ui"
import { getSession } from "@/lib/server/api"

type Child = ReactNode

interface BadgeProps {
 children?: Child
 accent?: boolean
}

interface PanelProps {
 title: string
 subtitle?: string
 actions?: Child
 children?: Child
 className?: string
}

interface MetricItem {
 label: string
 value: string
 note: string
}

interface DataTableProps {
 headers: string[]
 rows: Child[][]
 numericColumns?: number[]
 dense?: boolean
}

export function Badge(props: BadgeProps) {
 return h("span", { className: cx("inline-flex items-center gap-2 rounded-[10px] border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em]", props.accent ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-white/10 bg-white/[0.03] text-slate-300") }, props.children ? props.children : null)
}

export function Panel(props: PanelProps) {
 return h("section", { className: cx(surfaces.panel, props.className) }, [
 h("div", { key: "header", className: "mb-3 flex items-start justify-between gap-3 border-b border-white/6 pb-3" }, [
 h("div", { key: "copy", className: "min-w-0" }, [
 h("div", { key: "title", className: "text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500" }, props.title),
 props.subtitle ? h("div", { key: "subtitle", className: "mt-2 text-sm leading-6 text-slate-400" }, props.subtitle) : null,
 ]),
 props.actions ? h("div", { key: "actions", className: "shrink-0" }, props.actions) : null,
 ]),
 h("div", { key: "body", className: "min-w-0" }, props.children ? props.children : null),
 ])
}

export function MetricGrid(props: { items: MetricItem[] }) {
 return h("div", { className: "grid gap-3 md:grid-cols-2 2xl:grid-cols-4" }, props.items.map(function (item) {
 return h("div", { key: item.label, className: surfaces.metric }, [
 h("div", { key: "label", className: "text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500" }, item.label),
 h("div", { key: "value", className: "mt-2 font-mono text-[26px] leading-none text-white tabular-nums" }, item.value),
 h("div", { key: "note", className: "mt-2 text-[12px] leading-5 text-slate-400" }, item.note),
 ])
 }))
}

export function DataTable(props: DataTableProps) {
 const numericColumns = new Set(props.numericColumns ? props.numericColumns : [])
 const rowPadding = props.dense ? "py-2" : "py-2.5"
 return h("div", { className: "overflow-hidden rounded-[14px] border border-white/6 bg-[color:var(--panel-3)]" }, h("div", { className: "overflow-x-auto" }, h("table", { className: "min-w-full border-separate border-spacing-0 text-left text-[13px] leading-5" }, [
 h("thead", { key: "head" }, h("tr", { className: "bg-white/[0.02]" }, props.headers.map(function (header, index) {
 return h("th", { key: header + String(index), className: cx("border-b border-white/8 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500", numericColumns.has(index) ? "text-right" : "text-left") }, header)
 }))),
 h("tbody", { key: "body" }, props.rows.map(function (row, index) {
 return h("tr", { key: index, className: "group transition hover:bg-white/[0.03]" }, row.map(function (cell, cellIndex) {
 return h("td", { key: String(index) + "-" + String(cellIndex), className: cx("border-b border-white/5 px-3 align-top text-slate-200", rowPadding, numericColumns.has(cellIndex) ? "text-right font-mono tabular-nums text-slate-100" : "text-left") }, cell)
 }))
 })),
 ])))
}

export function KeyValueList(props: { items: { label: string; value: string; tone?: string }[] }) {
 return h("div", { className: "grid gap-2.5" }, props.items.map(function (item) {
 return h("div", { key: item.label, className: "flex items-center justify-between gap-4 border-b border-white/6 pb-2 text-[13px]" }, [
 h("span", { key: "label", className: "text-slate-500" }, item.label),
 h("span", { key: "value", className: cx("font-mono text-[13px] tabular-nums", item.tone ? toneClass(item.tone) : "text-white") }, item.value),
 ])
 }))
}

export function EventLink(props: { eventId: string; slug: string; title: string; meta?: string }) {
 return h(Link, { href: "/app/events/" + props.eventId, className: "group block rounded-[14px] border border-white/8 bg-white/[0.02] px-3 py-3 transition hover:border-white/16 hover:bg-white/[0.045]" }, [
 h("div", { key: "title", className: "flex items-start justify-between gap-3" }, [
 h("div", { key: "copy" }, [
 h("div", { key: "headline", className: "text-sm font-medium text-white group-hover:text-amber-200" }, props.title),
 h("div", { key: "meta", className: "mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500" }, props.meta ? props.meta : props.slug),
 ]),
 h("span", { key: "arrow", className: "mt-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-600 transition group-hover:text-slate-300" }, "Open"),
 ]),
 ])
}

export async function PageShell(props: { title: string; subtitle: string; active: string; children?: Child }) {
 const session = await getSession()
 const navItems = APP_SECTIONS.filter(function (item) { return item.adminOnly ? session.role === "admin" : true })
 return h("main", { className: surfaces.page }, h("div", { className: surfaces.shell }, [
 h("aside", { key: "sidebar", className: surfaces.sidebar }, [
 h("div", { key: "brand", className: "rounded-[16px] border border-white/8 bg-white/[0.025] px-3 py-3" }, [
 h("div", { key: "eyebrow", className: "text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-300" }, "Macro workstation"),
 h("div", { key: "name", className: "mt-2 text-xl font-semibold tracking-tight text-white" }, APP_NAME),
 h("div", { key: "tagline", className: "mt-2 text-[12px] leading-5 text-slate-400" }, "Dense event, regime, and reaction tooling for the operating desk."),
 ]),
 h("div", { key: "session", className: "mt-3 rounded-[14px] border border-white/8 bg-white/[0.02] px-3 py-3" }, [
 h("div", { key: "label", className: "text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500" }, "Active session"),
 h("div", { key: "user", className: "mt-2 text-sm font-medium text-white" }, session.name),
 h("div", { key: "meta", className: "mt-1 text-[12px] text-slate-400" }, session.email),
 h("div", { key: "badges", className: "mt-3 flex flex-wrap gap-2" }, [h(Badge, { key: "role", accent: true }, session.role), h(Badge, { key: "mode" }, "demo mode")]),
 ]),
 h("div", { key: "nav-label", className: "mt-4 px-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500" }, "Navigation"),
 h("nav", { key: "nav", className: "mt-2 grid gap-1 overflow-y-auto pr-1" }, navItems.map(function (item) {
 const active = props.active === item.slug
 return h(Link, { key: item.slug, href: "/app/" + item.slug, className: cx(surfaces.navItem, active ? surfaces.navItemActive : surfaces.navItemIdle) }, [
 h("div", { key: "title", className: "text-sm font-medium" }, item.title),
 h("div", { key: "desc", className: cx("mt-1 text-[12px] leading-5", active ? "text-slate-200" : "text-slate-500 group-hover:text-slate-400") }, item.description),
 ])
 })),
 h("div", { key: "footer", className: "mt-4 rounded-[14px] border border-white/8 bg-white/[0.02] px-3 py-3" }, [
 h("div", { key: "label", className: "text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500" }, "Desk state"),
 h("div", { key: "rows", className: "mt-3 grid gap-2 text-[12px] text-slate-400" }, [
 h("div", { key: "one", className: "flex items-center justify-between gap-3" }, [h("span", { key: "l" }, "Routing"), h("span", { key: "r", className: "font-mono text-slate-200" }, "dynamic")]),
 h("div", { key: "two", className: "flex items-center justify-between gap-3" }, [h("span", { key: "l" }, "Jobs"), h("span", { key: "r", className: "font-mono text-slate-200" }, "redis")]),
 h("div", { key: "three", className: "flex items-center justify-between gap-3" }, [h("span", { key: "l" }, "Mode"), h("span", { key: "r", className: "font-mono text-slate-200" }, "provider-ready")]),
 ]),
 ]),
 ]),
 h("div", { key: "content", className: "min-w-0 px-4 py-4 md:px-5 xl:px-6" }, [
 h("div", { key: "topbar", className: surfaces.topbar }, [
 h("div", { key: "copy", className: "min-w-0" }, [
 h("div", { key: "eyebrow", className: "text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500" }, "Workstation surface"),
 h("h1", { key: "title", className: "mt-1 text-2xl font-semibold tracking-tight text-white md:text-[30px]" }, props.title),
 h("p", { key: "subtitle", className: "mt-1 max-w-3xl text-[13px] leading-6 text-slate-400" }, props.subtitle),
 ]),
 h("div", { key: "utility", className: "flex flex-wrap items-center gap-2 xl:justify-end" }, [
 h(Badge, { key: "api" }, "backend linked"),
 h(Badge, { key: "auth" }, "role aware"),
 h(Badge, { key: "worker", accent: true }, "job driven"),
 ]),
 ]),
 props.children ? props.children : null,
 ]),
 ]))
}
