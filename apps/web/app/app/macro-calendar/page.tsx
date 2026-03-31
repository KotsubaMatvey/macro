/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { createElement as h } from 'react'

import { DataTable, EventLink, MetricGrid, PageShell, Panel } from '@/components/app/chrome'
import { getEvents } from '@/lib/server/api'

function verdict(item: any) {
  if (item.actual == null) return 'Pending'
  if (item.forecast == null) return 'Pending'
  const delta = item.actual - item.forecast
  if (delta > 0.2) return 'Beat'
  if (delta < -0.2) return 'Miss'
  return 'Inline'
}

function timeLabel(value: string) {
  return value.replace('T', ' ').slice(0, 16)
}

export default async function MacroCalendarPage() {
  const events = await getEvents()
  const highImpact = events.filter(function (item: any) { return item.impact === 'High' })
  const upcoming = events.filter(function (item: any) {
    if (item.status === 'Upcoming') return true
    return item.status === 'Live'
  })
  const released = events.filter(function (item: any) { return item.status === 'Released' })
  const metrics = [
    { label: 'Tracked releases', value: String(events.length), note: 'Calendar rows across the demo tape' },
    { label: 'High impact', value: String(highImpact.length), note: 'Macro catalysts worth pre-positioning' },
    { label: 'Upcoming', value: String(upcoming.length), note: 'Near-term events still on deck' },
    { label: 'Released', value: String(released.length), note: 'Events already carrying reaction context' },
  ]
  const rows = events.map(function (item: any) {
    return [timeLabel(item.scheduledAt), item.currency, item.title, String(item.actual ?? '-'), String(item.forecast ?? '-'), String(item.previous ?? '-'), verdict(item), 'Track']
  })
  const summaryRows = [
    ['Upcoming', String(upcoming.length), 'Monitor before the print and prepare scenarios'],
    ['Released', String(released.length), 'Use the detail route for reaction history and context'],
    ['High impact', String(highImpact.length), 'Prioritize cross-asset sensitivity around these releases'],
  ]
  return h(PageShell, { title: 'Macro Calendar', subtitle: 'Event schedule, release context, and direct routing into the dynamic event detail surface.', active: 'macro-calendar' }, h('div', { className: 'space-y-5' }, [
    h(MetricGrid, { key: 'metrics', items: metrics }),
    h('div', { key: 'grid', className: 'grid gap-5 xl:grid-cols-2' }, [
      h(Panel, { key: 'table', title: 'Calendar tape' }, h(DataTable, { headers: ['Time', 'CCY', 'Event', 'Actual', 'Forecast', 'Previous', 'Verdict', 'Watch'], rows: rows })),
      h('div', { key: 'side', className: 'space-y-5' }, [
        h(Panel, { key: 'impact', title: 'High impact focus' }, highImpact.length ? h('div', { className: 'grid gap-3' }, highImpact.slice(0, 6).map(function (item: any) {
          return h(EventLink, { key: item.id, eventId: item.id, slug: item.slug, title: item.title, meta: item.country + ' / ' + item.status + ' / ' + timeLabel(item.scheduledAt) })
        })) : h('div', { className: 'text-sm text-slate-500' }, 'No high impact events loaded.')),
        h(Panel, { key: 'summary', title: 'Release context' }, h(DataTable, { headers: ['Bucket', 'Count', 'Use case'], rows: summaryRows })),
      ]),
    ]),
  ]))
}
