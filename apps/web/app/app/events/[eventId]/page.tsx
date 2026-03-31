import Link from "next/link"
import { createElement as h } from "react"
import type { ReactNode } from "react"
import { notFound } from "next/navigation"
import type { Briefing, EventDetail, EventRelease, MarketBiasSnapshot, NewsItem, WorkstationPayload } from "@northstar/types"

import { DataTable, EventLink, KeyValueList, PageShell, Panel } from "@/components/app/chrome"
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
 return payload.briefings.filter(function (item) {
 if (item.relatedEventId === event.id) return true
 return hasAssetOverlap(item.assetSymbols, event.relatedAssets)
 }).slice(0, 4)
}

function resolveNews(event: EventDetail, payload: WorkstationPayload) {
 if (event.linkedNews.length !== 0) return event.linkedNews
 return payload.news.filter(function (item) {
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
 const relatedBiases = payload.biases.filter(function (item) {
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
 const briefingRows: ReactNode[][] = linkedBriefings.map(function (item: Briefing) {
 return [item.title, item.analystName, item.kind, item.summary]
 })
 const newsRows: ReactNode[][] = linkedNews.map(function (item: NewsItem) {
 return [item.title, item.source, item.category, item.sentiment]
 })
 const biasRows: ReactNode[][] = relatedBiases.map(function (item: MarketBiasSnapshot) {
 return [item.symbol, item.direction, item.score.toFixed(0), Math.round(item.confidence * 100) + "%", item.rationale.join(", ")]
 })
 const reactionRows: ReactNode[][] = event.historicalReactions.map(function (item) {
 return [item.window, item.avgMovePct.toFixed(2) + "%", Math.round(item.consistency * 100) + "%", item.narrative]
 })
 const workflowRows: ReactNode[][] = [
 [surfaceLink("/app/dashboard", "Return to dashboard"), "Re-rank the catalyst against the rest of the macro stack."],
 [surfaceLink("/app/event-explorer?family=" + encodeURIComponent(event.family), "Open family explorer"), "Compare this release with the rest of the family archive."],
 [surfaceLink("/app/briefings", "Open briefings"), "Read desk notes and timing cues linked to this catalyst."],
 [surfaceLink("/app/news", "Open news tape"), "Track headline follow-through and category context around the print."],
 ]
 const coverageRows: ReactNode[][] = [
 ["Archive releases", String(archive.length), "Earlier prints in the same family available for comparison"],
 ["Historical windows", String(event.historicalReactions.length), "Reaction baselines mapped to this catalyst family"],
 ["Linked briefings", String(linkedBriefings.length), "Desk notes directly attached or inferred from related assets"],
 ["Linked news", String(linkedNews.length), "Headline context attached or inferred from category overlap"],
 ]
 return h(PageShell, { title: event.title, subtitle: event.whyItMatters, active: "macro-calendar" }, h("div", { className: "grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_360px]" }, [
 h("div", { key: "main", className: "space-y-5" }, [
 h(Panel, { key: "profile", title: "Release profile" }, h(DataTable, { headers: ["Previous", "Forecast", "Actual", "Surprise", "Verdict"], rows: [[show(event.previous), show(event.forecast), show(event.actual), show(event.surprise), releaseVerdict(event)]] })),
 h(Panel, { key: "analysis", title: "Desk read" }, h("div", { className: "space-y-3 text-sm text-slate-300" }, [
 h("div", { key: "headline", className: "text-lg font-medium text-white" }, releaseVerdict(event) + " / " + payload.regime.label + " backdrop"),
 h("p", { key: "narrative", className: "leading-7 text-slate-400" }, deskRead(event, payload, relatedBiases)),
 h(DataTable, { key: "coverage", headers: ["Coverage", "Count", "Interpretation"], rows: coverageRows }),
 ])),
 h(Panel, { key: "reactions", title: "Historical reactions" }, h(DataTable, { headers: ["Window", "Average move", "Consistency", "Narrative"], rows: reactionRows.length !== 0 ? reactionRows : [["No history", "-", "-", "No historical windows returned for this family yet"]] })),
 h(Panel, { key: "briefings", title: "Linked briefings" }, h(DataTable, { headers: ["Title", "Analyst", "Kind", "Summary"], rows: briefingRows.length !== 0 ? briefingRows : [["No briefings", "-", "-", "No desk notes matched this catalyst yet"]] })),
 h(Panel, { key: "news", title: "Related news" }, h(DataTable, { headers: ["Headline", "Source", "Category", "Sentiment"], rows: newsRows.length !== 0 ? newsRows : [["No linked news", "-", "-", "No category or event-linked headlines returned"]] })),
 ]),
 h("div", { key: "side", className: "space-y-5" }, [
 h(Panel, { key: "meta", title: "Event context" }, h(KeyValueList, { items: [{ label: "Family", value: event.family }, { label: "Country", value: event.country }, { label: "Currency", value: event.currency }, { label: "Impact", value: event.impact, tone: event.impact }, { label: "Category", value: event.category }, { label: "Status", value: event.status, tone: event.status }, { label: "Scheduled", value: event.scheduledAt }, { label: "Assets", value: event.relatedAssets.join(", ") }] })),
 h(Panel, { key: "archive", title: "Archive selector" }, archive.length !== 0 ? h("div", { className: "grid gap-3" }, archive.map(function (item: EventRelease) { return h(EventLink, { key: item.id, eventId: item.id, slug: item.slug, title: item.title, meta: item.status + " / " + item.scheduledAt.slice(0, 10) }) })) : h("div", { className: "text-sm text-slate-500" }, "No earlier releases in this family yet.")),
 h(Panel, { key: "bias", title: "Bias context" }, h(DataTable, { headers: ["Asset", "Direction", "Score", "Confidence", "Themes"], rows: biasRows.length !== 0 ? biasRows : [["No related assets", "-", "-", "-", "-"]] })),
 h(Panel, { key: "related", title: "Related catalysts" }, relatedEvents.length !== 0 ? h("div", { className: "grid gap-3" }, relatedEvents.map(function (item: EventRelease) { return h(EventLink, { key: item.id, eventId: item.id, slug: item.slug, title: item.title, meta: item.country + " / " + item.impact + " / " + item.status }) })) : h("div", { className: "text-sm text-slate-500" }, "No related catalysts loaded.")),
 h(Panel, { key: "workflow", title: "Workflow path" }, h(DataTable, { headers: ["Module", "Use"], rows: workflowRows })),
 ]),
 ]))
}
