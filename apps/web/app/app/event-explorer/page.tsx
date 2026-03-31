/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { createElement as h } from 'react'

import { DataTable, EventLink, MetricGrid, PageShell, Panel } from '@/components/app/chrome'
import { getEvents } from '@/lib/server/api'

export default async function EventExplorerPage() {
  const events = await getEvents()
  const families: any = {}
  events.forEach(function (item: any) {
    if (!families[item.family]) {
      families[item.family] = { family: item.family, count: 0, impact: item.impact, latest: item, assets: [] }
    }
    families[item.family].count += 1
    families[item.family].latest = item
    item.relatedAssets.forEach(function (asset: string) {
      if (!families[item.family].assets.includes(asset)) families[item.family].assets.push(asset)
    })
  })
  const familyList = Object.values(families) as any[]
  const assetCount = Array.from(new Set(events.flatMap(function (item: any) { return item.relatedAssets }))).length
  const metrics = [
    { label: 'Event families', value: String(familyList.length), note: 'Distinct macro families in the explorer' },
    { label: 'Total releases', value: String(events.length), note: 'All seeded releases available for drill-down' },
    { label: 'High impact', value: String(events.filter(function (item: any) { return item.impact === 'High' }).length), note: 'Families carrying the most market sensitivity' },
    { label: 'Asset touchpoints', value: String(assetCount), note: 'Unique assets linked to event families' },
  ]
  const familyRows = familyList.map(function (item: any) {
    return [item.family, String(item.count), item.impact, item.latest.title, item.assets.join(', ')]
  })
  const historyRows = events.map(function (item: any) {
    return [item.family, item.title, String(item.actual ?? '-'), String(item.forecast ?? '-'), String(item.surprise ?? '-'), item.relatedAssets.join(', ')]
  })
  return h(PageShell, { title: 'Event Explorer', subtitle: 'Family-level release coverage with linked history and drill-down into dynamic event detail routes.', active: 'event-explorer' }, h('div', { className: 'space-y-5' }, [
    h(MetricGrid, { key: 'metrics', items: metrics }),
    h('div', { key: 'grid', className: 'grid gap-5 xl:grid-cols-2' }, [
      h(Panel, { key: 'families', title: 'Family overview' }, h(DataTable, { headers: ['Family', 'Releases', 'Impact', 'Latest release', 'Assets'], rows: familyRows })),
      h(Panel, { key: 'cards', title: 'Family drill-down' }, h('div', { className: 'grid gap-3' }, familyList.slice(0, 8).map(function (item: any) {
        return h('div', { key: item.family, className: 'rounded-xl border border-white/8 p-4 text-sm text-slate-300' }, [
          h('div', { key: 'headline', className: 'text-lg font-medium text-white' }, item.family + ' / ' + item.impact),
          h('div', { key: 'meta', className: 'mt-2 text-slate-400' }, String(item.count) + ' releases / ' + item.assets.join(', ')),
          h('div', { key: 'link', className: 'mt-4' }, h(EventLink, { eventId: item.latest.id, slug: item.latest.slug, title: item.latest.title, meta: item.latest.status + ' / ' + item.latest.country })),
        ])
      }))),
    ]),
    h(Panel, { key: 'history', title: 'Release history and comparison context' }, h(DataTable, { headers: ['Family', 'Release', 'Actual', 'Forecast', 'Surprise', 'Assets'], rows: historyRows })),
  ]))
}
