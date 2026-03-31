/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { createElement as h } from 'react'

import { DataTable, EventLink, MetricGrid, PageShell, Panel } from '@/components/app/chrome'
import { getEventDetail, getWorkstation } from '@/lib/server/api'

const trackedAssets = ['BTC', 'EURUSD', 'GBPUSD', 'USDJPY', 'XAU']

function threshold(value: any, delta: number) {
  if (value == null) return '-'
  return (value + delta).toFixed(2)
}

export default async function DashboardPage() {
  const payload = await getWorkstation()
  let keyEvent = payload.nextEvents[0]
  const upcoming = payload.nextEvents.find(function (item: any) { return item.status === 'Upcoming' })
  if (upcoming) keyEvent = upcoming
  let detail: any = null
  if (keyEvent) {
    try {
      detail = await getEventDetail(keyEvent.id)
    } catch {
      detail = null
    }
  }
  let scenarioRows = [['No recent sample', '-', '-', 'Open the next event detail to build a fuller reaction map.']]
  if (detail) {
    scenarioRows = detail.historicalReactions.map(function (item: any) {
      return [item.window, item.avgMovePct.toFixed(2) + '%', Math.round(item.consistency * 100) + '%', item.narrative]
    })
  }
  const biasRows = payload.biases.slice(0, 5).map(function (item: any) {
    return [item.symbol, item.direction, item.score.toFixed(0), Math.round(item.confidence * 100) + '%', item.rationale.join(', ')]
  })
  const eventRows = payload.nextEvents.map(function (item: any) {
    return [item.title, item.country, item.impact, String(item.forecast ?? '-'), String(item.actual ?? '-'), item.status]
  })
  const thresholdRows = keyEvent ? [[threshold(keyEvent.forecast, 0.2), threshold(keyEvent.forecast, -0.2), String(keyEvent.forecast ?? '-'), detail ? detail.whyItMatters : keyEvent.whyItMatters]] : [['-', '-', '-', 'No catalyst loaded']]
  const assetLinks = trackedAssets.map(function (item: string) {
    return h('span', { key: item, className: 'rounded-full border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.16em] text-slate-300' }, item)
  })
  return h(PageShell, { title: 'Dashboard', subtitle: 'Cross-asset state, the next key catalyst, and an immediately actionable reaction framework.', active: 'dashboard' }, h('div', { className: 'space-y-5' }, [
    h('div', { key: 'assets', className: 'flex flex-wrap gap-2' }, assetLinks),
    h(MetricGrid, { key: 'metrics', items: payload.metrics }),
    h('div', { key: 'grid', className: 'grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_380px]' }, [
      h('div', { key: 'left', className: 'space-y-5' }, [
        h(Panel, { key: 'edge', title: 'Today edge' }, h(DataTable, { headers: ['Window', 'Expected move', 'Consistency', 'Narrative'], rows: scenarioRows })),
        h(Panel, { key: 'consensus', title: 'Market consensus snapshot' }, h(DataTable, { headers: ['Asset', 'Direction', 'Score', 'Confidence', 'Themes'], rows: biasRows })),
      ]),
      h('div', { key: 'right', className: 'space-y-5' }, [
        h(Panel, { key: 'catalyst', title: 'Key catalyst' }, keyEvent ? h('div', { className: 'space-y-4 text-sm text-slate-300' }, [
          h(EventLink, { key: 'link', eventId: keyEvent.id, slug: keyEvent.slug, title: keyEvent.title, meta: keyEvent.country + ' / ' + keyEvent.impact + ' / ' + keyEvent.status }),
          h(DataTable, { key: 'thresholds', headers: ['Beat', 'Miss', 'Forecast', 'Sensitivity'], rows: thresholdRows }),
        ]) : h('div', { className: 'text-slate-500' }, 'No catalyst loaded.')),
        h(Panel, { key: 'regime', title: 'Risk regime summary' }, h('div', { className: 'space-y-3 text-sm text-slate-300' }, [
          h('div', { key: 'headline', className: 'text-xl font-medium text-white' }, payload.regime.label + ' / ' + payload.regime.trend),
          h('p', { key: 'copy', className: 'leading-7' }, payload.regime.interpretation),
          h('div', { key: 'confidence', className: 'text-slate-400' }, 'Confidence ' + Math.round(payload.regime.confidence * 100) + '% / score ' + payload.regime.score.toFixed(2)),
        ])),
      ]),
    ]),
    h(Panel, { key: 'events', title: 'Upcoming events' }, h(DataTable, { headers: ['Event', 'Country', 'Impact', 'Forecast', 'Actual', 'Status'], rows: eventRows })),
  ]))
}
