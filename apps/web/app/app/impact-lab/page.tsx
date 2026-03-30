import { createElement as h } from 'react'

import { DataTable, EventLink, PageShell, Panel } from '@/components/app/chrome'
import { getEventDetail, getEvents } from '@/lib/server/api'

export default async function ImpactLabPage() {
 const events = await getEvents()
 const selected = events.slice(0, 3)
 const details = await Promise.all(selected.map(function (item: any) { return getEventDetail(item.id) }))
 return h(PageShell, { title: 'Impact Lab', subtitle: 'Reaction windows across multiple seeded catalysts.', active: 'impact-lab' }, h('div', { className: 'space-y-5' }, [
 h(Panel, { key: 'events', title: 'Tracked events' }, h('div', { className: 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3' }, selected.map(function (item: any) {
 return h(EventLink, { key: item.id, eventId: item.id, slug: item.slug, title: item.title, meta: item.family + ' / ' + item.status })
 }))),
 h(Panel, { key: 'windows', title: 'Historical reaction windows' }, h(DataTable, { headers: ['Event', 'Window', 'Average move', 'Consistency', 'Narrative'], rows: details.flatMap(function (event: any) {
 return event.historicalReactions.map(function (item: any) { return [event.title, item.window, String(item.avgMovePct) + '%', String(Math.round(item.consistency * 100)) + '%', item.narrative] })
 }) })),
 ]))
}
