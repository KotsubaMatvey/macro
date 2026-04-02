import Link from "next/link"
import { createElement as h } from "react"
import type { ReactNode } from "react"
import type { DashboardLiquidityInput, DashboardPayload, DashboardRegimeBlock, DashboardSparkPoint, EventRelease, SourceMetadata } from "@macroaccess/types"
import { toneClass } from "@macroaccess/ui"
import { Badge, DataTable, PageShell, Panel } from "@/components/app/chrome"
import { getDashboard, getEvents } from "@/lib/server/api"

type WindowMode = string
type ImpactFilter = string

const MODULE_LINKS = [
 { label: "Dashboard", href: "/app/dashboard" },
 { label: "Calendar", href: "/app/macro-calendar" },
 { label: "Regime", href: "/app/regime-monitor" },
 { label: "Bias", href: "/app/market-bias" },
 { label: "Reactions", href: "/app/live-reactions" },
 { label: "Alerts", href: "/app/alerts" },
]

const BOARD_RAIL = [
 { id: "regime-board", short: "RG", label: "Regime", note: "State" },
 { id: "catalyst-board", short: "CT", label: "Catalysts", note: "Map" },
 { id: "calendar-board", short: "CAL", label: "Calendar", note: "Tape" },
 { id: "market-board", short: "MKT", label: "Market", note: "Strip" },
]

const BIAS_SLOTS = [
 { label: "Equities", symbols: ["SPX"] },
 { label: "Rates", symbols: ["US10Y", "US2Y"] },
 { label: "Dollar", symbols: ["DXY", "EURUSD"] },
 { label: "Alternatives", symbols: ["BTC", "XAU"] },
]

const MARKET_STRIP_ORDER = ["SPX", "US10Y", "DXY", "BTC", "XAU", "EURUSD", "US2Y"]

function readParam(value: unknown) {
 if (Array.isArray(value)) return value[0] ? String(value[0]) : ""
 if (typeof value === "string") return value
 return ""
}

function normalizeWindow(value: string) {
 return value === "1w" ? "1w" : "48h"
}


function normalizeImpact(value: string) {
 const canonical = canonicalImpact(value)
 if (canonical === "High" || canonical === "Medium" || canonical === "Low") return canonical
 return "all"
}

function canonicalImpact(value: string) {
 const normalized = value.trim().toLowerCase()
 if (normalized === "high") return "High"
 if (normalized === "medium" || normalized === "med") return "Medium"
 if (normalized === "low") return "Low"
 return value
}

function compactImpactLabel(value: string) {
 const canonical = canonicalImpact(value)
 if (canonical === "Medium") return "Med"
 return canonical
}

function dashboardHref(state: any, overrides: any) {
 const next = { ...state, ...overrides }
 const params = new URLSearchParams()
 if (next.asset) params.set("asset", next.asset)
 if (next.window !== "48h") params.set("window", next.window)
 if (next.impact !== "all") params.set("impact", next.impact)
 const query = params.toString()
 return query ? "/app/dashboard?" + query : "/app/dashboard"
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

function currentAsset(payload: DashboardPayload, requested?: string) {
 const assets = payload.hero.assets ? payload.hero.assets : []
 const exact = requested ? assets.find(function (item) { return item.symbol === requested }) : undefined
 return exact ? exact : assets[0]
}

function resolveBiasCards(payload: DashboardPayload) {
 const consensusMap = new Map(payload.marketConsensus.assets.map(function (item) { return [item.symbol, item] }))
 const assetMap = new Map(payload.hero.assets.map(function (item) { return [item.symbol, item] }))
 return BIAS_SLOTS.map(function (slot) {
 const symbol = slot.symbols.find(function (candidate) { return consensusMap.has(candidate) || assetMap.has(candidate) })
 const consensus = symbol ? consensusMap.get(symbol) : payload.marketConsensus.assets[0]
 const asset = symbol ? assetMap.get(symbol) : payload.hero.assets.find(function (item) { return item.symbol === (consensus ? consensus.symbol : "") })
 if (!consensus && !asset) return null
 return {
 label: slot.label,
 symbol: consensus ? consensus.symbol : asset ? asset.symbol : slot.label,
 direction: consensus ? consensus.direction : asset ? asset.stance : "Neutral",
 confidence: Math.round((consensus ? consensus.confidence : asset ? asset.confidence : 0.5) * 100),
 change30dPct: consensus ? consensus.change30dPct : asset ? asset.change30dPct : 0,
 price: asset ? asset.price : "--",
 note: asset ? asset.regimeContext : consensus ? consensus.note : "No desk note loaded",
 }
 }).filter(Boolean)
}

function fallbackLiquidityInputs(payload: DashboardPayload) {
 return payload.liquidityRegime.drivers.slice(0, 4).map(function (item, index) {
 return { label: index === 0 ? "Balance sheet" : "Layer " + String(index + 1), value: "Derived", detail: item, tone: payload.liquidityRegime.label }
 })
}

function selectCatalysts(events: EventRelease[], reference: string, windowMode: WindowMode) {
 const now = parseTime(reference) ? parseTime(reference) as Date : new Date()
 const lowerBound = new Date(now.getTime() - (6 * 60 * 60 * 1000))
 const upperBound = new Date(now.getTime() + ((windowMode === "1w" ? 168 : 48) * 60 * 60 * 1000))
 const activeWindow = events.filter(function (item) {
 const scheduled = parseTime(item.scheduledAt)
 if (!scheduled) return false
 if (scheduled < lowerBound || scheduled > upperBound) return false
 if (item.status === "Released" && scheduled < lowerBound) return false
 return true
 }).slice(0, 5)
 if (activeWindow.length !== 0) return activeWindow
 const unresolved = events.filter(function (item) { return item.status !== "Released" }).slice(0, 5)
 return unresolved.length !== 0 ? unresolved : events.slice(0, 5)
}

function filterCalendar(events: EventRelease[], impact: ImpactFilter) {
 if (impact === "all") return events
 return events.filter(function (item) { return normalizeImpact(item.impact) === impact })
}

function sortEvents(events: EventRelease[]) {
 return events.slice().sort(function (left, right) {
 const leftTime = parseTime(left.scheduledAt)
 const rightTime = parseTime(right.scheduledAt)
 return (leftTime ? leftTime.getTime() : 0) - (rightTime ? rightTime.getTime() : 0)
 })
}

function providerCounts(payload: DashboardPayload) {
 const live = payload.utility.providers.filter(function (item) { return item.status === "live" }).length
 return { live: live, fallback: Math.max(0, payload.utility.providers.length - live) }
}

function orderedMarketAssets(payload: DashboardPayload) {
 const ordered: any[] = []
 MARKET_STRIP_ORDER.forEach(function (symbol) {
 const item = payload.hero.assets.find(function (candidate) { return candidate.symbol === symbol })
 if (item) ordered.push(item)
 })
 payload.hero.assets.forEach(function (item) {
 if (!ordered.find(function (candidate) { return candidate.symbol === item.symbol })) ordered.push(item)
 })
 return ordered.slice(0, 7)
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

function biasCard(item: any) {
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

function marketCard(item: any, state: any) {
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

export default async function DashboardPage(props: any = {}) {
 const params = props.searchParams ? await props.searchParams : {}
 const state = {
 asset: readParam(params.asset).toUpperCase() || undefined,
 window: normalizeWindow(readParam(params.window)),
 impact: normalizeImpact(readParam(params.impact)),
 }
 const payload = await getDashboard()
 const events = sortEvents(await getEvents())
 const catalysts = selectCatalysts(events, payload.generatedAt, state.window)
 const visibleCalendar = filterCalendar(events, state.impact).slice(0, 12)
 const activeAsset = currentAsset(payload, state.asset)
 const biasCards = resolveBiasCards(payload)
 const liquidityInputs = payload.liquidityInputs.length !== 0 ? payload.liquidityInputs : fallbackLiquidityInputs(payload)
 const providers = providerCounts(payload)
 const marketAssets = orderedMarketAssets(payload)
 const marketLive = marketAssets.filter(function (item) { return item.freshness.mode === "live" }).length
 const marketFallback = Math.max(0, marketAssets.length - marketLive)
 const highVisible = visibleCalendar.filter(function (item) { return item.impact === "High" }).length
 const upcomingVisible = visibleCalendar.filter(function (item) { return item.status !== "Released" }).length
 const calendarRows: ReactNode[][] = visibleCalendar.length !== 0 ? visibleCalendar.map(calendarRow) : [["--", "--", "No events match the current dashboard filters", "--", "--", "--", "--"]]
 const trackValue = payload.trackRecord.hitRate === undefined ? "Replay only" : String(Math.round(payload.trackRecord.hitRate * 100)) + "% hit"
 const briefingLead = payload.linkedIntelligence.briefings[0]
 const alertLead = payload.linkedIntelligence.alerts[0]
 return h(PageShell, { title: "Dashboard", subtitle: "Desktop macro workstation with a denser board layout, catalyst map, and terminal calendar surface.", active: "dashboard" }, h("div", { className: "space-y-3" }, [
 h("section", { key: "context", className: "grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto]" }, [
 h("div", { key: "modules", className: "terminal-strip" }, [
 h("div", { key: "links", className: "flex flex-wrap items-center gap-2" }, ([h("span", { key: "label", className: "text-[8px] font-semibold uppercase tracking-[0.22em] text-slate-500" }, "Desk modules")] as ReactNode[]).concat(MODULE_LINKS.map(function (item) { return h(Link, { key: item.href, href: item.href, className: item.href === "/app/dashboard" ? "desk-tab desk-tab-active" : "desk-tab" }, item.label) }))),
 h("div", { key: "meta", className: "flex flex-wrap items-center gap-2" }, [
 h("span", { key: "date", className: "terminal-meta" }, ["Date ", h("strong", { key: "value" }, formatDeskDate(payload.generatedAt))]),
 h("span", { key: "utc", className: "terminal-meta" }, ["UTC ", h("strong", { key: "value" }, formatDeskTime(payload.generatedAt).replace(" UTC", ""))]),
 h("span", { key: "session", className: "terminal-meta" }, ["Session ", h("strong", { key: "value" }, payload.utility.activeSession)]),
 ]),
 ]),
 h("div", { key: "status", className: "terminal-strip justify-end" }, payload.utility.sessions.map(function (session) {
 return h("div", { key: session.code, className: session.active ? "session-dot session-dot-active text-[10px] font-semibold uppercase tracking-[0.18em]" : "session-dot text-[10px] font-semibold uppercase tracking-[0.18em]" }, session.code)
 }).concat([
 h("span", { key: "providers", className: "terminal-meta" }, ["Providers ", h("strong", { key: "value" }, String(providers.live) + " live / " + String(providers.fallback) + " fallback")]),
 h("span", { key: "refresh", className: "terminal-meta" }, ["Refresh ", h("strong", { key: "value" }, formatDeskTime(payload.utility.refreshedAt).replace(" UTC", ""))]),
 ])),
 ]),
 h("div", { key: "workspace", className: "grid gap-3 xl:grid-cols-[58px_minmax(0,1fr)]" }, [
 h("nav", { key: "rail", className: "hidden xl:grid gap-2 self-start rounded-[15px] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(255,255,255,0.018),rgba(255,255,255,0.006))] px-2 py-2 shadow-[0_12px_26px_rgba(0,0,0,0.24)]" }, BOARD_RAIL.map(function (item) {
 return h("a", { key: item.id, href: "#" + item.id, className: "group rounded-[11px] border border-white/[0.05] bg-white/[0.02] px-2 py-2 text-center transition hover:border-white/[0.12] hover:bg-white/[0.04]" }, [
 h("div", { key: "short", className: "text-[10px] font-semibold uppercase tracking-[0.22em] text-white" }, item.short),
 h("div", { key: "label", className: "mt-1 text-[8px] font-semibold uppercase tracking-[0.18em] text-slate-500 group-hover:text-slate-300" }, item.label),
 h("div", { key: "note", className: "mt-1 text-[9px] text-slate-600 group-hover:text-slate-400" }, item.note),
 ])
 })),
 h("div", { key: "panels", className: "space-y-3" }, [
 h("div", { key: "boards", className: "grid gap-3 xl:grid-cols-[minmax(0,1.22fr)_minmax(360px,0.78fr)]" }, [
 h("div", { key: "regime-wrap", id: "regime-board" }, h(Panel, { title: "Regime & Bias", subtitle: "Current macro state, cross-asset posture, liquidity layers, and regime memory in a single workstation board.", actions: h(Link, { href: payload.marketConsensus.href, className: "terminal-link text-[11px] font-medium" }, "Open bias board") }, h("div", { className: "space-y-3" }, [
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
 h("div", { key: "footer", className: "grid gap-2 md:grid-cols-3" }, [
 signalTile("Consensus", payload.marketConsensus.label, String(Math.round(payload.marketConsensus.confidence * 100)) + "% confidence / " + String(payload.marketConsensus.sampleSize) + " assets"),
 signalTile("Track record", trackValue, String(payload.trackRecord.sampleSize) + " replays / " + payload.trackRecord.evaluationMode),
 linkCard("active-tape", "Active tape", activeAsset ? activeAsset.symbol : "No asset", activeAsset ? activeAsset.price + " / 5d edge " + showPercent(activeAsset.expectedMove5dPct) : "No market print", dashboardHref(state, { asset: activeAsset ? activeAsset.symbol : undefined }), "Focus"),
 ]),
 ]))),
 h("div", { key: "catalyst-wrap", id: "catalyst-board" }, h(Panel, { title: "Next Catalysts", subtitle: "Upcoming macro releases prioritized for desk scanability across the next 48H or 1W.", actions: h(Link, { href: "/app/event-explorer", className: "terminal-link text-[11px] font-medium" }, "Open event explorer") }, h("div", { className: "space-y-3" }, [
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
 h("div", { key: "footer", className: "grid gap-2 md:grid-cols-3" }, [
 signalTile("Window", state.window === "1w" ? "1W" : "48H", String(catalysts.length) + " catalysts in view"),
 briefingLead ? linkCard("briefing", "Briefing", briefingLead.title, briefingLead.subtitle + " / " + briefingLead.mode, briefingLead.href) : signalTile("Briefing", "Pending", "No linked briefing loaded"),
 alertLead ? linkCard("alert", "Alert", alertLead.title, alertLead.subtitle + " / " + alertLead.mode, alertLead.href) : signalTile("Alert", "Pending", "No live alert attached"),
 ]),
 ]))),
 ]),
 h("div", { key: "calendar-wrap", id: "calendar-board" }, h(Panel, { title: "Macro Calendar -- " + formatMonthLabel(payload.generatedAt), subtitle: "Terminal calendar surface with dense event rows, impact filters, and direct drill-down into event detail.", actions: h(Link, { href: "/app/macro-calendar", className: "terminal-link text-[11px] font-medium" }, "Open full calendar") }, h("div", { className: "space-y-3" }, [
 h("div", { key: "toolbar", className: "flex flex-wrap items-center justify-between gap-2" }, [
 h("div", { key: "filters", className: "flex flex-wrap gap-2" }, IMPACT_OPTIONS.map(function (option) { return h(Link, { key: option.value, href: dashboardHref(state, { impact: option.value }), className: state.impact === option.value ? "desk-tab desk-tab-active" : "desk-tab" }, option.label) })),
 h("div", { key: "stats", className: "flex flex-wrap gap-2" }, [
 h("span", { key: "high", className: "terminal-meta" }, ["High ", h("strong", { key: "value" }, String(highVisible))]),
 h("span", { key: "upcoming", className: "terminal-meta" }, ["Upcoming ", h("strong", { key: "value" }, String(upcomingVisible))]),
 h("span", { key: "source", className: "terminal-meta" }, ["Calendar ", h("strong", { key: "value" }, payload.keyCatalyst.freshness.mode)]),
 ]),
 ]),
 h(DataTable, { headers: ["Time", "Region", "Event", "Impact", "Actual", "Forecast", "Previous"], rows: calendarRows, dense: true, numericColumns: [4, 5, 6] }),
 h("div", { key: "footer", className: "grid gap-2 md:grid-cols-3" }, [
 signalTile("Filter", state.impact === "all" ? "All impact" : compactImpactLabel(state.impact), String(visibleCalendar.length) + " rows loaded"),
 signalTile("Catalyst map", String(catalysts.length), "Next board remains synced with desk window"),
 linkCard("calendar-focus", "Focus asset", activeAsset ? activeAsset.symbol : "No asset", activeAsset ? activeAsset.regimeContext : "No market context loaded", dashboardHref(state, { asset: activeAsset ? activeAsset.symbol : undefined }), "Focus"),
 ]),
 ]))),
 h("div", { key: "market-wrap", id: "market-board" }, h(Panel, { title: "Market strip", subtitle: "Persistent cross-asset tape for desktop context, with honest live or fallback freshness states.", actions: h(Link, { href: "/app/market-bias", className: "terminal-link text-[11px] font-medium" }, "Open market bias") }, h("div", { className: "space-y-3" }, [
 h("div", { key: "toolbar", className: "flex flex-wrap items-center justify-between gap-2" }, [
 activeAsset ? freshnessBadges(activeAsset.freshness, [activeAsset.symbol, activeAsset.stance]) : freshnessBadges(payload.marketConsensus.freshness, [payload.marketConsensus.label]),
 h("div", { key: "stats", className: "flex flex-wrap gap-2" }, [
 h("span", { key: "live", className: "terminal-meta" }, ["Live ", h("strong", { key: "value" }, String(marketLive))]),
 h("span", { key: "fallback", className: "terminal-meta" }, ["Fallback ", h("strong", { key: "value" }, String(marketFallback))]),
 h("span", { key: "refresh", className: "terminal-meta" }, ["Desk ", h("strong", { key: "value" }, formatDeskTime(payload.utility.refreshedAt).replace(" UTC", ""))]),
 ]),
 ]),
 h("div", { key: "strip", className: "flex gap-2 overflow-x-auto pb-1" }, marketAssets.map(function (item) { return marketCard(item, state) })),
 h("div", { key: "footer", className: "grid gap-2 md:grid-cols-3" }, [
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
