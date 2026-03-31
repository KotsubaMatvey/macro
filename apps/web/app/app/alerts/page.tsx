import Link from "next/link"
import { createElement as h } from "react"
import type { ReactNode } from "react"
import type { Alert, JobRun } from "@northstar/types"

import { DataTable, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
import { getAdminJobs, getWorkstation } from "@/lib/server/api"

function jobValue(item: JobRun, first: keyof JobRun, second: keyof JobRun) {
 if (item[first]) return String(item[first])
 if (item[second]) return String(item[second])
 return "-"
}

export default async function AlertsPage() {
 const payload = await getWorkstation()
 let jobs: JobRun[] = []
 try {
 jobs = await getAdminJobs()
 } catch {}
 const active = payload.alerts.filter(function (item: Alert) { return item.status === "Active" }).length
 const triggered = payload.alerts.filter(function (item: Alert) { return item.status === "Triggered" }).length
 const scheduled = payload.alerts.filter(function (item: Alert) { return item.status === "Scheduled" }).length
 const channels = Array.from(new Set(payload.alerts.map(function (item: Alert) { return item.deliveryChannel })))
 const metrics = [
 { label: "Total alerts", value: String(payload.alerts.length), note: "Alert rules available for this account" },
 { label: "Active", value: String(active), note: "Rules currently waiting for the trigger condition" },
 { label: "Triggered", value: String(triggered), note: "Alerts already fired in the recent tape" },
 { label: "Channels", value: String(channels.length), note: "Delivery paths currently configured in demo mode" },
 ]
 const rows: ReactNode[][] = payload.alerts.map(function (item: Alert) {
 return [item.name, item.triggerType, item.deliveryChannel, item.status, item.threshold ? item.threshold : "-", item.lastTriggeredAt ? item.lastTriggeredAt : "-"]
 })
 const channelRows: ReactNode[][] = channels.map(function (channel) {
 return [channel, String(payload.alerts.filter(function (item: Alert) { return item.deliveryChannel === channel }).length), "Configured"]
 })
 const jobRows: ReactNode[][] = jobs.filter(function (item: JobRun) {
 return jobValue(item, "jobType", "job_type") === "evaluate_alerts"
 }).slice(0, 6).map(function (item: JobRun) {
 return [jobValue(item, "jobType", "job_type"), item.status, jobValue(item, "runAt", "run_at"), jobValue(item, "finishedAt", "finished_at")]
 })
 const workflowRows: ReactNode[][] = [
 [h(Link, { href: "/app/macro-calendar", className: "text-sky-300 transition hover:text-sky-200" }, "Open macro calendar"), "Promote upcoming catalysts into scheduled reminders."],
 [h(Link, { href: "/app/watchlists", className: "text-sky-300 transition hover:text-sky-200" }, "Open watchlists"), "Connect saved baskets to the alerts you need before the print."],
 [h(Link, { href: "/app/live-reactions", className: "text-sky-300 transition hover:text-sky-200" }, "Open live reactions"), "Treat triggered alerts as a prompt to inspect the reaction tape."],
 ]
 return h(PageShell, { title: "Alerts", subtitle: "Event reminders, threshold logic, and channel state in one operational alert center.", active: "alerts" }, h("div", { className: "space-y-5" }, [
 h(MetricGrid, { key: "metrics", items: metrics }),
 h("div", { key: "grid", className: "grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_360px]" }, [
 h("div", { key: "left", className: "space-y-5" }, [
 h(Panel, { key: "alerts", title: "Alert center" }, h(DataTable, { headers: ["Alert", "Trigger", "Channel", "Status", "Threshold", "Last trigger"], rows: rows.length !== 0 ? rows : [["No alerts", "-", "-", "-", "-", "-"]] })),
 h(Panel, { key: "mix", title: "Trigger mix" }, h(DataTable, { headers: ["Bucket", "Count", "Use case"], rows: [["Event reminders", String(payload.alerts.filter(function (item: Alert) { return item.triggerType === "event_reminder" }).length), "Pre-event workflow and catalyst tracking"], ["Threshold rules", String(payload.alerts.filter(function (item: Alert) { return item.triggerType !== "event_reminder" }).length), "Provider-ready logic for asset or regime conditions"], ["Scheduled", String(scheduled), "Rules parked ahead of the catalyst window"]] })),
 ]),
 h("div", { key: "side", className: "space-y-5" }, [
 h(Panel, { key: "channels", title: "Channel readiness" }, h(DataTable, { headers: ["Channel", "Rules", "State"], rows: channelRows.length !== 0 ? channelRows : [["No channel", "0", "No delivery path configured"]] })),
 h(Panel, { key: "jobs", title: "Alert pipeline" }, h(DataTable, { headers: ["Job", "Status", "Run at", "Finished"], rows: jobRows.length !== 0 ? jobRows : [["evaluate_alerts", "Not visible", "-", "Admin route not available for this session"]] })),
 h(Panel, { key: "workflow", title: "Workflow use" }, h(DataTable, { headers: ["Module", "Use"], rows: workflowRows })),
 ]),
 ]),
 ]))
}
