import { createElement as h } from 'react'

import { DataTable, PageShell, Panel } from '@/components/app/chrome'
import { getEventDetail } from '@/lib/server/api'

export default async function EventCpiPage() {
  const event = await getEventDetail('event-cpi-mar')
  return h(PageShell, { title: event.title, subtitle: event.whyItMatters, active: 'macro-calendar' }, h('div', { className: 'space-y-5' }, [h(Panel, { key: 'profile', title: 'Release profile' }, h(DataTable, { headers: ['Previous', 'Forecast', 'Actual', 'Surprise'], rows: [[String(event.previous ?? '-'), String(event.forecast ?? '-'), String(event.actual ?? '-'), String(event.surprise ?? '-')]] })), h(Panel, { key: 'reactions', title: 'Historical reactions' }, h(DataTable, { headers: ['Window', 'Average move', 'Consistency', 'Narrative'], rows: event.historicalReactions.map(function (item: any) { return [item.window, String(item.avgMovePct) + '%', String(Math.round(item.consistency * 100)) + '%', item.narrative] }) }))]))
}
