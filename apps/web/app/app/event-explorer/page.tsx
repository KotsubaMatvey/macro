import { createElement as h } from 'react'

import { DataTable, EventLink, PageShell, Panel } from '@/components/app/chrome'
import { getEvents } from '@/lib/server/api'

export default async function EventExplorerPage() {
 const events = await getEvents()
 return h(PageShell, { title: 'Event Explorer', subtitle: 'Filter families and drill into dynamic event detail routes.', active: 'event-explorer' }, h('div', { className: 'space-y-5' }, [
 h(Panel, { key: 'families', title: 'Event families' }, h(DataTable, { headers: ['Family', 'Event', 'Impact', 'Status', 'Assets'], rows: events.map(function (item: any) { return [item.family, item.title, item.impact, item.status, item.relatedAssets.join(', ')] }) })),
 h(Panel, { key: 'drill', title: 'Drill-down links' }, h('div', { className: 'grid gap-3 sm:grid-cols-2' }, events.map(function (item: any) {
 return h(EventLink, { key: item.id, eventId: item.id, slug: item.slug, title: item.title, meta: item.family + ' / ' + item.status })
 }))),
 ]))
}
