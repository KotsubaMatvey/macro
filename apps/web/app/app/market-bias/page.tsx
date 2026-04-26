import Link from 'next/link'
import { createElement as h } from 'react'
import type { ReactNode } from 'react'
import type { DataMode } from '@macroaccess/types'

import { Badge, DataTable, MetricGrid, PageShell, Panel, ScoreBar } from '@/components/app/chrome'
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
  { label: 'Live assets', value: String(payload.providerStatus.live), note: 'Provider-backed instruments feeding factor decomposition' },
  { label: 'Degraded', value: String(payload.providerStatus.degraded), note: 'Surface ' + surfaceMode + ' / Summary ' + summaryMode + ' / ' + payload.summary.freshness.freshness },
 ]
 const factorRows: ReactNode[][] = payload.factors.map(function (item) { return [item.label, item.direction, h(ScoreBar, { value: Math.abs(item.score), label: 'score', tone: item.direction === 'bearish' || item.direction === 'restrictive' ? 'bad' : 'live' }), h(ScoreBar, { value: Math.round(item.confidence * 100), label: 'conf', tone: item.confidence >= 0.7 ? 'live' : 'warn' }), item.detail] })
 const assetRows: ReactNode[][] = payload.assets.map(function (item) { return [item.symbol, item.direction, h(ScoreBar, { value: Math.abs(item.score), label: 'score', tone: item.direction === 'bearish' ? 'bad' : 'live' }), pct(item.change1d), pct(item.change30d), item.freshness.mode + ' / ' + item.freshness.freshness] })
 const leadAsset = payload.assets[0] ? payload.assets[0].symbol : ''
 const workflowRows: ReactNode[][] = [
  [h(Link, { href: '/app/news?asset=' + encodeURIComponent(leadAsset), className: 'terminal-link text-sm' }, 'Open linked news'), 'Scan headlines touching the current lead asset and validate narrative alignment.'],
  [h(Link, { href: '/app/live-reactions?asset=' + encodeURIComponent(leadAsset || 'SPX'), className: 'terminal-link text-sm' }, 'Open reactions'), 'Check event-window behavior for the same asset before acting on bias direction.'],
  [h(Link, { href: '/app/relationship-map?entity_type=asset&ref_id=' + encodeURIComponent(leadAsset || 'SPX'), className: 'terminal-link text-sm' }, 'Open relationship map'), 'Inspect graph-linked events, clusters, reports, and reactions around this asset node.'],
  [h(Link, { href: '/app/data-sources', className: 'terminal-link text-sm' }, 'Open data sources'), 'Audit provider freshness and fallback states behind current factor decomposition.'],
  [h(Link, { href: '/app/workspaces', className: 'terminal-link text-sm' }, 'Open workspaces'), 'Persist the current bias/reactions/news route set as a reusable review desk.'],
 ]
 const notes = payload.factors.slice(0, 4).map(function (item) {
  return h('div', { key: item.key, className: 'ws-feed-card' }, [
   h('div', { key: 'meta', className: 'ws-status-band' }, [
    h(Badge, { key: 'direction' }, item.direction),
    h(Badge, { key: 'mode' }, item.source.mode),
    h(Badge, { key: 'fresh' }, item.source.freshness),
   ]),
   h('div', { key: 'title', className: 'mt-2 flex flex-wrap items-center gap-2 text-sm font-medium text-white' }, [item.label, h(Badge, { key: 'score' }, item.score.toFixed(1))]),
   h('p', { key: 'body', className: 'mt-2 text-sm leading-6 text-slate-400' }, item.note),
   h('div', { key: 'src', className: 'mt-2 text-[10px] uppercase tracking-[0.16em] text-slate-500' }, item.source.source),
  ])
 })
 return h(PageShell, { title: 'Market Bias', subtitle: 'Factor board with decomposition-first hierarchy and instrument-level influence clarity.', active: 'market-bias', mode: surfaceMode }, h('div', { className: 'space-y-4' }, [
  h(MetricGrid, { key: 'metrics', items: metrics }),
  h(Panel, { key: 'status', title: 'Integrity strip', subtitle: 'Summary mode, provider posture, and freshness state are visible before interpretation.', level: 'integrity' }, h('div', { className: 'ws-status-band' }, [
   h(Badge, { key: 'surface', accent: surfaceMode === 'live' }, 'surface ' + surfaceMode),
   h(Badge, { key: 'summary' }, 'summary ' + summaryMode),
   h(Badge, { key: 'fresh' }, payload.summary.freshness.freshness),
   h(Badge, { key: 'source' }, payload.summary.freshness.source),
  ])),
  h('div', { key: 'grid', className: 'ws-two-panel' }, [
   h('div', { key: 'left', className: 'space-y-4' }, [
   h(Panel, { key: 'factors', title: 'Factor contributions', subtitle: 'Direction, score, confidence, and mechanism detail by factor.', level: 'command' }, h(DataTable, { headers: ['Factor', 'Direction', 'Score', 'Confidence', 'Detail'], rows: factorRows, dense: true, numericColumns: [2, 3] })),
   h(Panel, { key: 'assets', title: 'Asset influence', subtitle: 'Instrument-level posture from factor stack and market tape.', level: 'command' }, h(DataTable, { headers: ['Asset', 'Direction', 'Score', '1d', '30d', 'Freshness'], rows: assetRows, dense: true, numericColumns: [2, 3, 4] })),
  ]),
  h('div', { key: 'right', className: 'space-y-4' }, [
   h(Panel, { key: 'notes', title: 'Factor notes', subtitle: 'Operator notes for the highest-weight active factors.', level: 'context' }, h('div', { className: 'grid gap-2.5' }, notes)),
    h(Panel, { key: 'workflow', title: 'Workflow pivots', subtitle: 'Cross-surface follow-through from bias into graph, provider, and workspace operations.', level: 'support' }, h(DataTable, { headers: ['Module', 'Use'], rows: workflowRows, dense: true })),
   ]),
  ]),
 ]))
}
