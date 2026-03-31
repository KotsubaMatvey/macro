/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { createElement as h } from "react"

import { DataTable, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
import { getWorkstation } from "@/lib/server/api"

export default async function AlertsPage() {
 const payload = await getWorkstation()
 const active = payload.alerts.filter(function (item: any) { return item.status === "Active" }).length
 const triggered = payload.alerts.filter(function (item: any) { return item.status === "Triggered" }).length
 const scheduled = payload.alerts.filter(function (item: any) { return item.status === "Scheduled" }).length
 const channels = Array.from(new Set(payload.alerts.map(function (item: any) { return item.deliveryChannel })))
 const metrics = [
 { label: "Total alerts", value: String(payload.alerts.length), note: "Alert rules available for this account" },
 { label: "Active", value: String(active), note: "Rules currently waiting for the trigger condition" },
 { label: "Triggered", value: String(triggered), note: "Alerts already fired in the recent tape" },
 { label: "Channels", value: String(channels.length), note: "Delivery paths currently configured in demo mode" },
 ]
 const rows = payload.alerts.map(function (item: any) {
 return [item.name, item.triggerType, item.deliveryChannel, item.status, String(item.threshold ?? "-"), item.lastTriggeredAt ? item.lastTriggeredAt : "-"]
 })
 const channelRows = channels.map(function (channel) {
 return [channel, String(payload.alerts.filter(function (item: any) { return item.deliveryChannel === channel }).length), "Configured"]
 })
 return h(PageShell, { title: "Alerts", subtitle: "Event reminders, threshold logic, and channel state in one operational alert center.", active: "alerts" }, h("div", { className: "space-y-5" }, [
 h(MetricGrid, { key: "metrics", items: metrics }),
 h("div", { key: "grid", className: "grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_360px]" }, [
 h("div", { key: "left", className: "space-y-5" }, [
 h(Panel, { key: "alerts", title: "Alert center" }, h(DataTable, { headers: ["Alert", "Trigger", "Channel", "Status", "Threshold", "Last trigger"], rows: rows.length ? rows : [["No alerts", "-", "-", "-", "-", "-"]] })),
 h(Panel, { key: "mix", title: "Trigger mix" }, h(DataTable, { headers: ["Bucket", "Count", "Use case"], rows: [["Event reminders", String(payload.alerts.filter(function (item: any) { return item.triggerType === "event_reminder" }).length), "Pre-event workflow and catalyst tracking"], ["Threshold rules", String(payload.alerts.filter(function (item: any) { return item.triggerType !== "event_reminder" }).length), "Provider-ready logic for asset or regime conditions"], ["Scheduled", String(scheduled), "Rules parked ahead of the catalyst window"]] })),
 ]),
 h("div", { key: "side", className: "space-y-5" }, [
 h(Panel, { key: "channels", title: "Channel readiness" }, h(DataTable, { headers: ["Channel", "Rules", "State"], rows: channelRows.length ? channelRows : [["No channel", "0", "No delivery path configured"]] })),
 h(Panel, { key: "workflow", title: "Workflow use" }, h(DataTable, { headers: ["Module", "Use"], rows: [["Macro calendar", "Promote upcoming catalysts into scheduled reminders"], ["Watchlists", "Connect saved baskets to the alerts you need before the print"], ["Live reactions", "Treat triggered alerts as a prompt to inspect the reaction tape"]] })),
 ]),
 ]),
 ]))
}
