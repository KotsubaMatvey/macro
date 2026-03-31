import Link from "next/link"
import { createElement as h } from "react"
import type { ReactNode } from "react"
import { notFound } from "next/navigation"
import type { Briefing, EventDetail, EventRelease, MarketBiasSnapshot, NewsItem, WorkstationPayload } from "@macroaccess/types"

import { Badge, DataTable, EventLink, KeyValueList, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
import { getEventDetail, getEvents, getWorkstation } from "@/lib/server/api"

interface EventDetailPageProps {
 params: { eventId: string }
}

function show(value: unknown) {
 if (value === null) return "-"
 if (value === undefined) return "-"
 if (value === "") return "-"
 return String(value)
}

function releaseVerdict(event: EventRelease) {
 if (event.actual === undefined) return "Pending"
 if (event.forecast === undefined) return "Pending"
 if (event.surprise !== undefined) {
 const surpriseDirection = Math.sign(event.surprise)
 if (surpriseDirection === -1) return "Below forecast"
 if (surpriseDirection === 0) return "Inline"
 return "Above forecast"
 }
 const printDirection = Math.sign(event.actual - event.forecast)
 if (printDirection === -1) return "Below forecast"
 if (printDirection === 0) return "Inline"
 return "Above forecast"
}

function hasAssetOverlap(left: string[], right: string[]) {
 for (const item of left) {
 if (right.includes(item)) return true
 }
 return false
}

function resolveBriefings(event: EventDetail, payload: WorkstationPayload) {
 if (event.linkedBriefings.length !== 0) return event.linkedBriefings
 return (payload.briefings ? payload.briefings : []).filter(function (item) {
 if (item.relatedEventId === event.id) return true
 return hasAssetOverlap(item.assetSymbols, event.relatedAssets)
 }).slice(0, 4)
}

function resolveNews(event: EventDetail, payload: WorkstationPayload) {
 if (event.linkedNews.length !== 0) return event.linkedNews
 return (payload.news ? payload.news : []).filter(function (item) {
 if (item.relatedEventId === event.id) return true
 return item.category === event.category
 }).slice(0, 4)
}

function deskRead(event: EventDetail, payload: WorkstationPayload, relatedBiases: MarketBiasSnapshot[]) {
 const reaction = event.historicalReactions[0]
 const leadBias = relatedBiases[0]
 const parts = [event.whyItMatters, payload.regime.interpretation]
 if (reaction) {
 parts.unshift(reaction.narrative)
 }
 if (leadBias) {
 parts.push(leadBias.symbol + " bias is " + leadBias.direction.toLowerCase() + " with " + Math.round(leadBias.confidence * 100) + "% confidence.")
 }
 return parts.join(" ")
}

function surfaceLink(href: string, title: string) {
 return h(Link, { href, className: "text-sm font-medium text-sky-300 transition hover:text-sky-200" }, title)
}
export default async function EventDetailPage(props: EventDetailPageProps) {
 const params = await props.params
 let event: EventDetail
 try {
 event = await getEventDetail(params.eventId)
 } catch {
 notFound()
 }
 const events = await getEvents()
 const payload = await getWorkstation()
 const archive = events.filter(function (item) {
 if (item.id === event.id) return false
 return item.family === event.family
 }).slice(0, 6)
 const relatedBiases = (payload.biases ? payload.biases : []).filter(function (item) {
 return event.relatedAssets.includes(item.symbol)
 }).slice().sort(function (left, right) {
 return right.confidence - left.confidence
 })
 const relatedEvents = events.filter(function (item) {
 if (item.id === event.id) return false
 if (item.family === event.family) return true
 if (item.country === event.country) return true
 return item.currency === event.currency
 }).slice(0, 6)
 const linkedBriefings = resolveBriefings(event, payload)
 const linkedNews = resolveNews(event, payload)
 const reactionRows: ReactNode[][] = event.historicalReactions.length !== 0 ? event.historicalReactions.map(function (item) {
 return [item.window, item.avgMovePct.toFixed(2) + "%", Math.round(item.consistency * 100) + "%", item.narrative]
 }) : [["No history", "-", "-", "No reaction windows are available for this family yet"]]
 const biasRows: ReactNode[][] = relatedBiases.length !== 0 ? relatedBiases.map(function (item: MarketBiasSnapshot) {
 return [item.symbol, item.direction, item.score.toFixed(0), Math.round(item.confidence * 100) + "%", item.rationale.join(", ")]
 }) : [["No related assets", "-", "-", "-", "No mapped bias overlap for this catalyst"]]
 const workflowRows: ReactNode[][] = [
 [surfaceLink("/app/dashboard", "Return to dashboard"), "Re-rank this catalyst against the rest of the macro stack."],
 [surfaceLink("/app/event-explorer?family=" + encodeURIComponent(event.family), "Open family explorer"), "Compare this release with the full family archive."],
 [surfaceLink("/app/briefings", "Open briefings"), "Read desk notes and timing cues linked to the same catalyst set."],
 [surfaceLink("/app/news", "Open news tape"), "Track headline follow-through around the print and its category."],
 ]
 const releaseRows: ReactNode[][] = [
 ["Previous", show(event.previous), "Prior print in the release sequence"],
 ["Forecast", show(event.forecast), "Street expectation into the event window"],
 ["Actual", show(event.actual), "Delivered print once the release resolved"],
 ["Surprise", show(event.surprise), "Forecast deviation for the current release"],
 ["Verdict", releaseVerdict(event), "Immediate read on beat, miss, or inline outcome"],
 ]
 const coverageRows = [
 { label: "Verdict", value: releaseVerdict(event), note: event.impact + " / " + event.status },
 { label: "Archive", value: String(archive.length), note: "Earlier family releases available" },
 { label: "Coverage", value: String(linkedBriefings.length + linkedNews.length), note: "Briefings plus news attached to the event" },
 { label: "Bias overlap", value: String(relatedBiases.length), note: "Tracked assets already covered by market bias" },
 ]
 const briefingCards = linkedBriefings.length !== 0 ? linkedBriefings.map(function (item: Briefing) {
 return h("div", { key: item.id, className: "ws-feed-card" }, [
 h("div", { key: "meta", className: "text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500" }, item.kind + " / " + item.analystName),
 h("div", { key: "title", className: "mt-2 text-sm font-medium text-white" }, item.title),
 h("p", { key: "body", className: "mt-2 text-sm leading-6 text-slate-400" }, item.summary),
 h("div", { key: "assets", className: "mt-3 text-[11px] uppercase tracking-[0.16em] text-slate-500" }, item.assetSymbols.join(", ")),
 ])
 }) : [h("div", { key: "empty", className: "text-sm text-slate-500" }, "No desk notes were linked to this event yet.")]
 const newsCards = linkedNews.length !== 0 ? linkedNews.map(function (item: NewsItem) {
 return h("div", { key: item.id, className: "ws-feed-card" }, [
 h("div", { key: "meta", className: "text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500" }, item.source + " / " + item.category + " / " + item.sentiment),
 h("div", { key: "title", className: "mt-2 text-sm font-medium text-white" }, item.title),
 h("p", { key: "body", className: "mt-2 text-sm leading-6 text-slate-400" }, item.summary),
 ])
 }) : [h("div", { key: "empty", className: "text-sm text-slate-500" }, "No linked news was returned for this release.")]
 return h(PageShell, { title: event.title, subtitle: event.whyItMatters, active: "macro-calendar" }, h("div", { className: "space-y-5" }, [
 h(MetricGrid, { key: "metrics", items: coverageRows }),
 h("div", { key: "layout", className: "ws-two-panel" }, [
 h("div", { key: "main", className: "space-y-5" }, [
 h(Panel, { key: "read", title: "Desk read", subtitle: "Primary release narrative plus regime and bias context." }, [
 h("div", { key: "header", className: "flex flex-wrap items-center gap-2" }, [h(Badge, { key: "impact", accent: true }, event.impact), h(Badge, { key: "status" }, event.status), h(Badge, { key: "verdict" }, releaseVerdict(event))]),
 h("div", { key: "title", className: "mt-3 text-xl font-semibold tracking-tight text-white" }, event.family + " / " + event.currency),
 h("p", { key: "body", className: "mt-3 max-w-4xl text-sm leading-7 text-slate-400" }, deskRead(event, payload, relatedBiases)),
 h("div", { key: "kpis", className: "ws-kpi-inline mt-4" }, [
 h("div", { key: "time", className: "ws-kpi" }, [h("div", { key: "label", className: "text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500" }, "Scheduled"), h("div", { key: "value", className: "mt-2 font-mono text-xl text-white" }, event.scheduledAt.replace("T", " ").slice(0, 16)), h("div", { key: "note", className: "mt-2 text-xs text-slate-400" }, event.country + " / " + event.category)]),
 h("div", { key: "surprise", className: "ws-kpi" }, [h("div", { key: "label", className: "text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500" }, "Surprise"), h("div", { key: "value", className: "mt-2 font-mono text-xl text-white" }, show(event.surprise)), h("div", { key: "note", className: "mt-2 text-xs text-slate-400" }, "Forecast deviation")]),
 h("div", { key: "reaction", className: "ws-kpi" }, [h("div", { key: "label", className: "text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500" }, "Primary reaction"), h("div", { key: "value", className: "mt-2 font-mono text-xl text-white" }, event.historicalReactions[0] ? event.historicalReactions[0].avgMovePct.toFixed(2) + "%" : "-"), h("div", { key: "note", className: "mt-2 text-xs text-slate-400" }, event.historicalReactions[0] ? event.historicalReactions[0].window + " reference" : "No history")]),
 h("div", { key: "coverage", className: "ws-kpi" }, [h("div", { key: "label", className: "text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500" }, "Coverage"), h("div", { key: "value", className: "mt-2 font-mono text-xl text-white" }, String(linkedBriefings.length + linkedNews.length)), h("div", { key: "note", className: "mt-2 text-xs text-slate-400" }, "Linked briefings plus headlines")]),
 ]),
 ]),
 h(Panel, { key: "profile", title: "Release board", subtitle: "Print values and verdict in a compact release grid." }, h(DataTable, { headers: ["Field", "Value", "Interpretation"], rows: releaseRows, dense: true })),
 h(Panel, { key: "reactions", title: "Historical reactions", subtitle: "Reaction windows tied to the same catalyst family." }, h(DataTable, { headers: ["Window", "Average move", "Consistency", "Narrative"], rows: reactionRows, numericColumns: [1, 2], dense: true })),
 h(Panel, { key: "briefings", title: "Linked briefings", subtitle: "Desk notes connected directly or indirectly to this event." }, h("div", { className: "grid gap-3" }, briefingCards)),
 h(Panel, { key: "news", title: "Related news", subtitle: "Headline flow attached to the event or category context." }, h("div", { className: "grid gap-3" }, newsCards)),
 ]),
 h("div", { key: "side", className: "space-y-5" }, [
 h(Panel, { key: "meta", title: "Event context", subtitle: "Static metadata and route context for the selected release." }, h(KeyValueList, { items: [{ label: "Family", value: event.family }, { label: "Country", value: event.country }, { label: "Currency", value: event.currency }, { label: "Impact", value: event.impact, tone: event.impact }, { label: "Category", value: event.category }, { label: "Status", value: event.status, tone: event.status }, { label: "Assets", value: event.relatedAssets.join(", ") }] })),
 h(Panel, { key: "archive", title: "Archive selector", subtitle: "Earlier prints in the same family for direct comparison." }, archive.length !== 0 ? h("div", { className: "grid gap-3" }, archive.map(function (item: EventRelease) { return h(EventLink, { key: item.id, eventId: item.id, slug: item.slug, title: item.title, meta: item.status + " / " + item.scheduledAt.slice(0, 10) }) })) : h("div", { className: "text-sm text-slate-500" }, "No earlier releases in this family yet.")),
 h(Panel, { key: "bias", title: "Bias context", subtitle: "Asset bias already linked to the same catalyst set." }, h(DataTable, { headers: ["Asset", "Direction", "Score", "Confidence", "Themes"], rows: biasRows, numericColumns: [2, 3], dense: true })),
 h(Panel, { key: "related", title: "Related catalysts", subtitle: "Country, currency, and family-adjacent releases worth watching next." }, relatedEvents.length !== 0 ? h("div", { className: "grid gap-3" }, relatedEvents.map(function (item: EventRelease) { return h(EventLink, { key: item.id, eventId: item.id, slug: item.slug, title: item.title, meta: item.country + " / " + item.impact + " / " + item.status }) })) : h("div", { className: "text-sm text-slate-500" }, "No related catalysts loaded.")),
 h(Panel, { key: "workflow", title: "Workflow path", subtitle: "Next surfaces that extend the release workflow." }, h(DataTable, { headers: ["Module", "Use"], rows: workflowRows, dense: true })),
 ]),
 ]),
 ]))
}
