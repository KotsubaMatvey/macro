import Link from "next/link"
import { createElement as h } from "react"
import type { ReactNode } from "react"
import type { EventDetail, EventRelease } from "@macroaccess/types"

import { Badge, DataTable, EventLink, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
import { getEventDetail, getEvents } from "@/lib/server/api"

interface ExplorerSearchParams {
 family?: string
 release?: string
}

interface EventExplorerPageProps {
 searchParams?: ExplorerSearchParams
}

interface FamilySummary {
 family: string
 count: number
 impact: string
 latest: EventRelease
 assets: string[]
 releasedCount: number
 upcomingCount: number
 surpriseSum: number
 surpriseCount: number
}

interface FamilyMap {
 [key: string]: FamilySummary
}

function readParam(value: unknown) {
 if (Array.isArray(value)) return value[0]
 if (typeof value === "string") return value
 return ""
}

function show(value: unknown) {
 if (value === null) return "-"
 if (value === undefined) return "-"
 if (value === "") return "-"
 return String(value)
}

function buildFamilies(events: EventRelease[]) {
 const familyMap: FamilyMap = {}
 for (const item of events) {
 if (!familyMap[item.family]) {
 familyMap[item.family] = {
 family: item.family,
 count: 0,
 impact: item.impact,
 latest: item,
 assets: [],
 releasedCount: 0,
 upcomingCount: 0,
 surpriseSum: 0,
 surpriseCount: 0,
 }
 }
 const bucket = familyMap[item.family]
 bucket.count += 1
 bucket.latest = item
 if (item.status === "Released") bucket.releasedCount += 1
 if (item.status === "Upcoming") bucket.upcomingCount += 1
 if (item.status === "Live") bucket.upcomingCount += 1
 if (item.surprise !== undefined) {
 bucket.surpriseSum += item.surprise
 bucket.surpriseCount += 1
 }
 for (const asset of item.relatedAssets) {
 if (!bucket.assets.includes(asset)) bucket.assets.push(asset)
 }
 }
 return Object.values(familyMap).sort(function (left, right) {
 return right.count - left.count
 })
}
export default async function EventExplorerPage(props: EventExplorerPageProps) {
 const searchParams = props.searchParams ? await props.searchParams : undefined
 const events = await getEvents()
 const families = buildFamilies(events)
 let selectedFamily = readParam(searchParams ? searchParams.family : undefined)
 if (!selectedFamily) {
 if (families[0]) selectedFamily = families[0].family
 }
 const selectedEvents = events.filter(function (item) {
 return item.family === selectedFamily
 })
 let selectedRelease = readParam(searchParams ? searchParams.release : undefined)
 if (!selectedRelease) {
 if (selectedEvents[0]) selectedRelease = selectedEvents[0].id
 }
 let selectedDetailLoaded = false
 let selectedDetail = {} as EventDetail
 if (selectedRelease) {
 try {
 selectedDetail = await getEventDetail(selectedRelease)
 selectedDetailLoaded = true
 } catch {}
 }
 const selectedFamilySummary = families.find(function (item) {
 return item.family === selectedFamily
 })
 const metrics = [
 { label: "Event families", value: String(families.length), note: "Distinct macro families in the explorer" },
 { label: "Total releases", value: String(events.length), note: "All seeded releases available for drill-down" },
 { label: "Selected family", value: selectedFamily ? selectedFamily : "None", note: "Current family filter applied to the history board" },
 { label: "Family releases", value: String(selectedEvents.length), note: "Release count inside the current family window" },
 ]
 const familyRows: ReactNode[][] = families.map(function (item: FamilySummary) {
 const averageSurprise = item.surpriseCount !== 0 ? (item.surpriseSum / item.surpriseCount).toFixed(2) : "-"
 return [item.family, String(item.count), item.impact, averageSurprise, item.assets.join(", ")]
 })
 const historyRows: ReactNode[][] = selectedEvents.map(function (item: EventRelease) {
 return [h(EventLink, { eventId: item.id, slug: item.slug, title: item.title, meta: item.country + " / " + item.status }), show(item.actual), show(item.forecast), show(item.surprise), item.relatedAssets.join(", "), h(Link, { href: "/app/event-explorer?family=" + encodeURIComponent(item.family) + String.fromCharCode(38) + "release=" + item.id, className: "text-sky-300 transition hover:text-sky-200" }, "Inspect")]
 })
 const familySignalRows: ReactNode[][] = selectedFamilySummary ? [
 ["Released prints", String(selectedFamilySummary.releasedCount), "Family archive already populated for comparison"],
 ["Upcoming prints", String(selectedFamilySummary.upcomingCount), "Future catalysts still pending in this family"],
 ["Tracked assets", selectedFamilySummary.assets.join(", "), "Assets most exposed to this macro family"],
 ["Average surprise", selectedFamilySummary.surpriseCount !== 0 ? (selectedFamilySummary.surpriseSum / selectedFamilySummary.surpriseCount).toFixed(2) : "-", "Mean forecast deviation across archived releases"],
 ] : [["No family", "-", "No selected family available in the current payload"]]
 const reactionRows: ReactNode[][] = selectedDetailLoaded ? selectedDetail.historicalReactions.map(function (item) {
 return [item.window, item.avgMovePct.toFixed(2) + "%", Math.round(item.consistency * 100) + "%", item.narrative]
 }) : [["No archive", "-", "-", "Open a family release to load reaction context"]]
 const selectedReleaseRows: ReactNode[][] = selectedDetailLoaded ? [
 ["Verdict", selectedDetail.status, selectedDetail.whyItMatters],
 ["Forecast", show(selectedDetail.forecast), "Expected print for the selected release"],
 ["Actual", show(selectedDetail.actual), "Delivered print on the selected release"],
 ["Surprise", show(selectedDetail.surprise), "Forecast deviation on the selected release"],
 ] : [["Selected release", "-", "Pick a release in the table to load richer context"]]
 return h(PageShell, { title: "Event Explorer", subtitle: "Family-level release coverage with history, drill-down links, and catalyst context.", active: "event-explorer" }, h("div", { className: "space-y-5" }, [
 h(MetricGrid, { key: "metrics", items: metrics }),
 h(Panel, { key: "families", title: "Family filters", subtitle: "Switch family context without leaving the explorer." }, [
 h("div", { key: "toolbar", className: "ws-toolbar" }, families.map(function (item: FamilySummary) { return h(Link, { key: item.family, href: "/app/event-explorer?family=" + encodeURIComponent(item.family), className: "ws-toolbar-chip" }, item.family) })),
 h("div", { key: "status", className: "mt-4 flex flex-wrap gap-2" }, [h(Badge, { key: "selected", accent: true }, selectedFamily ? selectedFamily : "No family"), h(Badge, { key: "impact" }, selectedFamilySummary ? selectedFamilySummary.impact : "No impact")]),
 ]),
 h("div", { key: "grid", className: "ws-two-panel" }, [
 h("div", { key: "left", className: "space-y-5" }, [
 h(Panel, { key: "board", title: "Selected family board", subtitle: "Primary read on the current family before drilling into one release." }, [
 h("div", { key: "headline", className: "flex flex-wrap items-center gap-2" }, [h(Badge, { key: "family", accent: true }, selectedFamily ? selectedFamily : "No family"), h(Badge, { key: "count" }, String(selectedEvents.length) + " releases")]),
 h(DataTable, { key: "signals", headers: ["Metric", "Value", "Use"], rows: familySignalRows, dense: true }),
 ]),
 h(Panel, { key: "history", title: "Release history", subtitle: "Scan actual, forecast, surprise, and jump directly into release detail." }, h(DataTable, { headers: ["Release", "Actual", "Forecast", "Surprise", "Assets", "Inspect"], rows: historyRows.length !== 0 ? historyRows : [["No releases", "-", "-", "-", "-", "-"]], dense: true })),
 h(Panel, { key: "overview", title: "Family overview", subtitle: "Broader family map across the full explorer payload." }, h(DataTable, { headers: ["Family", "Releases", "Impact", "Avg surprise", "Assets"], rows: familyRows, dense: true })),
 ]),
 h("div", { key: "right", className: "space-y-5" }, [
 h(Panel, { key: "release", title: "Selected release", subtitle: "Release-specific read once one row is in focus." }, h(DataTable, { headers: ["Field", "Value", "Interpretation"], rows: selectedReleaseRows, dense: true })),
 h(Panel, { key: "detail", title: "Reaction map", subtitle: "Historical windows tied to the selected release family." }, h(DataTable, { headers: ["Window", "Average move", "Consistency", "Narrative"], rows: reactionRows, numericColumns: [1, 2], dense: true })),
 h(Panel, { key: "workflow", title: "Workflow use", subtitle: "Continue from the selected release into deeper modules." }, h(DataTable, { headers: ["Module", "Use"], rows: [[h(Link, { href: selectedDetailLoaded ? "/app/events/" + selectedDetail.id : "/app/macro-calendar", className: "text-sky-300 transition hover:text-sky-200" }, "Open event detail"), "Inspect archive context, bias, and linked intelligence for the selected release"], [h(Link, { href: "/app/impact-lab", className: "text-sky-300 transition hover:text-sky-200" }, "Open impact lab"), "Compare this family reaction profile against the broader historical reaction surface"], [h(Link, { href: "/app/dashboard", className: "text-sky-300 transition hover:text-sky-200" }, "Return to dashboard"), "Bring the same family context back into the current catalyst workflow"]], dense: true })),
 ]),
 ]),
 ]))
}
