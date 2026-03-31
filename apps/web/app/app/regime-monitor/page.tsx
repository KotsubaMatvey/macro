import Link from 'next/link'
import { createElement as h } from 'react'
import type { ReactNode } from 'react'
import type { EventRelease, MarketBiasSnapshot, RegimeComponent } from '@macroaccess/types'

import { Badge, DataTable, MetricGrid, PageShell, Panel } from '@/components/app/chrome'
import { getEvents, getWorkstation } from '@/lib/server/api'

function alignmentRead(score: number, bias: MarketBiasSnapshot) {
 const regimeDirection = Math.sign(score)
 if (regimeDirection === 0) return 'Backdrop is mixed, so bias needs cleaner catalyst confirmation.'
 if (regimeDirection === 1) {
  if (bias.direction === 'Bullish') return 'Bias is aligned with the supportive regime backdrop.'
 }
 if (regimeDirection === -1) {
  if (bias.direction === 'Bearish') return 'Bias is aligned with the defensive regime backdrop.'
 }
 return 'Bias is fighting the current regime, so conviction should stay lower.'
}

function barWidth(value: number) {
 const raw = Math.min(Math.abs(value) * 100, 100)
 return raw.toFixed(0) + '%'
}

function barTone(value: number) {
 return 'bg-rose-400/70'
}

function componentBoard(title: string, items: RegimeComponent[]) {
 return h('div', { className: 'grid gap-3' }, items.map(function (item) {
  return h('div', { key: title + item.key, className: 'ws-feed-card' }, [
   h('div', { key: 'top', className: 'flex items-center justify-between gap-3' }, [
    h('div', { key: 'label', className: 'text-[11px] uppercase tracking-[0.16em] text-slate-500' }, item.label),
    h('div', { key: 'value', className: 'ws-mono text-sm text-white' }, item.value.toFixed(2)),
   ]),
   h('div', { key: 'track', className: 'mt-3 h-2 rounded-full bg-white/[0.06]' }, h('div', { className: 'h-2 rounded-full ' + barTone(item.value), style: { width: barWidth(item.value) } })),
  ])
 }))
}

export default async function RegimeMonitorPage() {
 const payload = await getWorkstation()
 const events = await getEvents()
 const macroKeys = ['growth', 'liquidity', 'inflation']
 const macroLayer = payload.regime.components.filter(function (item: RegimeComponent) { return macroKeys.includes(item.key) })
 const riskLayer = payload.regime.components.filter(function (item: RegimeComponent) { return !macroKeys.includes(item.key) })
 const forwardEvents = events.filter(function (item: EventRelease) {
  if (item.impact !== 'High') return false
  if (item.status === 'Upcoming') return true
  return item.status === 'Live'
 })
 const eventRiskRows: ReactNode[][] = forwardEvents.slice(0, 6).map(function (item: EventRelease) {
  return [item.title, item.relatedAssets.join(', '), item.whyItMatters]
 })
 const topBiases = payload.biases.slice().sort(function (left, right) { return right.confidence - left.confidence }).slice(0, 5)
 const biasFitRows: ReactNode[][] = topBiases.map(function (item: MarketBiasSnapshot) {
  return [item.symbol, item.direction, Math.round(item.confidence * 100) + '%', alignmentRead(payload.regime.score, item)]
 })
 const metrics = [
  { label: 'State', value: payload.regime.label, note: payload.regime.trend },
  { label: 'Score', value: payload.regime.score.toFixed(2), note: 'Directional composite' },
  { label: 'Confidence', value: Math.round(payload.regime.confidence * 100) + '%', note: 'Model certainty' },
  { label: 'Components', value: String(payload.regime.components.length), note: 'Tracked regime dimensions' },
 ]
 const componentRows: ReactNode[][] = payload.regime.components.map(function (item: RegimeComponent) { return [item.key, item.label, item.value.toFixed(2)] })
 const workflowRows: ReactNode[][] = [
  [h(Link, { href: '/app/dashboard', className: 'text-sky-300 transition hover:text-sky-200' }, 'Open dashboard'), 'Check whether the next catalyst sits inside a supportive or hostile backdrop.'],
  [h(Link, { href: '/app/market-bias', className: 'text-sky-300 transition hover:text-sky-200' }, 'Open market bias'), 'Use the regime to decide whether consensus should be trusted or discounted.'],
  [h(Link, { href: '/app/live-reactions', className: 'text-sky-300 transition hover:text-sky-200' }, 'Open live reactions'), 'Higher-conviction regimes usually support cleaner post-event follow-through.'],
 ]
 return h(PageShell, { title: 'Liquidity Regime', subtitle: payload.regime.interpretation, active: 'regime-monitor' }, h('div', { className: 'space-y-5' }, [
  h(MetricGrid, { key: 'metrics', items: metrics }),
  h(Panel, { key: 'board', title: 'Regime board', subtitle: 'Use the regime as a filter before trusting catalysts, bias, or reaction follow-through.' }, [
   h('div', { key: 'badges', className: 'flex flex-wrap gap-2' }, [h(Badge, { key: 'state', accent: true }, payload.regime.label), h(Badge, { key: 'trend' }, payload.regime.trend), h(Badge, { key: 'score' }, payload.regime.score.toFixed(2))]),
   h('div', { key: 'utility', className: 'mt-4 ws-utility-strip' }, [
    h('div', { key: 'macro', className: 'ws-note-card' }, [h('div', { key: 'label', className: 'text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500' }, 'Macro layer'), h('div', { key: 'value', className: 'mt-2 text-sm font-medium text-white' }, String(macroLayer.length) + ' signals')]),
    h('div', { key: 'risk', className: 'ws-note-card' }, [h('div', { key: 'label', className: 'text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500' }, 'Risk layer'), h('div', { key: 'value', className: 'mt-2 text-sm font-medium text-white' }, String(riskLayer.length) + ' signals')]),
    h('div', { key: 'stress', className: 'ws-note-card' }, [h('div', { key: 'label', className: 'text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500' }, 'Event stress'), h('div', { key: 'value', className: 'mt-2 text-sm font-medium text-white' }, String(forwardEvents.length) + ' catalysts')]),
    h('div', { key: 'method', className: 'ws-note-card' }, [h('div', { key: 'label', className: 'text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500' }, 'Method'), h('div', { key: 'value', className: 'mt-2 text-sm font-medium text-white' }, 'Layered composite')]),
   ]),
  ]),
  h('div', { key: 'grid', className: 'ws-page-grid' }, [
   h('div', { key: 'left', className: 'space-y-5' }, [
    h(Panel, { key: 'macro', title: 'Macro liquidity layer', subtitle: 'Primary macro inputs driving the current regime state.' }, componentBoard('macro', macroLayer)),
    h(Panel, { key: 'risk', title: 'Risk appetite layer', subtitle: 'Secondary risk-taking inputs supporting or fighting the macro layer.' }, componentBoard('risk', riskLayer)),
    h(Panel, { key: 'components', title: 'Full component table', subtitle: 'Transparent component register for the desk and admin view.' }, h(DataTable, { headers: ['Key', 'Label', 'Score'], rows: componentRows, numericColumns: [2], dense: true })),
   ]),
   h('div', { key: 'right', className: 'space-y-5' }, [
    h(Panel, { key: 'events', title: 'Event risk window', subtitle: 'High-impact catalysts that can still stress the regime read.' }, h(DataTable, { headers: ['Event', 'Assets', 'Why it matters'], rows: eventRiskRows.length !== 0 ? eventRiskRows : [['No high-impact events', '-', 'No catalyst stress tests are loaded right now']], dense: true })),
    h(Panel, { key: 'bias', title: 'Bias fit', subtitle: 'Highest-conviction bias calls measured against the current regime.' }, h(DataTable, { headers: ['Asset', 'Direction', 'Confidence', 'Regime read'], rows: biasFitRows.length !== 0 ? biasFitRows : [['No bias', '-', '-', 'No bias payload returned']], dense: true })),
    h(Panel, { key: 'workflow', title: 'Workflow use', subtitle: 'Next surfaces that need the regime filter.' }, h(DataTable, { headers: ['Module', 'Use'], rows: workflowRows, dense: true })),
   ]),
  ]),
 ]))
}
