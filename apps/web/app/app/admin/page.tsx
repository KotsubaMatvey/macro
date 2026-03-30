import { createElement as h } from 'react'
import { redirect } from 'next/navigation'

import { DataTable, PageShell, Panel } from '@/components/app/chrome'
import { getAdminFlags, getAdminJobs, getAdminSummary } from '@/lib/server/api'

export default async function AdminPage() {
 let summary: any
 let jobs: any[]
 let flags: any[]
 try {
 summary = await getAdminSummary()
 jobs = await getAdminJobs()
 flags = await getAdminFlags()
 } catch {
 redirect('/app/dashboard')
 }

 return h(PageShell, { title: 'Admin', subtitle: 'Operational controls for jobs, feature flags, and platform summary.', active: 'admin' }, h('div', { className: 'space-y-5' }, [
 h(Panel, { key: 'summary', title: 'Admin summary' }, h(DataTable, { headers: ['Metric', 'Value'], rows: [['Users', String(summary.users)], ['Analysts', String(summary.analysts)], ['Scheduled events', String(summary.scheduledEvents)], ['Active alerts', String(summary.activeAlerts)], ['Queued jobs', String(summary.queuedJobs)]] })),
 h(Panel, { key: 'jobs', title: 'Job runs' }, h(DataTable, { headers: ['Job', 'Status', 'Run at', 'Finished', 'Error'], rows: jobs.slice(0, 20).map(function (item: any) { return [item.jobType ?? item.job_type ?? '-', item.status, String(item.runAt ?? item.run_at ?? '-'), String(item.finishedAt ?? item.finished_at ?? '-'), String(item.errorMessage ?? item.error_message ?? '-')] }) })),
 h(Panel, { key: 'flags', title: 'Feature flags' }, h(DataTable, { headers: ['Key', 'Enabled', 'Description'], rows: flags.map(function (item: any) { return [item.key, item.enabled ? 'Yes' : 'No', item.description] }) })),
 ]))
}
