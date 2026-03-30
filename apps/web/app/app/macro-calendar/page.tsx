import { createElement as h } from 'react'

import { DataTable, EventLink, PageShell, Panel } from '@/components/app/chrome'
import { getEvents } from '@/lib/server/api'

export default async function MacroCalendarPage() {
 const events = await getEvents()
 return h(PageShell, { title: 'Macro Calendar', subtitle: 'Event schedule with direct drill-down into release detail.', active: 'macro-calendar' }, h('div', { className: 'space-y-5' }, [
 h(Panel, { key: 'table', title: 'Upcoming and recent events' }, h(DataTable, { headers: ['Event', 'Country', 'Impact', 'Forecast', 'Actual', 'Status'], rows: events.map(function (item: any) { return [item.title, item.country, item.impact, String(item.forecast ?? '-'), String(item.actual ?? '-'), item.status] }) })),
 h(Panel, { key: 'links', title: 'Open event detail' }, h('div', { className: 'grid gap-3 sm:grid-cols-2' }, events.slice(0, 12).map(function (item: any) {
 return h(EventLink, { key: item.id, eventId: item.id, slug: item.slug, title: item.title, meta: item.country + ' / ' + item.impact + ' / ' + item.status })
 }))),
 ]))
}
