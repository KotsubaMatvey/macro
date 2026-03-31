/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { createElement as h } from 'react'

import { DataTable, EventLink, MetricGrid, PageShell, Panel } from '@/components/app/chrome'
import { getEvents, getNews } from '@/lib/server/api'

function timeLabel(value: string) {
  return value.replace('T', ' ').slice(0, 16)
}

export default async function NewsPage() {
  const items = await getNews()
  const events = await getEvents()
  const eventMap = new Map(events.map(function (item: any) { return [item.id, item] }))
  const linked = items.filter(function (item: any) {
    if (!item.relatedEventId) return false
    return eventMap.has(item.relatedEventId)
  })
  const metrics = [
    { label: 'Live feed', value: String(items.length), note: 'Seeded market headlines in the current tape' },
    { label: 'Linked catalysts', value: String(linked.length), note: 'News items mapped directly to macro releases' },
    { label: 'Sources', value: String(Array.from(new Set(items.map(function (item: any) { return item.source }))).length), note: 'Distinct demo feed sources' },
    { label: 'Categories', value: String(Array.from(new Set(items.map(function (item: any) { return item.category }))).length), note: 'Topic buckets covered by the feed' },
  ]
  const rows = items.map(function (item: any) {
    return [timeLabel(item.publishedAt), item.source, item.category, item.sentiment, item.title]
  })
  return h(PageShell, { title: 'Market News', subtitle: 'Live-style headline tape with direct mapping back to the catalyst driving the move.', active: 'news' }, h('div', { className: 'space-y-5' }, [
    h(MetricGrid, { key: 'metrics', items: metrics }),
    h('div', { key: 'grid', className: 'grid gap-5 xl:grid-cols-2' }, [
      h(Panel, { key: 'feed', title: 'Live news tape' }, h(DataTable, { headers: ['Time', 'Source', 'Category', 'Sentiment', 'Headline'], rows: rows })),
      h(Panel, { key: 'linked', title: 'Linked catalysts' }, linked.length ? h('div', { className: 'grid gap-3' }, linked.slice(0, 8).map(function (item: any) {
        const event = eventMap.get(item.relatedEventId) as any
        return h('div', { key: item.id, className: 'rounded-xl border border-white/8 p-4 text-sm text-slate-300' }, [
          h('div', { key: 'headline', className: 'text-lg font-medium text-white' }, item.title),
          h('div', { key: 'meta', className: 'mt-2 text-slate-400' }, item.source + ' / ' + item.sentiment + ' / ' + item.category),
          h('p', { key: 'summary', className: 'mt-3 leading-7 text-slate-400' }, item.summary),
          h('div', { key: 'link', className: 'mt-4' }, h(EventLink, { eventId: event.id, slug: event.slug, title: event.title, meta: event.country + ' / ' + event.impact + ' / ' + event.status })),
        ])
      })) : h('div', { className: 'text-sm text-slate-500' }, 'No linked event news yet.')),
    ]),
  ]))
}
