import { createElement as h } from 'react'

import { DataTable, PageShell, Panel } from '@/components/app/chrome'
import { getEventDetail } from '@/lib/server/api'

export default async function ImpactLabPage() {
  const event = await getEventDetail('event-cpi-mar')
  return h(PageShell, { title: 'Impact Lab', subtitle: 'Historical reaction windows that stay tied to concrete events instead of vague signal claims.', active: 'impact-lab' }, h(Panel, { title: event.title + ' reaction windows' }, h(DataTable, { headers: ['Window', 'Average move', 'Consistency', 'Narrative'], rows: event.historicalReactions.map(function (item: any) { return [item.window, String(item.avgMovePct) + '%', String(Math.round(item.consistency * 100)) + '%', item.narrative] }) })))
}
