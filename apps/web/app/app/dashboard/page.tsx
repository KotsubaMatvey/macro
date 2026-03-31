/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import Link from "next/link"
import { createElement as h } from "react"

import { DataTable, EventLink, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
import { getEventDetail, getWorkstation } from "@/lib/server/api"

function findKeyEvent(events: any[]) {
 for (const item of events) {
 if (["Upcoming", "Live"].includes(item.status)) return item
 }
 return events[0]
}

function show(value: any) {
 if (value == null) return "-"
 return String(value)
}

function actionLink(href: string, title: string, body: string) {
 return h(Link, { key: href, href, className: "rounded-xl border border-white/8 px-4 py-4 text-sm text-slate-300 transition hover:border-white/20 hover:bg-white/[0.03]" }, [
 h("div", { key: "title", className: "font-medium text-white" }, title),
 h("div", { key: "body", className: "mt-2 leading-6 text-slate-400" }, body),
 ])
}

export default async function DashboardPage() {
 const payload = await getWorkstation()
 const keyEvent = findKeyEvent(payload.nextEvents)
 let detail: any = null
 if (keyEvent) {
 try {
 detail = await getEventDetail(keyEvent.id)
 } catch {}
 }
 const biasRows = payload.biases.slice(0, 5).map(function (item: any) {
 return [item.symbol, item.direction, item.score.toFixed(0), Math.round(item.confidence * 100) + "%", item.rationale.join(", ")]
 })
 const reactionRows = detail ? detail.historicalReactions.map(function (item: any) {
 return [item.window, item.avgMovePct.toFixed(2) + "%", Math.round(item.consistency * 100) + "%", item.narrative]
 }) : [["No sample", "-", "-", "Open event detail to build a fuller reaction map"]]
 const eventRows = payload.nextEvents.slice(0, 6).map(function (item: any) {
 return [h(EventLink, { eventId: item.id, slug: item.slug, title: item.title, meta: item.country + " / " + item.status }), item.impact, item.scheduledAt.slice(0, 16), item.relatedAssets.join(", ")]
 })
 const trackRows = detail ? [["Historical windows", String(detail.historicalReactions.length), "Reaction samples mapped to this catalyst family"], ["Linked briefings", String(detail.linkedBriefings.length), "Analyst notes already attached to the event"], ["Linked news", String(detail.linkedNews.length), "Headline context already linked to the catalyst"]] : [["Historical windows", "0", "No event archive loaded"], ["Linked briefings", "0", "No linked briefing context loaded"], ["Linked news", "0", "No linked news context loaded"]]
 return h(PageShell, { title: "Dashboard", subtitle: "Cross-asset state, the next key catalyst, and immediate action paths into the deeper workstation modules.", active: "dashboard" }, h("div", { className: "space-y-5" }, [
 h(MetricGrid, { key: "metrics", items: payload.metrics }),
 h("div", { key: "grid", className: "grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_360px]" }, [
 h("div", { key: "left", className: "space-y-5" }, [
 h(Panel, { key: "edge", title: "Today edge" }, h(DataTable, { headers: ["Window", "Expected move", "Consistency", "Narrative"], rows: reactionRows })),
 h(Panel, { key: "consensus", title: "Market consensus summary" }, h(DataTable, { headers: ["Asset", "Direction", "Score", "Confidence", "Themes"], rows: biasRows })),
 h(Panel, { key: "track", title: "AI track record summary" }, h(DataTable, { headers: ["Metric", "Value", "Interpretation"], rows: trackRows })),
 ]),
 h("div", { key: "side", className: "space-y-5" }, [
 h(Panel, { key: "catalyst", title: "Key catalyst" }, keyEvent ? h("div", { className: "space-y-4 text-sm text-slate-300" }, [
 h(EventLink, { key: "link", eventId: keyEvent.id, slug: keyEvent.slug, title: keyEvent.title, meta: keyEvent.country + " / " + keyEvent.impact + " / " + keyEvent.status }),
 h(DataTable, { key: "thresholds", headers: ["Forecast", "Previous", "Actual", "Sensitivity"], rows: [[show(keyEvent.forecast), show(keyEvent.previous), show(keyEvent.actual), detail ? detail.whyItMatters : keyEvent.whyItMatters]] }),
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
 actionLink("/app/alerts", "Review alerts", "Check which reminder or threshold rules are already active into the next event."),
 ])),
 ]),
 ]),
 h(Panel, { key: "events", title: "Next events queue" }, h(DataTable, { headers: ["Event", "Impact", "Scheduled", "Assets"], rows: eventRows })),
 ]))
}
