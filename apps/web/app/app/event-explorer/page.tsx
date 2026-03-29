import { createElement as h } from 'react'

import { DataTable, PageShell, Panel } from '@/components/app/chrome'
import { getEvents } from '@/lib/server/api'

export default async function EventExplorerPage() {
  const events = await getEvents()
  return h(PageShell, { title: 'Event Explorer', subtitle: 'Filter event families and drill into event specific reaction studies.', active: 'event-explorer' }, h(Panel, { title: 'Event families' }, h(DataTable, { headers: ['Family', 'Event', 'Impact', 'Status', 'Assets'], rows: events.map(function (item: any) { return [item.family, item.title, item.impact, item.status, item.relatedAssets.join(', ')] }) })))
}
