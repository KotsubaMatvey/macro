/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { createElement as h } from 'react'

import { DataTable, MetricGrid, PageShell, Panel } from '@/components/app/chrome'
import { getWorkstation } from '@/lib/server/api'

export default async function MarketBiasPage() {
  const payload = await getWorkstation()
  const bullish = payload.biases.filter(function (item) { return item.direction === 'Bullish' }).length
  const neutral = payload.biases.filter(function (item) { return item.direction === 'Neutral' }).length
  const bearish = payload.biases.filter(function (item) { return item.direction === 'Bearish' }).length
  const metrics = [
    { label: 'Bullish calls', value: String(bullish), note: 'Assets with constructive directional read' },
    { label: 'Neutral calls', value: String(neutral), note: 'Watchlist candidates waiting for stronger confirmation' },
    { label: 'Bearish calls', value: String(bearish), note: 'Assets with softer relative setup' },
    { label: 'Tracked assets', value: String(payload.biases.length), note: 'Current demo consensus coverage' },
  ]
  const rows = payload.biases.map(function (item) {
    return [item.symbol, item.direction, item.score.toFixed(0), Math.round(item.confidence * 100) + '%', item.change1d.toFixed(0), item.change5d.toFixed(0), item.rationale.join(', ')]
  })
  return h(PageShell, { title: 'Market Bias', subtitle: 'Directional stance, confidence, and rationale collected into a compact decision surface.', active: 'market-bias' }, h('div', { className: 'space-y-5' }, [
    h(MetricGrid, { key: 'metrics', items: metrics }),
    h(Panel, { key: 'table', title: 'Per asset bias' }, h(DataTable, { headers: ['Asset', 'Direction', 'Score', 'Confidence', '1d', '5d', 'Themes'], rows: rows })),
    h(Panel, { key: 'notes', title: 'Consensus notes' }, h('div', { className: 'grid gap-3 text-sm text-slate-300 sm:grid-cols-2' }, payload.biases.slice(0, 4).map(function (item) {
      return h('div', { key: item.symbol, className: 'rounded-xl border border-white/8 p-4' }, [
        h('div', { key: 'symbol', className: 'text-lg font-medium text-white' }, item.symbol + ' / ' + item.direction),
        h('p', { key: 'body', className: 'mt-2 leading-7' }, item.rationale.join('. ') + '.'),
      ])
    }))),
  ]))
}
