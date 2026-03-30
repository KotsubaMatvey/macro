import { createElement as h } from 'react'

import { DataTable, EventLink, PageShell, Panel } from '@/components/app/chrome'
import { getEvents, getNews } from '@/lib/server/api'

export default async function NewsPage() {
 const items = await getNews()
 const events = await getEvents()
 const map = new Map(events.map(function (item: any) { return [item.id, item] }))
 const linked = items.filter(function (item: any) { return !!item.relatedEventId && map.has(item.relatedEventId) })
 return h(PageShell, { title: 'News', subtitle: 'Macro headlines with direct routing to the underlying catalyst.', active: 'news' }, h('div', { className: 'space-y-5' }, [
 h(Panel, { key: 'feed', title: 'News feed' }, h(DataTable, { headers: ['Headline', 'Source', 'Category', 'Sentiment'], rows: items.map(function (item: any) { return [item.title, item.source, item.category, item.sentiment] }) })),
 h(Panel, { key: 'linked', title: 'Linked event detail' }, h('div', { className: 'grid gap-3 sm:grid-cols-2' }, linked.length ? linked.map(function (item: any) {
 const event = map.get(item.relatedEventId) as any
 return h(EventLink, { key: item.id, eventId: event.id, slug: event.slug, title: event.title, meta: item.source + ' / ' + item.sentiment })
 }) : h('div', { className: 'text-sm text-slate-500' }, 'No linked event news yet.'))),
 ]))
}
