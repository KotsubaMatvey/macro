import { createElement as h } from 'react'

import { DataTable, PageShell, Panel } from '@/components/app/chrome'
import { getWorkstation } from '@/lib/server/api'

export default async function AdminPage() {
  const payload = await getWorkstation()
  const summary = payload.adminSummary ?? { users: 0, analysts: 0, scheduledEvents: 0, activeAlerts: 0, queuedJobs: 0 }
  return h(PageShell, { title: 'Admin', subtitle: 'Operational view across users, jobs, alerts, and feature gates.', active: 'admin' }, h(Panel, { title: 'Admin summary' }, h(DataTable, { headers: ['Metric', 'Value'], rows: [['Users', String(summary.users)], ['Analysts', String(summary.analysts)], ['Scheduled events', String(summary.scheduledEvents)], ['Active alerts', String(summary.activeAlerts)], ['Queued jobs', String(summary.queuedJobs)]] })))
}
