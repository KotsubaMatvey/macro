import Link from "next/link"
import { createElement as h } from "react"
import type { ReactNode } from "react"
import type { Briefing, EventDetail, EventRelease, MarketBiasSnapshot, NewsItem, Watchlist, WorkstationPayload } from "@macroaccess/types"

import { Badge, DataTable, EventLink, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
import { getEventDetail, getWorkstation } from "@/lib/server/api"

function show(value: unknown) {
 if (value === null) return "-"
 if (value === undefined) return "-"
 if (value === "") return "-"
 return String(value)
}

function watchSymbolsFromLists(watchlists?: Watchlist[]) {
 const source = watchlists ? watchlists : []
 const symbols: string[] = []
 for (const list of source) {
 for (const item of list.items) {
 if (!symbols.includes(item.symbol)) symbols.push(item.symbol)
 }
 }
 return symbols
}

function hasAssetOverlap(left: string[], right: string[]) {
 for (const item of left) {
 if (right.includes(item)) return true
 }
 return false
}

function relevantBriefings(event: EventRelease, briefings?: Briefing[]) {
 const source = briefings ? briefings : []
 return source.filter(function (item) {
 if (item.relatedEventId === event.id) return true
 return hasAssetOverlap(item.assetSymbols, event.relatedAssets)
 }).slice(0, 4)
}

function relevantNews(event: EventRelease, news?: NewsItem[]) {
 const source = news ? news : []
 return source.filter(function (item) {
 if (item.relatedEventId === event.id) return true
 return item.category === event.category
 }).slice(0, 4)
}

function eventPriority(event: EventRelease, payload: WorkstationPayload) {
 let score = 0
 const watchSymbols = watchSymbolsFromLists(payload.watchlists)
 const linkedBriefings = relevantBriefings(event, payload.briefings)
 const linkedNews = relevantNews(event, payload.news)
 if (event.status === "Live") score += 40
 if (event.status === "Upcoming") score += 30
 if (event.impact === "High") score += 24
 if (event.impact === "Medium") score += 12
 score += event.relatedAssets.length * 4
 for (const symbol of event.relatedAssets) {
 if (watchSymbols.includes(symbol)) score += 6
 }
 for (const bias of payload.biases ? payload.biases : []) {
 if (event.relatedAssets.includes(bias.symbol)) score += 4
 }
 score += linkedBriefings.length * 3
 score += linkedNews.length * 2
 return score
}

function findKeyEvent(payload: WorkstationPayload) {
 const events = payload.nextEvents ? payload.nextEvents.slice() : []
 return events.sort(function (left, right) {
 return eventPriority(right, payload) - eventPriority(left, payload)
 })[0]
}

function actionLink(href: string, title: string, body: string) {
 return h(Link, { key: href, href, className: "ws-link-card" }, [
 h("div", { key: "title", className: "text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500" }, title),
 h("div", { key: "body", className: "mt-2 text-sm leading-6 text-slate-300" }, body),
 ])
}

function reactionWindow(detail: EventDetail, label: string) {
 return detail.historicalReactions.find(function (item) {
 return item.window === label
 })
}

function relatedBiases(event: EventRelease, payload: WorkstationPayload) {
 const source = payload.biases ? payload.biases : []
 return source.filter(function (item) {
 return event.relatedAssets.includes(item.symbol)
 }).slice().sort(function (left, right) {
 return right.confidence - left.confidence
 }).slice(0, 4)
}
export default async function DashboardPage() {
 const payload = await getWorkstation()
 const keyEvent = findKeyEvent(payload)
 let keyDetailLoaded = false
 let keyDetail = {} as EventDetail
 if (keyEvent) {
 try {
 keyDetail = await getEventDetail(keyEvent.id)
 keyDetailLoaded = true
 } catch {}
 }
 const keyBiases = keyEvent ? relatedBiases(keyEvent, payload) : []
 const linkedBriefings = keyEvent ? relevantBriefings(keyEvent, payload.briefings) : []
 const linkedNews = keyEvent ? relevantNews(keyEvent, payload.news) : []
 const shortWindow = keyDetailLoaded ? reactionWindow(keyDetail, "5m") : undefined
 const continuation = keyDetailLoaded ? reactionWindow(keyDetail, "1h") : undefined
 const scenarioSource = keyDetailLoaded ? keyDetail.historicalReactions.slice(0, 4) : []
 let metrics = payload.metrics ? payload.metrics.slice(0, 4) : []
 if (metrics.length === 0) {
 metrics = [
 { label: "Regime", value: payload.regime.label, note: payload.regime.trend },
 { label: "Biases", value: String(payload.biases ? payload.biases.length : 0), note: "Tracked asset reads" },
 { label: "Catalysts", value: String(payload.nextEvents ? payload.nextEvents.length : 0), note: "Upcoming and live releases" },
 { label: "Alerts", value: String(payload.alerts ? payload.alerts.length : 0), note: "Rules attached to the desk" },
 ]
 }
 const keyTitle = keyEvent ? show(keyEvent.title) : "No catalyst loaded"
 const keySummary = keyEvent ? keyEvent.whyItMatters : "No upcoming catalysts are available in the current payload."
 const catalystRows: ReactNode[][] = keyEvent ? [
 ["Scheduled", keyEvent.scheduledAt.replace("T", " ").slice(0, 16), "Primary timed catalyst on the desk"],
 ["Impact", keyEvent.impact, "High impact releases stay on the top line"],
 ["Expected move", shortWindow ? shortWindow.avgMovePct.toFixed(2) + "%" : "-", "Derived from family reaction history"],
 ["Continuation", continuation ? continuation.avgMovePct.toFixed(2) + "%" : "-", "Secondary follow-through window"],
 ["Bias overlap", String(keyBiases.length), keyBiases[0] ? keyBiases[0].symbol + " carries the leading overlap" : "No direct bias overlap"],
 ["Desk coverage", String(linkedBriefings.length + linkedNews.length), "Briefings plus news mapped to the catalyst"],
 ] : [["Catalyst", "None", "No high-priority event is available right now"]]
 const scenarioRows: ReactNode[][] = scenarioSource.length !== 0 ? scenarioSource.map(function (item) {
 return [item.window, item.avgMovePct.toFixed(2) + "%", Math.round(item.consistency * 100) + "%", item.narrative]
 }) : [["No history", "-", "-", "Open an event family with historical reactions to populate this panel"]]
 const biasRows: ReactNode[][] = keyBiases.length !== 0 ? keyBiases.map(function (item: MarketBiasSnapshot) {
 return [item.symbol, item.direction, item.score.toFixed(0), Math.round(item.confidence * 100) + "%", item.rationale.join(", ")]
 }) : [["No overlap", "-", "-", "-", "No asset bias mapped to the current catalyst"]]
 const intelligenceRows: ReactNode[][] = []
 if (linkedBriefings.length === 0) {
 intelligenceRows.push(["Briefing", "No linked note", "Research coverage has not been attached to this catalyst yet"])
 }
 for (const item of linkedBriefings.slice(0, 3)) {
 intelligenceRows.push(["Briefing", item.title, item.summary])
 }
 if (linkedNews.length === 0) {
 intelligenceRows.push(["News", "No linked headline", "No event or category-linked headline is attached yet"])
 }
 for (const item of linkedNews.slice(0, 3)) {
 intelligenceRows.push(["News", item.title, item.summary])
 }
 const nextRows: ReactNode[][] = (payload.nextEvents ? payload.nextEvents : []).slice(0, 6).map(function (item: EventRelease) {
 return [h(EventLink, { eventId: item.id, slug: item.slug, title: item.title, meta: item.country + " / " + item.status }), item.impact, item.relatedAssets.join(", ")]
 })
 const watchRows: ReactNode[][] = (payload.watchlists ? payload.watchlists : []).map(function (list: Watchlist) {
 const overlap = [] as string[]
 if (keyEvent) {
 for (const item of list.items) {
 if (keyEvent.relatedAssets.includes(item.symbol)) overlap.push(item.symbol)
 }
 }
 return [list.name, String(list.itemCount), String(list.alertCount), overlap.length !== 0 ? overlap.join(", ") : "No overlap"]
 })
 const actionCards = [
 actionLink(keyEvent ? "/app/events/" + keyEvent.id : "/app/macro-calendar", "Event detail", "Open the catalyst page with archive, reactions, and intelligence context."),
 actionLink("/app/market-bias", "Bias surface", "Check whether consensus lines up with the current catalyst and watchlist basket."),
 actionLink("/app/regime-monitor", "Regime surface", "Use the macro backdrop as a risk filter before leaning into a release read."),
 actionLink("/app/live-reactions", "Reaction tape", "Move straight into the live-style reaction board once the release resolves."),
 ]
 const watchOverlap = keyEvent ? keyEvent.relatedAssets.filter(function (item) {
 return watchSymbolsFromLists(payload.watchlists).includes(item)
 }).length : 0
 const briefingLead = linkedBriefings[0]
 const newsLead = linkedNews[0]
 return h(PageShell, { title: "Dashboard", subtitle: "Top catalysts, regime backdrop, consensus bias, and desk coverage arranged into one operating surface.", active: "dashboard" }, h("div", { className: "space-y-5" }, [
 h(MetricGrid, { key: "metrics", items: metrics }),
 h("div", { key: "main-grid", className: "ws-two-panel" }, [
 h("div", { key: "left", className: "space-y-5" }, [
 h(Panel, { key: "edge", title: "Today edge", subtitle: "Primary catalyst ranked against regime, bias, and desk coverage." }, [
 h("div", { key: "hero", className: "grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]" }, [
 h("div", { key: "copy", className: "space-y-4" }, [
 h("div", { key: "badges", className: "flex flex-wrap gap-2" }, [
 h(Badge, { key: "impact", accent: true }, keyEvent ? keyEvent.impact : "Idle"),
 h(Badge, { key: "status" }, keyEvent ? keyEvent.status : "No event"),
 h(Badge, { key: "regime" }, payload.regime.label),
 ]),
 h("div", { key: "title", className: "text-2xl font-semibold tracking-tight text-white" }, keyTitle),
 h("p", { key: "summary", className: "max-w-3xl text-sm leading-7 text-slate-400" }, keySummary),
 h("div", { key: "kpis", className: "ws-kpi-inline" }, [
 h("div", { key: "move", className: "ws-kpi" }, [h("div", { key: "label", className: "text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500" }, "Expected move"), h("div", { key: "value", className: "mt-2 font-mono text-xl text-white" }, shortWindow ? shortWindow.avgMovePct.toFixed(2) + "%" : "-"), h("div", { key: "note", className: "mt-2 text-xs text-slate-400" }, "Primary reaction window")]),
 h("div", { key: "follow", className: "ws-kpi" }, [h("div", { key: "label", className: "text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500" }, "Follow through"), h("div", { key: "value", className: "mt-2 font-mono text-xl text-white" }, continuation ? continuation.avgMovePct.toFixed(2) + "%" : "-"), h("div", { key: "note", className: "mt-2 text-xs text-slate-400" }, "One hour continuation guide")]),
 h("div", { key: "bias", className: "ws-kpi" }, [h("div", { key: "label", className: "text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500" }, "Bias overlap"), h("div", { key: "value", className: "mt-2 font-mono text-xl text-white" }, String(keyBiases.length)), h("div", { key: "note", className: "mt-2 text-xs text-slate-400" }, "Assets already covered by market bias")]),
 h("div", { key: "desk", className: "ws-kpi" }, [h("div", { key: "label", className: "text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500" }, "Desk coverage"), h("div", { key: "value", className: "mt-2 font-mono text-xl text-white" }, String(linkedBriefings.length + linkedNews.length)), h("div", { key: "note", className: "mt-2 text-xs text-slate-400" }, "Linked notes and headlines")]),
 ]),
 ]),
 h("div", { key: "rail", className: "grid gap-3" }, [
 h("div", { key: "regime-card", className: "ws-note-card" }, [h("div", { key: "label", className: "text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500" }, "Regime overlay"), h("div", { key: "value", className: "mt-2 text-lg font-semibold text-white" }, payload.regime.label + " / " + payload.regime.trend), h("p", { key: "copy", className: "mt-2 text-sm leading-6 text-slate-400" }, payload.regime.interpretation)]),
 h("div", { key: "bias-card", className: "ws-note-card" }, [h("div", { key: "label", className: "text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500" }, "Consensus lead"), h("div", { key: "value", className: "mt-2 text-lg font-semibold text-white" }, keyBiases[0] ? keyBiases[0].symbol + " / " + keyBiases[0].direction : "No mapped bias"), h("p", { key: "copy", className: "mt-2 text-sm leading-6 text-slate-400" }, keyBiases[0] ? keyBiases[0].rationale.join(". ") + "." : "Current catalyst is not linked to a tracked asset bias.")]),
 h("div", { key: "desk-card", className: "ws-note-card" }, [h("div", { key: "label", className: "text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500" }, "Watch overlap"), h("div", { key: "value", className: "mt-2 text-lg font-semibold text-white" }, String(watchOverlap) + " tracked symbols"), h("p", { key: "copy", className: "mt-2 text-sm leading-6 text-slate-400" }, briefingLead ? briefingLead.title : newsLead ? newsLead.title : "No linked note or headline is attached to the key catalyst yet.")]),
 ]),
 ]),
 ]),
 h(Panel, { key: "catalyst", title: "Key catalyst", subtitle: "Release board with timing, expected move, and direct desk-read context." }, h(DataTable, { headers: ["Field", "Value", "Desk read"], rows: catalystRows })),
 h(Panel, { key: "scenarios", title: "Scenario distribution", subtitle: "Historical windows tighten the expected path before the print." }, h(DataTable, { headers: ["Window", "Average move", "Consistency", "Interpretation"], rows: scenarioRows, numericColumns: [1, 2], dense: true })),
 h(Panel, { key: "bias-panel", title: "Consensus overlap", subtitle: "Asset bias tied directly to the catalyst rather than shown in isolation." }, h(DataTable, { headers: ["Asset", "Direction", "Score", "Confidence", "Themes"], rows: biasRows, numericColumns: [2, 3], dense: true })),
 ]),
 h("div", { key: "right", className: "space-y-5" }, [
 h(Panel, { key: "actions", title: "Action paths", subtitle: "Fast routes into the next decision surface." }, h("div", { className: "grid gap-3" }, actionCards)),
 h(Panel, { key: "next", title: "Next catalysts", subtitle: "The remaining high-visibility tape after the lead event." }, nextRows.length !== 0 ? h("div", { className: "grid gap-3" }, (payload.nextEvents ? payload.nextEvents : []).slice(0, 5).map(function (item: EventRelease) { return h(EventLink, { key: item.id, eventId: item.id, slug: item.slug, title: item.title, meta: item.impact + " / " + item.status }) })) : h("div", { className: "text-sm text-slate-500" }, "No next catalysts loaded.")),
 h(Panel, { key: "intel", title: "Desk intelligence", subtitle: "Research and headline coverage attached to the lead catalyst." }, h(DataTable, { headers: ["Type", "Headline", "Why it matters"], rows: intelligenceRows, dense: true })),
 h(Panel, { key: "watch", title: "Watch focus", subtitle: "Saved baskets that already overlap the current catalyst stack." }, h(DataTable, { headers: ["Watchlist", "Items", "Alerts", "Overlap"], rows: watchRows.length !== 0 ? watchRows : [["No watchlists", "0", "0", "No overlap"]], dense: true })),
 ]),
 ]),
 ]))
}
