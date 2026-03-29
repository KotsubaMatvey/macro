import { createElement as h } from 'react'

import { DataTable, PageShell, Panel } from '@/components/app/chrome'
import { getWorkstation } from '@/lib/server/api'

export default async function AlertsPage() {
  const payload = await getWorkstation()
  return h(PageShell, { title: 'Alerts', subtitle: 'Event reminders, threshold logic, and regime change monitoring.', active: 'alerts' }, h(Panel, { title: 'Alert center' }, h(DataTable, { headers: ['Alert', 'Trigger', 'Channel', 'Status'], rows: payload.alerts.map(function (item: any) { return [item.name, item.triggerType, item.deliveryChannel, item.status] }) })))
}
