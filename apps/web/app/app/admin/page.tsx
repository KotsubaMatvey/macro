import { createElement as h } from "react"
import { redirect } from "next/navigation"

import { DataTable, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
import { getAdminFlags, getAdminJobs, getAdminSummary } from "@/lib/server/api"

function pick(item: any, first: string, second: string, fallback: string) {
 if (item[first] != null) return String(item[first])
 if (item[second] != null) return String(item[second])
 return fallback
}

export default async function AdminPage() {
 let summary: any
 let jobs: any[]
 let flags: any[]
 try {
 summary = await getAdminSummary()
 jobs = await getAdminJobs()
 flags = await getAdminFlags()
 } catch {
 redirect("/app/dashboard")
 }
 const queued = jobs.filter(function (item: any) { return ["queued", "running"].includes(item.status) })
 const failed = jobs.filter(function (item: any) { return item.status === "failed" })
 const metrics = [
 { label: "Users", value: String(summary.users), note: "Accounts currently seeded into the environment" },
 { label: "Analysts", value: String(summary.analysts), note: "Analyst-role coverage available in demo mode" },
 { label: "Active alerts", value: String(summary.activeAlerts), note: "Cross-module trigger rules waiting on conditions" },
 { label: "Queued jobs", value: String(summary.queuedJobs), note: "Worker-visible jobs not yet fully settled" },
 ]
 const jobRows = jobs.slice(0, 20).map(function (item: any) {
 return [pick(item, "jobType", "job_type", "-"), item.status, pick(item, "runAt", "run_at", "-"), pick(item, "finishedAt", "finished_at", "-"), pick(item, "errorMessage", "error_message", "-")]
 })
 const flagRows = flags.map(function (item: any) { return [item.key, item.enabled ? "Enabled" : "Disabled", item.description] })
 return h(PageShell, { title: "Admin", subtitle: "Operational visibility into jobs, flags, and system load for the current environment.", active: "admin" }, h("div", { className: "space-y-5" }, [
 h(MetricGrid, { key: "metrics", items: metrics }),
 h("div", { key: "grid", className: "grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_360px]" }, [
 h("div", { key: "left", className: "space-y-5" }, [
 h(Panel, { key: "jobs", title: "Job runs" }, h(DataTable, { headers: ["Job", "Status", "Run at", "Finished", "Error"], rows: jobRows.length ? jobRows : [["No jobs", "-", "-", "-", "-"]] })),
 h(Panel, { key: "flags", title: "Feature flags" }, h(DataTable, { headers: ["Key", "State", "Description"], rows: flagRows.length ? flagRows : [["No flags", "-", "No flags returned"]] })),
 ]),
 h("div", { key: "side", className: "space-y-5" }, [
 h(Panel, { key: "overview", title: "Operational overview" }, h(DataTable, { headers: ["Metric", "Value"], rows: [["Scheduled events", String(summary.scheduledEvents)], ["Queued or running", String(queued.length)], ["Failed jobs", String(failed.length)], ["Flags enabled", String(flags.filter(function (item: any) { return item.enabled }).length)]] })),
 h(Panel, { key: "attention", title: "Needs attention" }, h(DataTable, { headers: ["Bucket", "Count", "Use"], rows: [["Failed jobs", String(failed.length), "Inspect the error field and replay the pipeline if needed"], ["Queued jobs", String(queued.length), "Worker should clear these after the next processing pass"], ["Admin-only routes", "Protected", "Role-aware nav and route guard stay enforced"]] })),
 ]),
 ]),
 ]))
}
