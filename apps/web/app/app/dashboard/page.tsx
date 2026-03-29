import { createElement as h } from 'react'

import { DataTable, MetricGrid, PageShell, Panel } from '@/components/app/chrome'
import { getWorkstation } from '@/lib/server/api'

export default async function DashboardPage() {
  const payload = await getWorkstation()
  return h(PageShell, { title: 'Dashboard', subtitle: 'Cross asset state, live regime context, and the next macro catalysts.', active: 'dashboard' }, h('div', { className: 'space-y-5' }, [
    h(MetricGrid, { key: 'metrics', items: payload.metrics }),
    h(Panel, { key: 'events', title: 'Upcoming events' }, h(DataTable, { headers: ['Event', 'Country', 'Impact', 'Forecast', 'Actual', 'Status'], rows: payload.nextEvents.map(function (item: any) { return [item.title, item.country, item.impact, String(item.forecast ?? '-'), String(item.actual ?? '-'), item.status] }) })),
  ]))
}
