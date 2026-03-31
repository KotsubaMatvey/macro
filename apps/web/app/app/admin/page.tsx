import { createElement as h } from "react"
import { redirect } from "next/navigation"
import type { AdminSummary, FeatureFlag, JobRun } from "@macroaccess/types"

import { DataTable, MetricGrid, PageShell, Panel } from "@/components/app/chrome"
import { getAdminFlags, getAdminJobs, getAdminSummary } from "@/lib/server/api"

function pick(item: JobRun, first: keyof JobRun, second: keyof JobRun, fallback: string) {
 if (item[first] != null) return String(item[first])
 if (item[second] != null) return String(item[second])
 return fallback
}

export default async function AdminPage() {
 let summary: AdminSummary
 let jobs: JobRun[]
 let flags: FeatureFlag[]
 try {
 summary = await getAdminSummary()
 jobs = await getAdminJobs()
 flags = await getAdminFlags()
 } catch {
 redirect("/app/dashboard")
 }
 const queued = jobs.filter(function (item: JobRun) { return ["queued", "running"].includes(item.status) })
 const failed = jobs.filter(function (item: JobRun) { return item.status === "failed" })
 const metrics = [
 { label: "Users", value: String(summary.users), note: "Accounts currently seeded into the environment" },
 { label: "Analysts", value: String(summary.analysts), note: "Analyst-role coverage available in demo mode" },
 { label: "Active alerts", value: String(summary.activeAlerts), note: "Trigger rules waiting on conditions" },
 { label: "Queued jobs", value: String(summary.queuedJobs), note: "Worker-visible jobs not yet fully settled" },
 ]
 const jobRows = jobs.slice(0, 20).map(function (item: JobRun) {
 return [pick(item, "jobType", "job_type", "-"), item.status, pick(item, "runAt", "run_at", "-"), pick(item, "finishedAt", "finished_at", "-"), pick(item, "errorMessage", "error_message", "-")]
 })
 const flagRows = flags.map(function (item: FeatureFlag) { return [item.key, item.enabled ? "Enabled" : "Disabled", item.description] })
 return h(PageShell, { title: "Admin", subtitle: "Operational visibility into jobs, flags, and system load for the current environment.", active: "admin" }, h("div", { className: "space-y-5" }, [
 h(MetricGrid, { key: "metrics", items: metrics }),
 h(Panel, { key: "ops", title: "Operations board", subtitle: "Admin view should answer what is running, what failed, and what feature state is active." }, h("p", { className: "text-sm leading-6 text-slate-400" }, "This surface stays compact so jobs, flags, and queue health are readable without leaving the workstation shell.")),
 h("div", { key: "grid", className: "ws-two-panel" }, [
 h("div", { key: "left", className: "space-y-5" }, [
 h(Panel, { key: "jobs", title: "Job runs", subtitle: "Recent worker execution with status, timing, and any surfaced error." }, h(DataTable, { headers: ["Job", "Status", "Run at", "Finished", "Error"], rows: jobRows.length !== 0 ? jobRows : [["No jobs", "-", "-", "-", "-"]], dense: true })),
 h(Panel, { key: "flags", title: "Feature flags", subtitle: "Feature state visible to the current environment." }, h(DataTable, { headers: ["Key", "State", "Description"], rows: flagRows.length !== 0 ? flagRows : [["No flags", "-", "No flags returned"]], dense: true })),
 ]),
 h("div", { key: "side", className: "space-y-5" }, [
 h(Panel, { key: "overview", title: "Operational overview", subtitle: "The fastest summary of what needs attention." }, h(DataTable, { headers: ["Metric", "Value"], rows: [["Scheduled events", String(summary.scheduledEvents)], ["Queued or running", String(queued.length)], ["Failed jobs", String(failed.length)], ["Flags enabled", String(flags.filter(function (item: FeatureFlag) { return item.enabled }).length)]], dense: true })),
 h(Panel, { key: "attention", title: "Needs attention", subtitle: "Operator checklist for common admin issues." }, h(DataTable, { headers: ["Bucket", "Count", "Use"], rows: [["Failed jobs", String(failed.length), "Inspect the error field and replay the pipeline if needed"], ["Queued jobs", String(queued.length), "Worker should clear these after the next processing pass"], ["Admin-only routes", "Protected", "Role-aware nav and route guard stay enforced"]], dense: true })),
 ]),
 ]),
 ]))
}
