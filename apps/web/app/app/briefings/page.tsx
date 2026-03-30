import { createElement as h } from 'react'

import { DataTable, EventLink, PageShell, Panel } from '@/components/app/chrome'
import { getBriefings, getEvents } from '@/lib/server/api'

export default async function BriefingsPage() {
 const items = await getBriefings()
 const events = await getEvents()
 const map = new Map(events.map(function (item: any) { return [item.id, item] }))
 const linked = items.filter(function (item: any) { return !!item.relatedEventId && map.has(item.relatedEventId) })
 return h(PageShell, { title: 'Briefings', subtitle: 'Desk notes, post-event intelligence, and direct catalyst links.', active: 'briefings' }, h('div', { className: 'space-y-5' }, [
 h(Panel, { key: 'table', title: 'Published briefings' }, h(DataTable, { headers: ['Title', 'Type', 'Analyst', 'Assets'], rows: items.map(function (item: any) { return [item.title, item.kind, item.analystName, item.assetSymbols.join(', ')] }) })),
 h(Panel, { key: 'links', title: 'Linked catalysts' }, h('div', { className: 'grid gap-3 sm:grid-cols-2' }, linked.length ? linked.map(function (item: any) {
 const event = map.get(item.relatedEventId) as any
 return h(EventLink, { key: item.id, eventId: event.id, slug: event.slug, title: event.title, meta: item.kind + ' / ' + item.analystName })
 }) : h('div', { className: 'text-sm text-slate-500' }, 'No linked events found.'))),
 ]))
}
