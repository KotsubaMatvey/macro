import Link from "next/link"
import { createElement as h } from "react"
import type { ReactNode } from "react"
import type { Briefing, EventDetail, EventRelease, MarketBiasSnapshot, NewsItem, Watchlist, WorkstationPayload } from "@northstar/types"

import { DataTable, EventLink, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
import { getEventDetail, getWorkstation } from "@/lib/server/api"

function show(value: unknown) {
 if (value === null) return "-"
 if (value === undefined) return "-"
 if (value === "") return "-"
 return String(value)
}

function watchSymbolsFromLists(watchlists: Watchlist[]) {
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

function relevantBriefings(event: EventRelease, briefings: Briefing[]) {
 const source = briefings ? briefings : []
 return source.filter(function (item) {
 if (item.relatedEventId === event.id) return true
 return hasAssetOverlap(item.assetSymbols, event.relatedAssets)
 }).slice(0, 4)
}

function relevantNews(event: EventRelease, news: NewsItem[]) {
 const source = news ? news : []
 return source.filter(function (item) {
 if (item.relatedEventId === event.id) return true
 return item.category === event.category
 }).slice(0, 4)
}

function eventPriority(event: EventRelease, payload: WorkstationPayload) {
 let score = 0
 const watchSymbols = watchSymbolsFromLists(payload.watchlists)
 if (event.status === "Live") score += 40
 if (event.status === "Upcoming") score += 30
 if (event.impact === "High") score += 24
 if (event.impact === "Medium") score += 12
 score += event.relatedAssets.length * 4
 for (const symbol of event.relatedAssets) {
 if (watchSymbols.includes(symbol)) score += 6
 }
 for (const bias of payload.biases) {
 if (event.relatedAssets.includes(bias.symbol)) score += 4
 }
 score += relevantBriefings(event, payload.briefings).length * 3
 score += relevantNews(event, payload.news).length * 2
 return score
}

function findKeyEvent(payload: WorkstationPayload) {
 return payload.nextEvents.slice().sort(function (left, right) {
 return eventPriority(right, payload) - eventPriority(left, payload)
 })[0]
}

function actionLink(href: string, title: string, body: string) {
 return h(Link, { key: href, href, className: "rounded-xl border border-white/8 px-4 py-4 text-sm text-slate-300 transition hover:border-white/20 hover:bg-white/[0.03]" }, [
 h("div", { key: "title", className: "font-medium text-white" }, title),
 h("div", { key: "body", className: "mt-2 leading-6 text-slate-400" }, body),
 ])
}

export default async function DashboardPage() {
 const payload = await getWorkstation()
 const keyEvent = findKeyEvent(payload)
 let detailLoaded = false
 let detailData = {} as EventDetail
 if (keyEvent) {
 try {
 detailData = await getEventDetail(keyEvent.id)
 detailLoaded = true
 } catch {}
 }
 const focusSymbols = watchSymbolsFromLists(payload.watchlists)
 const relatedBiases = keyEvent ? payload.biases.filter(function (item) { return keyEvent.relatedAssets.includes(item.symbol) }) : []
 const linkedBriefings = keyEvent ? (detailLoaded ? detailData.linkedBriefings : relevantBriefings(keyEvent, payload.briefings)) : []
 const linkedNews = keyEvent ? (detailLoaded ? detailData.linkedNews : relevantNews(keyEvent, payload.news)) : []
 const reactionRows: ReactNode[][] = detailLoaded ? detailData.historicalReactions.map(function (item) {
 return [item.window, item.avgMovePct.toFixed(2) + "%", Math.round(item.consistency * 100) + "%", item.narrative]
 }) : [["No sample", "-", "-", "Open event detail to build a fuller reaction map"]]
 const biasRows: ReactNode[][] = payload.biases.slice(0, 5).map(function (item: MarketBiasSnapshot) {
 return [item.symbol, item.direction, item.score.toFixed(0), Math.round(item.confidence * 100) + "%", item.rationale.join(", ")]
 })
 const alignmentRows: ReactNode[][] = keyEvent ? [
 ["Regime backdrop", payload.regime.label + " / " + payload.regime.trend, payload.regime.interpretation],
 ["Focus assets", keyEvent.relatedAssets.join(", "), focusSymbols.length !== 0 ? "Watchlists already cover " + focusSymbols.filter(function (item) { return keyEvent.relatedAssets.includes(item) }).join(", ") : "No watchlist overlap yet"],
 ["Bias overlap", relatedBiases.length !== 0 ? relatedBiases.map(function (item) { return item.symbol + " " + item.direction }).join(", ") : "No mapped bias", relatedBiases.length !== 0 ? "Consensus already covers the catalyst asset set" : "Open market bias to establish a directional base case"],
 ["Intelligence coverage", String(linkedBriefings.length) + " briefings / " + String(linkedNews.length) + " headlines", "Desk notes and tape context available before the release"],
 ] : [["No catalyst", "-", "No upcoming catalyst available in the current payload"]]
 const trackRows: ReactNode[][] = keyEvent ? [
 ["Historical windows", detailLoaded ? String(detailData.historicalReactions.length) : "0", "Reaction samples mapped to this catalyst family"],
 ["Linked briefings", String(linkedBriefings.length), "Analyst notes already attached or inferred for the catalyst"],
 ["Linked news", String(linkedNews.length), "Headline context already linked or inferred for the catalyst"],
 ["Priority score", String(eventPriority(keyEvent, payload)), "Composite ranking using status, impact, watchlists, bias, and intelligence coverage"],
 ] : [["Historical windows", "0", "No catalyst loaded"], ["Linked briefings", "0", "No catalyst loaded"], ["Linked news", "0", "No catalyst loaded"], ["Priority score", "0", "No catalyst loaded"]]
 const intelligenceRows: ReactNode[][] = []
 for (const item of linkedBriefings) {
 intelligenceRows.push([item.title, "Briefing", item.analystName, item.summary])
 }
 for (const item of linkedNews) {
 intelligenceRows.push([item.title, "News", item.source, item.summary])
 }
 const eventRows: ReactNode[][] = payload.nextEvents.slice(0, 6).map(function (item: EventRelease) {
 return [h(EventLink, { eventId: item.id, slug: item.slug, title: item.title, meta: item.country + " / " + item.status }), item.impact, item.scheduledAt.slice(0, 16), item.relatedAssets.join(", ")]
 })
 return h(PageShell, { title: "Dashboard", subtitle: "Cross-asset state, the next key catalyst, and immediate action paths into the deeper workstation modules.", active: "dashboard" }, h("div", { className: "space-y-5" }, [
 h(MetricGrid, { key: "metrics", items: payload.metrics }),
 h("div", { key: "grid", className: "grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_360px]" }, [
 h("div", { key: "left", className: "space-y-5" }, [
 h(Panel, { key: "edge", title: "Today edge" }, h(DataTable, { headers: ["Window", "Expected move", "Consistency", "Narrative"], rows: reactionRows })),
 h(Panel, { key: "alignment", title: "Catalyst alignment" }, h(DataTable, { headers: ["Signal", "State", "Interpretation"], rows: alignmentRows })),
 h(Panel, { key: "consensus", title: "Market consensus summary" }, h(DataTable, { headers: ["Asset", "Direction", "Score", "Confidence", "Themes"], rows: biasRows })),
 h(Panel, { key: "track", title: "AI track record summary" }, h(DataTable, { headers: ["Metric", "Value", "Interpretation"], rows: trackRows })),
 h(Panel, { key: "intel", title: "Linked intelligence" }, h(DataTable, { headers: ["Item", "Type", "Desk", "Takeaway"], rows: intelligenceRows.length !== 0 ? intelligenceRows : [["No intelligence", "-", "-", "Open the event detail, briefings, or news tape to build context"]] })),
 ]),
 h("div", { key: "side", className: "space-y-5" }, [
 h(Panel, { key: "catalyst", title: "Key catalyst" }, keyEvent ? h("div", { className: "space-y-4 text-sm text-slate-300" }, [
 h(EventLink, { key: "link", eventId: keyEvent.id, slug: keyEvent.slug, title: keyEvent.title, meta: keyEvent.country + " / " + keyEvent.impact + " / " + keyEvent.status }),
 h(DataTable, { key: "thresholds", headers: ["Forecast", "Previous", "Actual", "Priority"], rows: [[show(keyEvent.forecast), show(keyEvent.previous), show(keyEvent.actual), String(eventPriority(keyEvent, payload))]] }),
 h("div", { key: "why", className: "rounded-xl border border-white/8 px-4 py-3 text-slate-400" }, keyEvent.whyItMatters),
 ]) : h("div", { className: "text-slate-500" }, "No catalyst loaded.")),
 h(Panel, { key: "regime", title: "Risk regime summary" }, h("div", { className: "space-y-3 text-sm text-slate-300" }, [
 h("div", { key: "headline", className: "text-xl font-medium text-white" }, payload.regime.label + " / " + payload.regime.trend),
 h("p", { key: "copy", className: "leading-7 text-slate-400" }, payload.regime.interpretation),
 h("div", { key: "confidence", className: "rounded-xl border border-white/8 px-4 py-3 text-slate-400" }, "Confidence " + Math.round(payload.regime.confidence * 100) + "% / score " + payload.regime.score.toFixed(2)),
 ])),
 h(Panel, { key: "actions", title: "Action paths" }, h("div", { className: "grid gap-3" }, [
 actionLink(keyEvent ? "/app/events/" + keyEvent.id : "/app/macro-calendar", "Open event detail", "Archive, related catalysts, bias context, and linked intelligence for the next macro print."),
 actionLink("/app/live-reactions", "Open live reactions", "Translate reaction windows into a cleaner tape read for tracked assets."),
 actionLink("/app/market-bias", "Open market bias", "Validate whether consensus supports the base case or points to the pain trade."),
 actionLink("/app/regime-monitor", "Open liquidity regime", "Read the macro backdrop before you trust the catalyst or fade it."),
 actionLink("/app/briefings", "Review briefings", "Open desk notes already tied to the catalyst family or asset set."),
 ])),
 ]),
 ]),
 h(Panel, { key: "events", title: "Next events queue" }, h(DataTable, { headers: ["Event", "Impact", "Scheduled", "Assets"], rows: eventRows })),
 ]))
}
