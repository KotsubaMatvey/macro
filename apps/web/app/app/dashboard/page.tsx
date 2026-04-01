import Link from "next/link"
import { createElement as h } from "react"
import type { ReactNode } from "react"
import type {
 DashboardAssetView,
 DashboardConsensusAsset,
 DashboardPayload,
 DashboardProviderStatus,
 DashboardRegimeBlock,
 DashboardSparkPoint,
 DashboardTrackRecordItem,
 SourceMetadata,
} from "@macroaccess/types"

import { Badge, DataTable, PageShell, Panel } from "@/components/app/chrome"
import { getDashboard } from "@/lib/server/api"

interface DerivedReactionRow {
 asset: string
 verdict: string
 tone: string
 strength: number
 note: string
 href: string
 sample: string
}

function showPercent(value: number, digits = 2) {
 const prefix = Math.sign(value) === 1 ? "+" : ""
 return prefix + value.toFixed(digits) + "%"
}

function showSigned(value: number, digits = 1) {
 const prefix = Math.sign(value) === 1 ? "+" : ""
 return prefix + value.toFixed(digits)
}

function selectedAsset(payload: DashboardPayload, requested?: string) {
 const assets = payload.hero.assets ? payload.hero.assets : []
 const exact = requested ? assets.find(function (item) { return item.symbol === requested }) : undefined
 return exact ? exact : assets[0]
}

function formatDeskDate(value: string) {
 return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value))
}

function formatDeskTime(value: string) {
 return new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }).format(new Date(value)) + " UTC"
}

function freshnessBadges(meta: SourceMetadata, extra: string[] = []) {
 return h("div", { className: "flex flex-wrap gap-1.5" }, [
 h(Badge, { key: "mode", accent: meta.mode === "live" ? true : meta.freshness === "fresh" }, meta.mode),
 h(Badge, { key: "fresh" }, meta.freshness),
 h(Badge, { key: "source" }, meta.source),
 ].concat(extra.map(function (item) { return h(Badge, { key: item }, item) })))
}
function miniLineChart(points: DashboardSparkPoint[], tone = "amber") {
 if (!points.length) return h("div", { className: "text-xs text-slate-500" }, "No trend loaded.")
 const values = points.map(function (item) { return item.value })
 const min = Math.min.apply(null, values)
 const max = Math.max.apply(null, values)
 const width = 280
 const height = 70
 const coords = points.map(function (item, index) {
 const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width
 const spread = max === min ? 1 : max - min
 const y = height - (((item.value - min) / spread) * (height - 8)) - 4
 return x.toFixed(1) + "," + y.toFixed(1)
 }).join(" ")
 const stroke = tone === "sky" ? "#83aef8" : tone === "green" ? "#41b36f" : "#d9a04a"
 return h("svg", { viewBox: "0 0 " + String(width) + " " + String(height), className: "h-18 w-full overflow-visible" }, [
 h("polyline", { key: "shadow", fill: "none", stroke: "rgba(255,255,255,0.07)", strokeWidth: 10, strokeLinejoin: "round", strokeLinecap: "round", points: coords }),
 h("polyline", { key: "line", fill: "none", stroke: stroke, strokeWidth: 2, strokeLinejoin: "round", strokeLinecap: "round", points: coords }),
 ])
}

function consensusShares(assets: DashboardConsensusAsset[]) {
 let bull = 0
 let bear = 0
 let neutral = 0
 let total = 0
 assets.forEach(function (item) {
 const weight = item.confidence ? item.confidence : 0.5
 total += weight
 if (item.direction === "Bullish") bull += weight
 else if (item.direction === "Bearish") bear += weight
 else neutral += weight
 })
 if (!total) return { bull: 0, bear: 0, neutral: 0 }
 const bullPct = Math.round((bull / total) * 100)
 const bearPct = Math.round((bear / total) * 100)
 return { bull: bullPct, bear: bearPct, neutral: Math.max(0, 100 - bullPct - bearPct) }
}

function consensusProxyPoints(assets: DashboardAssetView[]) {
 const maxLen = assets.reduce(function (best, item) { return Math.max(best, item.sparkline.length) }, 0)
 const rows: DashboardSparkPoint[] = []
 for (let index = 0; index !== maxLen; index += 1) {
 let total = 0
 let weight = 0
 assets.forEach(function (item) {
 const point = item.sparkline[index]
 const base = item.sparkline[0]
 const valid = point ? (base ? Boolean(base.value) : false) : false
 if (valid) {
 total += (((point.value / base.value) - 1) * 100) * item.confidence
 weight += item.confidence
 }
 })
 rows.push({ label: String(index + 1), value: weight ? Number((50 + ((total / weight) * 4)).toFixed(2)) : 50 })
 }
 return rows
}

function buildReactions(payload: DashboardPayload): DerivedReactionRow[] {
 const leadAssets = payload.hero.assets.filter(function (item) { return payload.keyCatalyst.relatedAssets.includes(item.symbol) })
 const source = leadAssets.length ? leadAssets : payload.hero.assets.slice(0, 3)
 return source.map(function (item) {
 const verdict = payload.keyCatalyst.status === "Upcoming" ? (Math.sign(item.confidence - 0.69) === 1 ? "PREP" : "WAIT") : payload.keyCatalyst.status === "Live" ? (item.stance === "Neutral" ? "WAIT" : "MONITOR") : item.stance === "Bullish" ? "LEAN LONG" : item.stance === "Bearish" ? "LEAN SHORT" : "WAIT"
 return {
 asset: item.symbol,
 verdict: verdict,
 tone: verdict === "LEAN SHORT" ? "negative" : verdict === "WAIT" ? "neutral" : "positive",
 strength: Math.round(item.confidence * 100),
 note: item.regimeContext + ". " + payload.keyCatalyst.threshold,
 href: payload.keyCatalyst.href,
 sample: String(item.sampleCount) + " windows / " + payload.keyCatalyst.status,
 }
 })
}

function toneClass(label: string) {
 const positive = ["Bullish", "Risk-on", "Supportive", "PREP", "LEAN LONG", "positive", "Hit"]
 const negative = ["Bearish", "Risk-off", "Restrictive", "LEAN SHORT", "negative", "Miss"]
 if (positive.includes(label)) return "text-emerald-300"
 if (negative.includes(label)) return "text-rose-300"
 return "text-slate-200"
}

function statTile(label: string, value: string, note: string) {
 return h("div", { className: "rounded-[12px] border border-white/[0.06] bg-white/[0.02] px-3 py-2.5" }, [
 h("div", { key: "label", className: "text-[8px] font-semibold uppercase tracking-[0.22em] text-slate-500" }, label),
 h("div", { key: "value", className: "mt-2 ws-mono text-[24px] leading-none text-white" }, value),
 h("div", { key: "note", className: "mt-1.5 text-[10px] leading-5 uppercase tracking-[0.14em] text-slate-500" }, note),
 ])
}

function trackRows(items: DashboardTrackRecordItem[]) {
 if (!items.length) return [["No replay records", "-", "-", "No linked catalyst"] as ReactNode[]]
 return items.map(function (item) {
 const linked = item.linkedEventHref ? (item.linkedEventTitle ? h(Link, { href: item.linkedEventHref, className: "text-sky-300 transition hover:text-sky-200" }, item.linkedEventTitle) : "No linked catalyst") : "No linked catalyst"
 return [item.symbol + " / " + item.stance, showPercent(item.expectedMove5dPct), showPercent(item.realizedMove5dPct), linked]
 })
}

function providerRows(items: DashboardProviderStatus[]) {
 return items.map(function (item) { return [item.name, item.status, item.detail] })
}

function linkedGroups(payload: DashboardPayload) {
 return [
 { label: "Briefings", items: payload.linkedIntelligence.briefings },
 { label: "News", items: payload.linkedIntelligence.news },
 { label: "Watchlists", items: payload.linkedIntelligence.watchlists },
 { label: "Alerts", items: payload.linkedIntelligence.alerts },
 { label: "Catalysts", items: payload.linkedIntelligence.catalysts },
 ]
}

function regimePanel(block: DashboardRegimeBlock, href: string, tone: string) {
 return h("div", { className: "space-y-4" }, [
 freshnessBadges(block.freshness, [block.trend]),
 h("div", { key: "top", className: "flex items-end justify-between gap-3" }, [
 h("div", { key: "score", className: "text-[30px] font-semibold text-white" }, showSigned(block.score, 1)),
 h("div", { key: "label", className: "text-[12px] font-medium " + toneClass(block.label) }, block.label + " / " + showSigned(block.delta, 1)),
 ]),
 miniLineChart(block.history, tone),
 h("div", { key: "drivers", className: "grid gap-2 text-[12px] text-slate-400" }, block.drivers.map(function (item) { return h("div", { key: item }, item) })),
 h(Link, { key: "link", href: href, className: "text-sm text-sky-300 transition hover:text-sky-200" }, "Open regime monitor"),
 ])
}

export default async function DashboardPage(props: any = {}) {
 const params = props.searchParams ? await props.searchParams : {}
 const requested = typeof params.asset === "string" ? params.asset.toUpperCase() : undefined
 const payload = await getDashboard()
 const active = selectedAsset(payload, requested)
 const shares = consensusShares(payload.marketConsensus.assets)
 const trendPoints = consensusProxyPoints(payload.hero.assets)
 const reactions = buildReactions(payload)
 const providerLive = payload.utility.providers.filter(function (item) { return item.status === "live" }).length
 const providerLag = payload.utility.providers.length - providerLive
 const magnitudeScore = payload.trackRecord.magnitudeErrorPct === undefined ? null : Math.max(0, Math.round(100 - (payload.trackRecord.magnitudeErrorPct * 12)))
 const edgeNote = active ? "Five-day desk edge stays at " + showPercent(active.expectedMove5dPct) + ", while the live tape has printed " + showPercent(active.change30dPct) + " over the last 30d. Regime and catalyst posture still run through " + payload.keyCatalyst.title + "." : "No live market assets are currently available."
 return h(PageShell, { title: "Dashboard", subtitle: formatDeskDate(payload.generatedAt), active: "dashboard" }, h("div", { className: "space-y-3" }, [
 h("div", { key: "context", className: "grid gap-2 xl:grid-cols-[minmax(0,1fr)_auto]" }, [
 h("div", { key: "date", className: "terminal-strip" }, [
 h("div", { key: "eyebrow", className: "text-[8px] font-semibold uppercase tracking-[0.22em] text-slate-500" }, "Desk context"),
 h("div", { key: "date-value", className: "text-[12px] font-medium text-white" }, formatDeskTime(payload.generatedAt) + " / refreshed"),
 h("div", { key: "time-value", className: "text-[11px] text-slate-500" }, payload.utility.activeSession + " / " + String(providerLive) + " live providers"),
 ]),
 h("div", { key: "sessions", className: "terminal-strip justify-end" }, payload.utility.sessions.map(function (session) {
 return h("div", { key: session.code, className: session.active ? "session-dot session-dot-active text-[10px] font-semibold uppercase tracking-[0.18em]" : "session-dot text-[10px] font-semibold uppercase tracking-[0.18em]" }, session.code)
 }).concat([h("div", { key: "providers", className: "terminal-meta" }, ["Providers", h("strong", { key: "value" }, String(providerLive) + "/" + String(providerLag))])]))
 ]),
 h(Panel, { key: "hero", title: "Today edge", subtitle: payload.hero.modelNote, className: "overflow-hidden", actions: h(Link, { href: payload.keyCatalyst.href, className: "terminal-link text-[11px] font-medium" }, "Open catalyst") }, active ? h("div", { className: "space-y-3" }, [
 h("div", { key: "tabs", className: "flex flex-wrap gap-2" }, payload.hero.assets.map(function (item) {
 const isActive = item.symbol === active.symbol
 return h(Link, { key: item.symbol, href: "/app/dashboard?asset=" + item.symbol, className: isActive ? "desk-tab desk-tab-active" : "desk-tab" }, item.symbol)
 })),
 h("div", { key: "hero-grid", className: "grid gap-3 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]" }, [
 h("div", { key: "left", className: "space-y-4" }, [
 freshnessBadges(active.freshness, ["5d horizon", String(Math.round(active.confidence * 100)) + "% confidence"]),
 h("div", { key: "hero-head", className: "flex flex-wrap items-end justify-between gap-3" }, [
 h("div", { key: "copy" }, [
 h("div", { key: "symbol", className: "text-[11px] uppercase tracking-[0.2em] text-slate-500" }, active.symbol + " / " + active.title),
 h("div", { key: "move", className: "mt-2 ws-mono text-[40px] font-semibold tracking-tight text-white" }, showPercent(active.expectedMove5dPct)),
 h("div", { key: "meta", className: "mt-2 text-[11px] uppercase tracking-[0.16em] text-slate-500" }, active.price + " / sample " + String(active.sampleCount) + " / stance " + active.stance),
 ]),
 h("div", { key: "badge", className: "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] " + toneClass(active.stance) }, active.stance + " / " + active.skew),
 ]),
 h("div", { key: "stats", className: "grid gap-2 md:grid-cols-4" }, [
 statTile("1d move", showPercent(active.change1dPct), "Source-derived tape"),
 statTile("30d move", showPercent(active.change30dPct), "Source-derived tape"),
 statTile("Confidence", String(Math.round(active.confidence * 100)) + "%", "Rolling model confidence"),
 statTile("Catalyst", payload.keyCatalyst.countdownLabel, payload.keyCatalyst.impact + " impact"),
 ]),
 h("p", { key: "note", className: "max-w-4xl text-[12px] leading-6 text-slate-300" }, edgeNote),
 h("div", { key: "chips", className: "flex flex-wrap gap-1.5" }, [
 h(Badge, { key: "risk", accent: Math.sign(payload.riskRegime.score) === 1 }, "Risk " + payload.riskRegime.label),
 h(Badge, { key: "liq", accent: Math.sign(payload.liquidityRegime.score) === 1 }, "Liquidity " + payload.liquidityRegime.label),
 h(Badge, { key: "ccy" }, payload.keyCatalyst.country + " / " + payload.keyCatalyst.currency),
 h(Badge, { key: "title" }, payload.keyCatalyst.title),
 ]),
 h("div", { key: "scenarios", className: "rounded-[12px] border border-white/[0.06] bg-[var(--panel-3)] px-4 py-3" }, [
 h("div", { key: "sum", className: "text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400" }, "Scenario distribution"),
 h("div", { key: "rows", className: "mt-4 grid gap-3" }, active.scenarioBuckets.map(function (item) {
 return h("div", { key: item.label, className: "scenario-row" }, [
 h("div", { key: "top", className: "flex items-center justify-between text-[12px] text-slate-300" }, [h("span", { key: "label" }, item.label), h("span", { key: "value", className: "ws-mono text-white" }, String(Math.round(item.probability * 100)) + "%")]),
 h("div", { key: "bar", className: "scenario-track" }, h("div", { className: "scenario-fill", style: { width: String(Math.round(item.probability * 100)) + "%" } })),
 h("div", { key: "desc", className: "text-[12px] leading-5 text-slate-500" }, item.description),
 ])
 })),
 ]),
 ]),
 h("div", { key: "right", className: "grid gap-3" }, [
 h("div", { key: "catalyst", className: "hero-summary" }, [
 h("div", { key: "label", className: "text-[8px] font-semibold uppercase tracking-[0.22em] text-slate-500" }, "Desk read"),
 h("div", { key: "title", className: "mt-2 text-[16px] font-semibold text-white" }, payload.keyCatalyst.title),
 h("div", { key: "meta", className: "mt-2 text-[11px] uppercase tracking-[0.16em] text-slate-500" }, payload.keyCatalyst.country + " / " + payload.keyCatalyst.currency + " / " + payload.keyCatalyst.impact + " impact"),
 h("div", { key: "threshold", className: "mt-3 text-[12px] text-slate-300" }, payload.keyCatalyst.threshold),
 h("div", { key: "why", className: "mt-3 text-[12px] leading-5 text-slate-500" }, payload.keyCatalyst.whyItMatters),
 h("div", { key: "fresh", className: "mt-3" }, freshnessBadges(payload.keyCatalyst.freshness)),
 ]),
 h("div", { key: "path", className: "ws-note-card" }, [
 h("div", { key: "label", className: "text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500" }, "Recent path"),
 h("div", { key: "chart", className: "mt-3" }, miniLineChart(active.sparkline, active.stance === "Bearish" ? "sky" : "amber")),
 h("div", { key: "note", className: "mt-2 text-[12px] leading-5 text-slate-500" }, active.regimeContext),
 ]),
 h("div", { key: "facts", className: "ws-note-card" }, [
 h("div", { key: "grid", className: "grid gap-3" }, [
 h("div", { key: "source" }, [
 h("div", { key: "label", className: "text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500" }, "Source-derived"),
 h("div", { key: "rows", className: "mt-3 grid gap-2 text-[12px] text-slate-300" }, active.sourceFacts.map(function (item) { return h("div", { key: item }, item) })),
 ]),
 h("div", { key: "model" }, [
 h("div", { key: "label", className: "text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500" }, "Model-derived"),
 h("div", { key: "rows", className: "mt-3 grid gap-2 text-[12px] text-slate-300" }, active.modelFacts.map(function (item) { return h("div", { key: item }, item) })),
 ]),
 ]),
 ]),
 ]),
 ]),
 ]) : h("div", { className: "text-sm text-slate-500" }, "No live market assets are currently available.")),

 h("div", { key: "main-grid", className: "grid gap-3 xl:grid-cols-[minmax(0,1.14fr)_minmax(330px,0.86fr)]" }, [
 h(Panel, { key: "consensus", title: "Market consensus", subtitle: "Confidence-weighted desk split and trend proxy built from the live asset basket.", actions: h(Link, { href: payload.marketConsensus.href, className: "terminal-link text-[11px] font-medium" }, "View all") }, h("div", { className: "space-y-3" }, [
 freshnessBadges(payload.marketConsensus.freshness, [payload.marketConsensus.trend30d, String(payload.marketConsensus.sampleSize) + " assets"]),
 h("div", { key: "stats", className: "grid gap-2 md:grid-cols-3" }, [
 statTile("Bull share", String(shares.bull) + "%", "Confidence-weighted asset split"),
 statTile("Bear share", String(shares.bear) + "%", "Confidence-weighted asset split"),
 statTile("Neutral", String(shares.neutral) + "%", payload.marketConsensus.label),
 ]),
 h("div", { key: "proxy", className: "rounded-[12px] border border-white/[0.06] bg-[var(--panel-3)] px-4 py-3" }, [
 h("div", { key: "label", className: "text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500" }, "30d desk trend proxy"),
 h("div", { key: "chart", className: "mt-3" }, miniLineChart(trendPoints, Math.sign(payload.marketConsensus.score) === 1 ? "green" : "sky")),
 ]),
 h("div", { key: "rows", className: "grid gap-3" }, payload.marketConsensus.assets.map(function (item) {
 const width = Math.max(8, Math.min(100, Math.round(item.score)))
 return h("div", { key: item.symbol, className: "consensus-row", title: item.note }, [
 h("div", { key: "top", className: "flex items-center justify-between gap-3" }, [
 h("div", { key: "copy" }, [h("div", { key: "symbol", className: "text-sm font-medium text-white" }, item.symbol), h("div", { key: "meta", className: "mt-1 text-[11px] text-slate-500" }, item.direction + " / " + showPercent(item.change30dPct))]),
 h("div", { key: "value", className: "text-[12px] font-medium " + toneClass(item.direction) }, String(Math.round(item.confidence * 100)) + "%"),
 ]),
 h("div", { key: "bar", className: "mt-2 h-1.5 rounded-full bg-white/[0.05]" }, h("div", { className: item.direction === "Bearish" ? "h-full rounded-full bg-rose-300/75" : item.direction === "Neutral" ? "h-full rounded-full bg-slate-400/60" : "h-full rounded-full bg-emerald-300/75", style: { width: String(width) + "%" } })),
 ])
 })),
 ])),
 h("div", { key: "stack", className: "grid gap-3" }, [
 h(Panel, { key: "risk", title: "Risk regime", subtitle: payload.riskRegime.interpretation, className: "overflow-hidden" }, regimePanel(payload.riskRegime, "/app/regime-monitor", Math.sign(payload.riskRegime.score) === 1 ? "green" : "sky")),
 h(Panel, { key: "event", title: "Next event", subtitle: "Highest-priority catalyst remains visible here so urgency and threshold never disappear behind the hero.", actions: h(Link, { href: payload.keyCatalyst.href, className: "terminal-link text-[11px] font-medium" }, "Open detail") }, h("div", { className: "space-y-3" }, [
 freshnessBadges(payload.keyCatalyst.freshness, [payload.keyCatalyst.status]),
 h("div", { key: "hero", className: "flex items-end justify-between gap-3" }, [
 h("div", { key: "copy" }, [h("div", { key: "meta", className: "text-[11px] uppercase tracking-[0.2em] text-slate-500" }, payload.keyCatalyst.country + " / " + payload.keyCatalyst.currency), h("div", { key: "count", className: "mt-2 text-[28px] font-semibold text-white" }, payload.keyCatalyst.countdownLabel)]),
 h("div", { key: "impact", className: "rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200" }, payload.keyCatalyst.impact),
 ]),
 h("div", { key: "title", className: "text-lg font-semibold text-white" }, payload.keyCatalyst.title),
 h("div", { key: "threshold", className: "text-sm leading-6 text-slate-300" }, payload.keyCatalyst.threshold),
 h("div", { key: "why", className: "text-[12px] leading-5 text-slate-500" }, payload.keyCatalyst.whyItMatters),
 ])),
 h(Panel, { key: "liq", title: "Liquidity regime", subtitle: payload.liquidityRegime.interpretation }, h("div", { className: "space-y-3" }, [
 freshnessBadges(payload.liquidityRegime.freshness, [payload.liquidityRegime.trend]),
 h("div", { key: "top", className: "flex flex-wrap items-center gap-2" }, [
 h("div", { key: "label", className: "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] " + toneClass(payload.liquidityRegime.label) }, payload.liquidityRegime.label),
 h("div", { key: "score", className: "ws-mono text-[24px] text-white" }, showSigned(payload.liquidityRegime.score, 1)),
 h("div", { key: "delta", className: "text-[12px] text-slate-500" }, showSigned(payload.liquidityRegime.delta, 1) + " delta"),
 ]),
 h("div", { key: "drivers", className: "grid gap-2 text-[12px] text-slate-400" }, payload.liquidityRegime.drivers.map(function (item) { return h("div", { key: item }, item) })),
 ])),
 ]),
 ]),

 h("div", { key: "lower-grid", className: "grid gap-3 xl:grid-cols-[minmax(0,1.04fr)_minmax(320px,0.96fr)]" }, [
 h(Panel, { key: "reactions", title: "Live reactions", subtitle: "Catalyst-linked desk cues stay tied to the live tape, current stance, and the active dashboard event.", actions: h(Badge, null, String(reactions.length) + " rows") }, h("div", { className: "grid gap-2.5" }, reactions.map(function (item) {
 return h(Link, { key: item.asset, href: item.href, className: "rounded-[12px] border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition hover:border-white/16 hover:bg-white/[0.04]" }, [
 h("div", { key: "top", className: "flex items-start justify-between gap-4" }, [
 h("div", { key: "copy", className: "min-w-0" }, [
 h("div", { key: "title", className: "text-sm font-medium text-white" }, item.asset + " / " + payload.keyCatalyst.title),
 h("div", { key: "meta", className: "mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-500" }, payload.keyCatalyst.country + " / " + payload.keyCatalyst.countdownLabel),
 h("div", { key: "note", className: "mt-2 text-[12px] leading-5 text-slate-400" }, item.note),
 h("div", { key: "sample", className: "mt-2 text-[11px] text-slate-500" }, item.sample),
 ]),
 h("div", { key: "verdict", className: "shrink-0 text-right" }, [
 h("div", { key: "tag", className: "text-[10px] font-semibold uppercase tracking-[0.2em] " + toneClass(item.verdict) }, item.verdict),
 h("div", { key: "bar-wrap", className: "mt-2 h-1.5 w-24 rounded-full bg-white/[0.05]" }, h("div", { className: "h-full rounded-full bg-amber-300/75", style: { width: String(item.strength) + "%" } })),
 ]),
 ]),
 ])
 }))),
 h(Panel, { key: "track", title: "AI / model track record", subtitle: payload.trackRecord.note }, h("div", { className: "space-y-3" }, [
 freshnessBadges(payload.trackRecord.freshness, [payload.trackRecord.status]),
 h("div", { key: "stats", className: "grid gap-2 md:grid-cols-3" }, [
 statTile("Hit rate", payload.trackRecord.hitRate === undefined ? "Building" : String(Math.round(payload.trackRecord.hitRate * 100)) + "%", "Directional replay"),
 statTile("Magnitude", magnitudeScore === null ? "Building" : String(magnitudeScore), payload.trackRecord.magnitudeErrorPct === undefined ? "History still limited" : "Inverse score of avg error"),
 statTile("Sample", String(payload.trackRecord.sampleSize), payload.trackRecord.evaluationMode),
 ]),
 h(DataTable, { key: "table", headers: ["Signal", "Expected", "Realized", "Linked catalyst"], rows: trackRows(payload.trackRecord.records), dense: true, numericColumns: [1, 2] }),
 ])),
 ]),
 h("div", { key: "footer-grid", className: "grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_320px]" }, [
 h(Panel, { key: "intel", title: "Linked intelligence", subtitle: "Briefings, official headlines, watchlists, alerts, and catalyst routes stay attached to the desk instead of floating as filler cards." }, h("div", { className: "grid gap-2.5 md:grid-cols-2 xl:grid-cols-3" }, linkedGroups(payload).map(function (group) {
 return h("div", { key: group.label, className: "rounded-[12px] border border-white/[0.06] bg-white/[0.02] px-4 py-3" }, [
 h("div", { key: "label", className: "text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500" }, group.label),
 h("div", { key: "items", className: "mt-3 grid gap-2" }, group.items.length ? group.items.map(function (item) {
 return h(Link, { key: item.title + item.href, href: item.href, className: "ws-link-card" }, [
 h("div", { key: "title", className: "text-sm font-medium text-white" }, item.title),
 h("div", { key: "subtitle", className: "mt-1 text-[12px] leading-5 text-slate-500" }, item.subtitle),
 ])
 }) : [h("div", { key: "empty", className: "text-[12px] text-slate-500" }, "No linked items.")]),
 ])
 }))),
 h(Panel, { key: "providers", title: "Provider state", subtitle: "Freshness remains explicit by provider so the desk can separate live coverage from fallback paths." }, h(DataTable, { headers: ["Provider", "Status", "Detail"], rows: providerRows(payload.utility.providers), dense: true })),
 ]),
 ]))
}
