import { createElement as h } from 'react'
import type { ReactNode } from 'react'
import type { DataMode } from '@macroaccess/types'

import { Badge, DataTable, MetricGrid, PageShell, Panel } from '@/components/app/chrome'
import { getMarketBiasInsights } from '@/lib/server/api'

function pct(value: number) {
 return value.toFixed(2) + '%'
}

function normalizeMode(value: string): DataMode {
 if (value === 'live' || value === 'demo' || value === 'fallback') return value
 return 'fallback'
}

function deriveSurfaceMode(summaryMode: DataMode, liveAssets: number, degradedAssets: number) {
 if (degradedAssets === 0) return summaryMode
 if (summaryMode === 'fallback' && liveAssets === 0) return 'fallback'
 return 'mixed' as const
}

export default async function MarketBiasPage() {
 const payload = await getMarketBiasInsights()
 const summaryMode = normalizeMode(payload.summary.freshness.mode)
 const surfaceMode = deriveSurfaceMode(summaryMode, payload.providerStatus.live, payload.providerStatus.degraded)
 const metrics = [
  { label: 'Bias', value: payload.summary.label, note: payload.summary.note },
  { label: 'Score', value: payload.summary.score.toFixed(1), note: String(Math.round(payload.summary.confidence * 100)) + '% confidence' },
  { label: 'Live assets', value: String(payload.providerStatus.live), note: 'Provider-backed instruments feeding the influence surface' },
  { label: 'Degraded', value: String(payload.providerStatus.degraded), note: 'Surface mode ' + surfaceMode + ' / Summary mode ' + summaryMode + ' / ' + payload.summary.freshness.freshness },
 ]
 const factorRows: ReactNode[][] = payload.factors.map(function (item) { return [item.label, item.direction, item.score.toFixed(1), String(Math.round(item.confidence * 100)) + '%', item.detail] })
 const assetRows: ReactNode[][] = payload.assets.map(function (item) { return [item.symbol, item.direction, item.score.toFixed(1), pct(item.change1d), pct(item.change30d), item.freshness.mode + ' / ' + item.freshness.freshness] })
 const notes = payload.factors.slice(0, 4).map(function (item) { return h('div', { key: item.key, className: 'ws-feed-card' }, [h('div', { key: 'meta', className: 'text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500' }, item.label), h('div', { key: 'title', className: 'mt-2 flex flex-wrap items-center gap-2 text-sm font-medium text-white' }, [item.direction, h(Badge, { key: 'score' }, item.score.toFixed(1))]), h('p', { key: 'body', className: 'mt-2 text-sm leading-6 text-slate-400' }, item.note), h('div', { key: 'src', className: 'mt-3 text-[11px] uppercase tracking-[0.16em] text-slate-500' }, item.source.source)]) })
 return h(PageShell, { title: 'Market Bias', subtitle: 'Factor influence surface with explicit live and degraded labeling across macro and market inputs.', active: 'market-bias', mode: surfaceMode }, h('div', { className: 'space-y-5' }, [
  h(MetricGrid, { key: 'metrics', items: metrics }),
  h('div', { key: 'grid', className: 'ws-two-panel' }, [
   h('div', { key: 'left', className: 'space-y-5' }, [h(Panel, { key: 'factors', title: 'Factor contributions', subtitle: 'Direction, score, confidence, and desk detail by factor.' }, h(DataTable, { headers: ['Factor', 'Direction', 'Score', 'Confidence', 'Detail'], rows: factorRows, dense: true, numericColumns: [2, 3] })), h(Panel, { key: 'assets', title: 'Asset influence', subtitle: 'Instrument-level posture built from the factor layer and live market tape.' }, h(DataTable, { headers: ['Asset', 'Direction', 'Score', '1d', '30d', 'Freshness'], rows: assetRows, dense: true, numericColumns: [2, 3, 4] }))]),
   h('div', { key: 'right', className: 'space-y-5' }, [h(Panel, { key: 'notes', title: 'Factor notes', subtitle: 'Short operator notes for the strongest current influences.' }, h('div', { className: 'grid gap-3' }, notes))]),
  ]),
 ]))
}
