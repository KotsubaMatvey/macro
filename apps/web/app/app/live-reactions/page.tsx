import Link from "next/link"
import { createElement as h } from "react"
import type { ReactNode } from "react"
import type { EventDetail, EventRelease, ImpactWindow } from "@northstar/types"

import { Badge, DataTable, EventLink, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
import { getEventDetail, getEvents } from "@/lib/server/api"

function trackedEvents(events: EventRelease[]) {
 const released = events.filter(function (item) {
 if (item.status === "Released") return true
 return item.status === "Live"
 })
 if (released.length !== 0) return released.slice(0, 6)
 return events.slice(0, 6)
}

function primaryWindow(event: EventDetail) {
 const exact = event.historicalReactions.find(function (item) { return item.window === "5m" })
 if (exact) return exact
 return event.historicalReactions[0]
}

function continuationWindow(event: EventDetail) {
 const exact = event.historicalReactions.find(function (item) { return item.window === "1h" })
 if (exact) return exact
 return event.historicalReactions[1]
}

function verdict(window?: ImpactWindow) {
 if (!window) return "WAIT"
 const bucket = Math.floor(Math.abs(window.avgMovePct) * window.consistency * 10)
 if (bucket === 0) return "WAIT"
 if (bucket === 1) return "HOLD"
 return "ENTER"
}

export default async function LiveReactionsPage() {
 const events = await getEvents()
 const trackedResults = await Promise.allSettled(trackedEvents(events).map(function (item) { return getEventDetail(item.id) }))
 const tracked = [] as EventDetail[]
 for (const item of trackedResults) {
 if (item.status === "fulfilled") tracked.push(item.value)
 }
 const metrics = [
 { label: "Tracked releases", value: String(tracked.length), note: "Events currently flowing into the reaction board" },
 { label: "Enter states", value: String(tracked.filter(function (item) { return verdict(primaryWindow(item)) === "ENTER" }).length), note: "Reactions with stronger immediate follow-through" },
 { label: "Hold states", value: String(tracked.filter(function (item) { return verdict(primaryWindow(item)) === "HOLD" }).length), note: "Moderate reaction windows requiring more confirmation" },
 { label: "Wait states", value: String(tracked.filter(function (item) { return verdict(primaryWindow(item)) === "WAIT" }).length), note: "Events that still need cleaner tape confirmation" },
 ]
 const reactionRows: ReactNode[][] = tracked.map(function (event: EventDetail) {
 const shortWindow = primaryWindow(event)
 const continuation = continuationWindow(event)
 return [h(EventLink, { eventId: event.id, slug: event.slug, title: event.title, meta: event.family + " / " + event.status }), shortWindow ? shortWindow.avgMovePct.toFixed(2) + "%" : "-", shortWindow ? Math.round(shortWindow.consistency * 100) + "%" : "-", continuation ? continuation.avgMovePct.toFixed(2) + "%" : "No 1h window", verdict(shortWindow)]
 })
 const noteRows: ReactNode[][] = tracked.flatMap(function (event: EventDetail) {
 return event.historicalReactions.slice(0, 2).map(function (item: ImpactWindow) {
 return [event.title, item.window, item.narrative, verdict(item)]
 })
 })
 const workflowRows: ReactNode[][] = [
 [h(Link, { href: "/app/dashboard", className: "text-sky-300 transition hover:text-sky-200" }, "Open dashboard"), "Use the tape to validate whether the current catalyst remains the highest-priority workflow."],
 [h(Link, { href: "/app/market-bias", className: "text-sky-300 transition hover:text-sky-200" }, "Open market bias"), "Check whether consensus is being confirmed or faded by the reaction profile."],
 [h(Link, { href: "/app/regime-monitor", className: "text-sky-300 transition hover:text-sky-200" }, "Open liquidity regime"), "Use the regime to decide whether follow-through should persist or mean-revert."],
 ]
 return h(PageShell, { title: "Live Reactions", subtitle: "Recent event windows translated into clear operator states in demo mode.", active: "live-reactions" }, h("div", { className: "space-y-5" }, [
 h(MetricGrid, { key: "metrics", items: metrics }),
 h(Panel, { key: "board", title: "Reaction board", subtitle: "Verdict logic is derived from the primary reaction window and its consistency." }, [
 h("div", { key: "badges", className: "flex flex-wrap gap-2" }, [h(Badge, { key: "enter", accent: true }, String(metrics[1].value) + " enter"), h(Badge, { key: "hold" }, String(metrics[2].value) + " hold"), h(Badge, { key: "wait" }, String(metrics[3].value) + " wait")]),
 h("p", { key: "body", className: "mt-3 text-sm leading-6 text-slate-400" }, "Use the tape to decide whether the market is accepting the print, pausing, or fading the first move."),
 ]),
 h("div", { key: "grid", className: "ws-two-panel" }, [
 h("div", { key: "left", className: "space-y-5" }, [
 h(Panel, { key: "tape", title: "Reaction tape", subtitle: "Primary board for event, move, continuation, and verdict." }, h(DataTable, { headers: ["Event", "5m move", "Consistency", "1h continuation", "Verdict"], rows: reactionRows.length !== 0 ? reactionRows : [["No reactions", "-", "-", "-", "WAIT"]], numericColumns: [1, 2, 3], dense: true })),
 h(Panel, { key: "notes", title: "Window notes", subtitle: "Short-form narrative around the first two reaction windows." }, h(DataTable, { headers: ["Event", "Window", "Narrative", "State"], rows: noteRows.length !== 0 ? noteRows : [["No notes", "-", "-", "WAIT"]], dense: true })),
 ]),
 h("div", { key: "right", className: "space-y-5" }, [
 h(Panel, { key: "tracked", title: "Tracked releases", subtitle: "Events currently feeding the live reaction board." }, tracked.length !== 0 ? h("div", { className: "grid gap-3" }, tracked.map(function (item: EventDetail) { return h(EventLink, { key: item.id, eventId: item.id, slug: item.slug, title: item.title, meta: item.family + " / " + item.status }) })) : h("div", { className: "text-sm text-slate-500" }, "No tracked releases available.")),
 h(Panel, { key: "workflow", title: "Workflow use", subtitle: "Next surfaces that should be checked after the first reaction." }, h(DataTable, { headers: ["Module", "Use"], rows: workflowRows, dense: true })),
 ]),
 ]),
 ]))
}
