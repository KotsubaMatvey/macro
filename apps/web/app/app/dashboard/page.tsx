import Link from "next/link"
import { createElement as h } from "react"
import type { ReactNode } from "react"
import type { DashboardAssetView, DashboardLiquidityInput, DashboardPayload, DashboardRegimeBlock, DashboardSparkPoint, EventRelease, SourceMetadata } from "@macroaccess/types"
import { buildDashboardState, buildDashboardView, compactImpactLabel, dashboardHref } from "./lib"
import type { DashboardBiasCard, DashboardQueryState, DashboardRouteSearchParams } from "./lib"
import { toneClass } from "@macroaccess/ui"
import { Badge, DataTable, PageShell, Panel } from "@/components/app/chrome"
import { getDashboard, getEvents } from "@/lib/server/api"

interface DashboardPageProps {
 searchParams?: Promise<DashboardRouteSearchParams | undefined>
}

function showPercent(value: number, digits = 2) {
 const prefix = Math.sign(value) === 1 ? "+" : ""
 return prefix + value.toFixed(digits) + "%"
}

function showSigned(value: number, digits = 1) {
 const prefix = Math.sign(value) === 1 ? "+" : ""
 return prefix + value.toFixed(digits)
}

function showValue(value: unknown) {
 if (value === undefined || value === null || value === "") return "--"
 return String(value)
}

function parseTime(value?: string) {
 if (!value) return null
 const parsed = new Date(value)
 if (Number.isNaN(parsed.getTime())) return null
 return parsed
}

function sameUtcDay(left: Date, right: Date) {
 return left.getUTCFullYear() === right.getUTCFullYear() && left.getUTCMonth() === right.getUTCMonth() && left.getUTCDate() === right.getUTCDate()
}

function formatDeskDate(value: string) {
 return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value))
}

function formatDeskTime(value: string) {
 return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }).format(new Date(value)) + " UTC"
}

function formatMonthLabel(value: string) {
 return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value)).toUpperCase()
}

function formatCatalystSlot(value: string, reference: string) {
 const scheduled = parseTime(value)
 const now = parseTime(reference)
 if (!scheduled || !now) return "UNSCHEDULED"
 const time = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }).format(scheduled)
 if (sameUtcDay(scheduled, now)) return "TODAY / " + time + " UTC"
 const tomorrow = new Date(now)
 tomorrow.setUTCDate(now.getUTCDate() + 1)
 if (sameUtcDay(scheduled, tomorrow)) return "TOMORROW / " + time + " UTC"
 const day = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(scheduled).toUpperCase()
 return day + " / " + time + " UTC"
}

function formatCalendarTime(value: string) {
 const scheduled = parseTime(value)
 if (!scheduled) return "--"
 return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }).format(scheduled).replace(",", " /")
}

function freshnessBadges(meta: SourceMetadata, extra: string[] = []) {
 return h("div", { className: "flex flex-wrap gap-1.5" }, [
 h(Badge, { key: meta.label + "-mode", accent: meta.mode === "live" || meta.freshness === "fresh" }, meta.mode),
 h(Badge, { key: meta.label + "-fresh" }, meta.freshness),
 h(Badge, { key: meta.label + "-source" }, meta.source),
].concat(extra.map(function (item) { return h(Badge, { key: meta.label + "-" + item }, item) })))
}

function miniLineChart(points: DashboardSparkPoint[], tone: string) {
 if (!points.length) return h("div", { className: "text-[11px] text-slate-500" }, "No history loaded.")
 const values = points.map(function (item) { return item.value })
 const min = Math.min.apply(null, values)
 const max = Math.max.apply(null, values)
 const width = 260
 const height = 66
 const stroke = tone === "green" ? "#41b36f" : tone === "sky" ? "#83aef8" : "#d59a3e"
 const coords = points.map(function (item, index) {
 const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width
 const spread = max === min ? 1 : max - min
 const y = height - (((item.value - min) / spread) * (height - 8)) - 4
 return x.toFixed(1) + "," + y.toFixed(1)
 }).join(" ")
 return h("svg", { viewBox: "0 0 " + String(width) + " " + String(height), className: "h-16 w-full overflow-visible" }, [
 h("polyline", { key: "shadow", fill: "none", stroke: "rgba(255,255,255,0.07)", strokeWidth: 10, strokeLinecap: "round", strokeLinejoin: "round", points: coords }),
 h("polyline", { key: "line", fill: "none", stroke: stroke, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", points: coords }),
 ])
}

function signalTile(label: string, value: string, note: string, tone?: string) {
 return h("div", { className: "macro-stat" }, [
 h("div", { key: "label", className: "text-[8px] font-semibold uppercase tracking-[0.22em] text-slate-500" }, label),
 h("div", { key: "value", className: tone ? "mt-2 ws-mono text-[22px] leading-none " + toneClass(tone) : "mt-2 ws-mono text-[22px] leading-none text-white" }, value),
 h("div", { key: "note", className: "mt-2 text-[11px] leading-5 text-slate-400" }, note),
 ])
}

function linkCard(key: string, label: string, title: string, note: string, href: string, action = "Open") {
 return h(Link, { key: key, href: href, className: "macro-section-link" }, [
 h("div", { key: "copy" }, [
 h("div", { key: "label", className: "text-[8px] font-semibold uppercase tracking-[0.22em] text-slate-500" }, label),
 h("div", { key: "title", className: "mt-1 text-sm font-medium text-white" }, title),
 h("div", { key: "note", className: "mt-1 text-[11px] text-slate-500" }, note),
 ]),
 h("div", { key: "action", className: "text-[11px] text-slate-500" }, action),
 ])
}

function regimeCard(title: string, block: DashboardRegimeBlock, href: string, tone: string) {
 return h("div", { className: "hero-summary" }, [
 h("div", { key: "head", className: "flex items-start justify-between gap-3" }, [
 h("div", { key: "copy" }, [
 h("div", { key: "eyebrow", className: "text-[8px] font-semibold uppercase tracking-[0.22em] text-slate-500" }, title),
 h("div", { key: "label", className: "mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] " + toneClass(block.label) }, block.label),
 ]),
 h(Link, { key: "link", href: href, className: "terminal-link text-[10px] font-medium uppercase tracking-[0.18em]" }, "Open"),
 ]),
 h("div", { key: "stats", className: "mt-3 flex items-end justify-between gap-3" }, [
 h("div", { key: "score", className: "ws-mono text-[28px] text-white" }, showSigned(block.score, 1)),
 h("div", { key: "meta", className: "text-right" }, [
 h("div", { key: "trend", className: "text-[10px] font-semibold uppercase tracking-[0.18em] " + toneClass(block.trend) }, block.trend),
 h("div", { key: "delta", className: "mt-1 ws-mono text-[11px] text-slate-400" }, showSigned(block.delta, 1) + " delta"),
 ]),
 ]),
 h("div", { key: "chart", className: "mt-3" }, miniLineChart(block.history, tone)),
 h("p", { key: "body", className: "mt-2 text-[12px] leading-5 text-slate-400" }, block.interpretation),
 ])
}

function biasCard(item: DashboardBiasCard) {
 return h("div", { key: item.label, className: "rounded-[12px] border border-white/[0.06] bg-white/[0.02] px-3 py-3" }, [
 h("div", { key: "label", className: "text-[8px] font-semibold uppercase tracking-[0.22em] text-slate-500" }, item.label),
 h("div", { key: "head", className: "mt-2 flex items-start justify-between gap-3" }, [
 h("div", { key: "copy" }, [
 h("div", { key: "symbol", className: "text-sm font-medium text-white" }, item.symbol),
 h("div", { key: "price", className: "mt-1 text-[11px] text-slate-500" }, item.price),
 ]),
 h("div", { key: "direction", className: "text-[10px] font-semibold uppercase tracking-[0.18em] " + toneClass(item.direction) }, item.direction),
 ]),
 h("div", { key: "meta", className: "mt-2 flex items-center justify-between text-[11px]" }, [
 h("span", { key: "confidence", className: "text-slate-500" }, "Conf " + String(item.confidence) + "%"),
 h("span", { key: "move", className: "ws-mono text-slate-100" }, showPercent(item.change30dPct)),
 ]),
 h("div", { key: "note", className: "mt-2 text-[11px] leading-5 text-slate-500" }, item.note),
 ])
}

function liquidityRow(item: DashboardLiquidityInput) {
 return h("div", { key: item.label, className: "flex items-center justify-between gap-4 border-b border-white/[0.05] pb-2 text-[11px] last:border-b-0 last:pb-0" }, [
 h("div", { key: "copy", className: "min-w-0" }, [
 h("div", { key: "label", className: "font-medium text-slate-100" }, item.label),
 h("div", { key: "detail", className: "mt-1 text-slate-500" }, item.detail),
 ]),
 h("div", { key: "value", className: "shrink-0 text-right" }, [
 h("div", { key: "print", className: "ws-mono text-[12px] text-white" }, item.value),
 h("div", { key: "tone", className: "mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] " + toneClass(item.tone) }, item.tone),
 ]),
 ])
}

function catalystDetail(item: EventRelease) {
 const pieces = ["Prev " + showValue(item.previous), "Est " + showValue(item.forecast)]
 if (item.actual !== undefined) pieces.push("Act " + showValue(item.actual))
 return pieces.join(" / ")
}

function catalystCard(item: EventRelease, reference: string) {
 return h(Link, { key: item.id, href: "/app/events/" + item.id, className: "macro-list-row" }, [
 h("div", { key: "row", className: "flex items-start justify-between gap-4" }, [
 h("div", { key: "copy", className: "min-w-0" }, [
 h("div", { key: "slot", className: "text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500" }, formatCatalystSlot(item.scheduledAt, reference)),
 h("div", { key: "title", className: "mt-2 text-sm font-medium text-white" }, item.title),
 h("div", { key: "meta", className: "mt-1 text-[11px] text-slate-500" }, item.country + " / " + item.currency + " / " + item.category),
 h("div", { key: "detail", className: "mt-2 text-[12px] leading-5 text-slate-400" }, catalystDetail(item)),
 ]),
 h("div", { key: "impact", className: "shrink-0 text-right" }, [
 h("div", { key: "tone", className: "text-[10px] font-semibold uppercase tracking-[0.18em] " + toneClass(item.impact) }, compactImpactLabel(item.impact)),
 h("div", { key: "status", className: "mt-2 text-[11px] text-slate-500" }, item.status),
 ]),
 ]),
 ])
}

function marketCard(item: DashboardAssetView, state: DashboardQueryState) {
 return h(Link, { key: item.symbol, href: dashboardHref(state, { asset: item.symbol }), className: "macro-list-row min-w-[164px]" }, [
 h("div", { key: "row", className: "flex items-start justify-between gap-3" }, [
 h("div", { key: "copy" }, [
 h("div", { key: "symbol", className: "text-[8px] font-semibold uppercase tracking-[0.22em] text-slate-500" }, item.symbol),
 h("div", { key: "price", className: "mt-2 ws-mono text-[17px] text-white" }, item.price),
 h("div", { key: "title", className: "mt-2 text-[11px] text-slate-500" }, item.title),
 ]),
 h("div", { key: "side", className: "text-right" }, [
 h("div", { key: "stance", className: "text-[10px] font-semibold uppercase tracking-[0.18em] " + toneClass(item.stance) }, item.stance),
 h("div", { key: "move", className: "mt-2 ws-mono text-[11px] text-slate-100" }, showPercent(item.change1dPct)),
 ]),
 ]),
 h("div", { key: "meta", className: "mt-3 flex items-center justify-between text-[11px]" }, [
 h("span", { key: "thirty", className: "text-slate-500" }, "30d " + showPercent(item.change30dPct)),
 h("span", { key: "fresh", className: "text-slate-500" }, item.freshness.mode + " / " + item.freshness.freshness),
 ]),
 ])
}

function calendarRow(item: EventRelease) {
 return [
 formatCalendarTime(item.scheduledAt),
 item.currency + " / " + item.country,
 h("div", { key: item.id, className: "min-w-[240px]" }, [
 h(Link, { key: "link", href: "/app/events/" + item.id, className: "terminal-link text-sm font-medium" }, item.title),
 h("div", { key: "meta", className: "mt-1 text-[11px] text-slate-500" }, item.category + " / " + item.status + (item.relatedAssets.length !== 0 ? " / " + item.relatedAssets.join(", ") : "")),
 ]),
 h("span", { key: item.id + "-impact", className: "text-[10px] font-semibold uppercase tracking-[0.18em] " + toneClass(item.impact) }, compactImpactLabel(item.impact)),
 showValue(item.actual),
 showValue(item.forecast),
 showValue(item.previous),
 ]
}

function calendarItemMode(item: EventRelease) {
 const mode = item.freshness ? item.freshness.mode : "fallback"
 if (mode === "live") return mode
 if (mode === "demo") return mode
 return "fallback"
}

function calendarBoardMode(events: EventRelease[]) {
 const live = events.filter(function (item) { return calendarItemMode(item) === "live" }).length
 const demo = events.filter(function (item) { return calendarItemMode(item) === "demo" }).length
 const fallback = events.filter(function (item) { return calendarItemMode(item) === "fallback" }).length
 const activeModes = [live, demo, fallback].filter(function (value) { return value !== 0 }).length
 if (activeModes === 0) return "fallback"
 if (activeModes !== 1) return "mixed"
 if (live !== 0) return "live"
 if (demo !== 0) return "demo"
 return "fallback"
}

export default async function DashboardPage(props: DashboardPageProps) {
 const params = props.searchParams ? await props.searchParams : undefined
 const payload = await getDashboard()
 const view = buildDashboardView(payload, await getEvents(), buildDashboardState(params))
 const {
  activeAsset,
  alertLead,
  availableCategories,
  availableRegions,
  biasCards,
  briefingLead,
  newsLead,
  catalysts,
  highVisible,
  liquidityInputs,
  marketAssets,
  marketFallback,
  marketLive,
  providers,
  state,
  trackValue,
  upcomingVisible,
  calendarDataset,
  visibleCalendar,
 } = view
 const shellMode = providers.live !== 0 ? providers.fallback === 0 ? "live" : "mixed" : "fallback"
 const datasetCalendarLive = calendarDataset.filter(function (item) { return calendarItemMode(item) === "live" }).length
 const datasetCalendarDemo = calendarDataset.filter(function (item) { return calendarItemMode(item) === "demo" }).length
 const datasetCalendarFallback = calendarDataset.filter(function (item) { return calendarItemMode(item) === "fallback" }).length
 const viewCalendarLive = visibleCalendar.filter(function (item) { return calendarItemMode(item) === "live" }).length
 const viewCalendarDemo = visibleCalendar.filter(function (item) { return calendarItemMode(item) === "demo" }).length
 const viewCalendarFallback = visibleCalendar.filter(function (item) { return calendarItemMode(item) === "fallback" }).length
 const datasetCalendarMode = calendarBoardMode(calendarDataset)
 const viewCalendarMode = calendarBoardMode(visibleCalendar)
 const calendarRows: ReactNode[][] = visibleCalendar.length !== 0 ? visibleCalendar.map(calendarRow) : [["--", "--", "No events match the current dashboard filters", "--", "--", "--", "--"]]
    return h(PageShell, { title: "Dashboard", subtitle: "Command board surface with prioritized macro state, catalysts, and tape-level integrity context.", active: "dashboard", mode: shellMode }, h("div", { className: "space-y-4" }, [
 h("section", { key: "context", className: "grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto]" }, [
 h("div", { key: "desk", className: "terminal-strip flex-wrap gap-2" }, [
 h("span", { key: "date", className: "terminal-meta" }, ["Date ", h("strong", { key: "value" }, formatDeskDate(payload.generatedAt))]),
 h("span", { key: "utc", className: "terminal-meta" }, ["UTC ", h("strong", { key: "value" }, formatDeskTime(payload.generatedAt).replace(" UTC", ""))]),
 h("span", { key: "session", className: "terminal-meta" }, ["Session ", h("strong", { key: "value" }, payload.utility.activeSession)]),
 ]),
 h("div", { key: "status", className: "terminal-strip justify-end" }, payload.utility.sessions.map(function (session) {
 return h("div", { key: session.code, className: session.active ? "session-dot session-dot-active text-[10px] font-semibold uppercase tracking-[0.18em]" : "session-dot text-[10px] font-semibold uppercase tracking-[0.18em]" }, session.code)
 }).concat([
 h("span", { key: "providers", className: "terminal-meta" }, ["Providers ", h("strong", { key: "value" }, String(providers.live) + " live / " + String(providers.fallback) + " fallback")]),
 h("span", { key: "refresh", className: "terminal-meta" }, ["Refresh ", h("strong", { key: "value" }, formatDeskTime(payload.utility.refreshedAt).replace(" UTC", ""))]),
 ])),
 ]),
 h("div", { key: "workspace", className: "space-y-3" }, [
 h("div", { key: "panels", className: "space-y-3" }, [
 h("div", { key: "boards", className: "grid gap-3 xl:grid-cols-[minmax(0,1.22fr)_minmax(360px,0.78fr)]" }, [
 h("div", { key: "regime-wrap", id: "regime-board" }, h(Panel, { title: "Regime & Bias", subtitle: "Current macro state, cross-asset posture, liquidity layers, and regime memory in one command board.", level: "command", actions: h(Link, { href: payload.marketConsensus.href, className: "terminal-link text-[11px] font-medium" }, "Open bias board") }, h("div", { className: "space-y-4" }, [
 h("div", { key: "freshness", className: "grid gap-2 md:grid-cols-2" }, [
 h("div", { key: "risk" }, freshnessBadges(payload.riskRegime.freshness, [payload.riskRegime.label, payload.riskRegime.trend])),
 h("div", { key: "liq" }, freshnessBadges(payload.liquidityRegime.freshness, [payload.liquidityRegime.label, payload.liquidityRegime.trend])),
 ]),
 h("div", { key: "grid", className: "grid gap-3 2xl:grid-cols-[minmax(0,1.08fr)_320px]" }, [
 h("div", { key: "left", className: "space-y-3" }, [
 h("div", { key: "regimes", className: "grid gap-3 md:grid-cols-2" }, [
 regimeCard("Current regime", payload.riskRegime, "/app/regime-monitor", Math.sign(payload.riskRegime.score) === 1 ? "green" : "sky"),
 regimeCard("Liquidity state", payload.liquidityRegime, "/app/regime-monitor", Math.sign(payload.liquidityRegime.score) === 1 ? "green" : "amber"),
 ]),
 h("div", { key: "biases", className: "grid gap-2 md:grid-cols-2" }, biasCards.map(function (item) { return biasCard(item) })),
 ]),
 h("div", { key: "right", className: "space-y-3" }, [
 h("div", { key: "memory", className: "hero-summary" }, [
 h("div", { key: "head", className: "flex items-center justify-between gap-3" }, [
 h("div", { key: "label", className: "text-[8px] font-semibold uppercase tracking-[0.22em] text-slate-500" }, "Regime memory"),
 h("div", { key: "context", className: "text-[10px] uppercase tracking-[0.16em] text-slate-500" }, "30D history"),
 ]),
 h("div", { key: "charts", className: "mt-3 grid gap-3" }, [
 h("div", { key: "risk" }, [
 h("div", { key: "meta", className: "mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-slate-500" }, [h("span", { key: "label" }, "Risk"), h("span", { key: "value", className: toneClass(payload.riskRegime.label) }, payload.riskRegime.label)]),
 miniLineChart(payload.riskRegime.history, Math.sign(payload.riskRegime.score) === 1 ? "green" : "sky"),
 ]),
 h("div", { key: "liq" }, [
 h("div", { key: "meta", className: "mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-slate-500" }, [h("span", { key: "label" }, "Liquidity"), h("span", { key: "value", className: toneClass(payload.liquidityRegime.label) }, payload.liquidityRegime.label)]),
 miniLineChart(payload.liquidityRegime.history, Math.sign(payload.liquidityRegime.score) === 1 ? "green" : "amber"),
 ]),
 ]),
 h("div", { key: "drivers", className: "mt-3 grid gap-2 text-[11px] text-slate-500" }, payload.riskRegime.drivers.slice(0, 2).concat(payload.liquidityRegime.drivers.slice(0, 1)).map(function (item) { return h("div", { key: item }, item) })),
 ]),
 h("div", { key: "layers", className: "hero-summary" }, [
 h("div", { key: "head", className: "flex items-center justify-between gap-3" }, [
 h("div", { key: "label", className: "text-[8px] font-semibold uppercase tracking-[0.22em] text-slate-500" }, "Liquidity layers"),
 h("div", { key: "context", className: "text-[10px] uppercase tracking-[0.16em] text-slate-500" }, "Inputs"),
 ]),
 h("div", { key: "rows", className: "mt-3 grid gap-2" }, liquidityInputs.map(function (item) { return liquidityRow(item) })),
 ]),
 ]),
 ]),
 h("div", { key: "footer", className: "grid gap-2 md:grid-cols-4" }, [
 signalTile("Consensus", payload.marketConsensus.label, String(Math.round(payload.marketConsensus.confidence * 100)) + "% confidence / " + String(payload.marketConsensus.sampleSize) + " assets"),
 signalTile("Track record", trackValue, String(payload.trackRecord.sampleSize) + " replays / " + payload.trackRecord.evaluationMode),
 linkCard("active-tape", "Active tape", activeAsset ? activeAsset.symbol : "No asset", activeAsset ? activeAsset.price + " / 5d edge " + showPercent(activeAsset.expectedMove5dPct) : "No market print", dashboardHref(state, { asset: activeAsset ? activeAsset.symbol : undefined }), "Focus"),
 ]),
 ]))),
 h("div", { key: "catalyst-wrap", id: "catalyst-board" }, h(Panel, { title: "Next Catalysts", subtitle: "Upcoming macro releases prioritized for immediate desk action across 48H or 1W windows.", level: "command", actions: h(Link, { href: "/app/event-explorer", className: "terminal-link text-[11px] font-medium" }, "Open event explorer") }, h("div", { className: "space-y-4" }, [
 h("div", { key: "toolbar", className: "flex flex-wrap items-center justify-between gap-2" }, [
 freshnessBadges(payload.keyCatalyst.freshness, [state.window === "1w" ? "1W" : "48H", "desk map"]),
 h("div", { key: "window", className: "flex flex-wrap gap-2" }, [
 h(Link, { key: "48h", href: dashboardHref(state, { window: "48h" }), className: state.window === "48h" ? "desk-tab desk-tab-active" : "desk-tab" }, "48H"),
 h(Link, { key: "1w", href: dashboardHref(state, { window: "1w" }), className: state.window === "1w" ? "desk-tab desk-tab-active" : "desk-tab" }, "1W"),
 ]),
 ]),
 h("div", { key: "lead", className: "hero-summary" }, [
 h("div", { key: "head", className: "flex items-start justify-between gap-4" }, [
 h("div", { key: "copy" }, [
 h("div", { key: "label", className: "text-[8px] font-semibold uppercase tracking-[0.22em] text-slate-500" }, "Key catalyst"),
 h("div", { key: "title", className: "mt-2 text-sm font-medium text-white" }, payload.keyCatalyst.title),
 h("div", { key: "meta", className: "mt-1 text-[11px] text-slate-500" }, payload.keyCatalyst.country + " / " + payload.keyCatalyst.currency + " / " + compactImpactLabel(payload.keyCatalyst.impact)),
 ]),
 h("div", { key: "countdown", className: "text-right" }, [
 h("div", { key: "label", className: "text-[10px] font-semibold uppercase tracking-[0.18em] " + toneClass(payload.keyCatalyst.impact) }, compactImpactLabel(payload.keyCatalyst.impact)),
 h("div", { key: "value", className: "mt-2 ws-mono text-[20px] text-white" }, payload.keyCatalyst.countdownLabel),
 ]),
 ]),
 h("div", { key: "detail", className: "mt-3 grid gap-2 md:grid-cols-2" }, [
 signalTile("Threshold", payload.keyCatalyst.threshold, payload.keyCatalyst.sensitivity),
 signalTile("Desk note", payload.keyCatalyst.relatedAssets.join(", "), payload.keyCatalyst.whyItMatters),
 ]),
 ]),
 h("div", { key: "rows", className: "grid gap-2" }, catalysts.map(function (item) { return catalystCard(item, payload.generatedAt) })),
 h("div", { key: "footer", className: "grid gap-2 md:grid-cols-4" }, [
 signalTile("Window", state.window === "1w" ? "1W" : "48H", String(catalysts.length) + " catalysts in view"),
 briefingLead ? linkCard("briefing", "Briefing", briefingLead.title, briefingLead.subtitle + " / " + briefingLead.mode, briefingLead.href) : signalTile("Briefing", "Pending", "No linked briefing loaded"),
 newsLead ? linkCard("news", "News", newsLead.title, newsLead.subtitle + " / " + newsLead.mode, newsLead.href) : signalTile("News", "Pending", "No ranked news item loaded"),
 alertLead ? linkCard("alert", "Alert", alertLead.title, alertLead.subtitle + " / " + alertLead.mode, alertLead.href) : signalTile("Alert", "Pending", "No live alert attached"),
 ]),
 ]))),
 ]),
 h("div", { key: "calendar-wrap", id: "calendar-board" }, h(Panel, { level: "command", title: "Macro Calendar -- " + formatMonthLabel(payload.generatedAt), subtitle: "Terminal calendar surface with dense event rows, impact filters, and direct drill-down into event detail.", actions: h(Link, { href: "/app/macro-calendar", className: "terminal-link text-[11px] font-medium" }, "Open full calendar") }, h("div", { className: "space-y-4" }, [
 h("div", { key: "toolbar", className: "flex flex-wrap items-center justify-between gap-2" }, [
 h("div", { key: "filters", className: "grid gap-2" }, [
 h("div", { key: "impact", className: "flex flex-wrap gap-2" }, IMPACT_OPTIONS.map(function (option) { return h(Link, { key: option.value, href: dashboardHref(state, { impact: option.value }), className: state.impact === option.value ? "desk-tab desk-tab-active" : "desk-tab" }, option.label) })),
 h("div", { key: "region", className: "flex flex-wrap items-center gap-2" }, ([h("span", { key: "label", className: "text-[8px] font-semibold uppercase tracking-[0.22em] text-slate-500" }, "Region")] as ReactNode[]).concat([h(Link, { key: "all", href: dashboardHref(state, { region: undefined }), className: state.region === "" ? "desk-tab desk-tab-active" : "desk-tab" }, "All")]).concat(availableRegions.map(function (option) { return h(Link, { key: option, href: dashboardHref(state, { region: option }), className: state.region === option ? "desk-tab desk-tab-active" : "desk-tab" }, option) }))),
 h("div", { key: "category", className: "flex flex-wrap items-center gap-2" }, ([h("span", { key: "label", className: "text-[8px] font-semibold uppercase tracking-[0.22em] text-slate-500" }, "Category")] as ReactNode[]).concat([h(Link, { key: "all", href: dashboardHref(state, { category: undefined }), className: state.category === "" ? "desk-tab desk-tab-active" : "desk-tab" }, "All")]).concat(availableCategories.slice(0, 4).map(function (option) { return h(Link, { key: option, href: dashboardHref(state, { category: option }), className: state.category === option ? "desk-tab desk-tab-active" : "desk-tab" }, option) }))),
]),
 h("div", { key: "stats", className: "flex flex-wrap gap-2" }, [
 h("span", { key: "high", className: "terminal-meta" }, ["High ", h("strong", { key: "value" }, String(highVisible))]),
 h("span", { key: "upcoming", className: "terminal-meta" }, ["Upcoming ", h("strong", { key: "value" }, String(upcomingVisible))]),
 h("span", { key: "calendar-dataset", className: "terminal-meta" }, ["Dataset ", h("strong", { key: "value" }, datasetCalendarMode + " (" + String(datasetCalendarLive) + "/" + String(datasetCalendarDemo) + "/" + String(datasetCalendarFallback) + ")")]),
 h("span", { key: "calendar-view", className: "terminal-meta" }, ["View ", h("strong", { key: "value" }, viewCalendarMode + " (" + String(viewCalendarLive) + "/" + String(viewCalendarDemo) + "/" + String(viewCalendarFallback) + ")")]),
 ]),
 ]),
 h(DataTable, { headers: ["Time", "Region", "Event", "Impact", "Actual", "Forecast", "Previous"], rows: calendarRows, dense: true, numericColumns: [4, 5, 6], stickyHeader: true, ariaLabel: "Dashboard macro calendar" }),
 h("div", { key: "footer", className: "grid gap-2 md:grid-cols-4" }, [
 signalTile("Filter", state.impact === "all" ? "All impact" : compactImpactLabel(state.impact), String(visibleCalendar.length) + " rows loaded"),
 signalTile("Catalyst map", String(catalysts.length), "Next board remains synced with desk window"),
 linkCard("calendar-focus", "Focus asset", activeAsset ? activeAsset.symbol : "No asset", activeAsset ? activeAsset.regimeContext : "No market context loaded", dashboardHref(state, { asset: activeAsset ? activeAsset.symbol : undefined }), "Focus"),
 ]),
 ]))),
 h("div", { key: "market-wrap", id: "market-board" }, h(Panel, { title: "Market strip", subtitle: "Cross-asset context tape with explicit live, demo, and fallback freshness states.", level: "context", actions: h(Link, { href: "/app/market-bias", className: "terminal-link text-[11px] font-medium" }, "Open market bias") }, h("div", { className: "space-y-4" }, [
 h("div", { key: "toolbar", className: "flex flex-wrap items-center justify-between gap-2" }, [
 activeAsset ? freshnessBadges(activeAsset.freshness, [activeAsset.symbol, activeAsset.stance]) : freshnessBadges(payload.marketConsensus.freshness, [payload.marketConsensus.label]),
 h("div", { key: "stats", className: "flex flex-wrap gap-2" }, [
 h("span", { key: "live", className: "terminal-meta" }, ["Live ", h("strong", { key: "value" }, String(marketLive))]),
 h("span", { key: "fallback", className: "terminal-meta" }, ["Fallback ", h("strong", { key: "value" }, String(marketFallback))]),
 h("span", { key: "refresh", className: "terminal-meta" }, ["Desk ", h("strong", { key: "value" }, formatDeskTime(payload.utility.refreshedAt).replace(" UTC", ""))]),
 ]),
 ]),
 h("div", { key: "strip", className: "flex gap-2 overflow-x-auto pb-1" }, marketAssets.map(function (item) { return marketCard(item, state) })),
 h("div", { key: "footer", className: "grid gap-2 md:grid-cols-4" }, [
 signalTile("Hero source", payload.hero.sourceNote, payload.hero.modelNote),
 signalTile("Consensus", payload.marketConsensus.label, payload.marketConsensus.note),
 linkCard("event-link", "Key event", payload.keyCatalyst.title, payload.keyCatalyst.threshold, payload.keyCatalyst.href, "Open"),
 ]),
 ]))),
 ]),
 ]),
 ]))
}

const IMPACT_OPTIONS = [
 { label: "All", value: "all" },
 { label: "High", value: "High" },
 { label: "Med", value: "Medium" },
 { label: "Low", value: "Low" },
]








