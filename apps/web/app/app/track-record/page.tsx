import { createElement as h } from 'react'
import type { ReactNode } from 'react'

import { Badge, DataTable, MetricGrid, PageShell, Panel, ScoreBar } from '@/components/app/chrome'
import { getTrackRecord } from '@/lib/server/api'

function pct(value?: number) {
 return value === undefined || value === null ? '-' : Math.round(value * 100) + '%'
}

function num(value?: number) {
 return value === undefined || value === null ? '-' : value.toFixed(2)
}

export default async function TrackRecordPage() {
 const payload = await getTrackRecord()
 const metrics = [
  { label: 'Mode', value: payload.label, note: payload.note },
  { label: 'Hit rate', value: pct(payload.hitRate), note: 'Replay only, not audited live PnL' },
  { label: 'Magnitude error', value: num(payload.magnitudeErrorPct), note: 'Average absolute miss versus expected move' },
  { label: 'Sample size', value: String(payload.sampleSize), note: payload.freshness.mode + ' / ' + payload.freshness.freshness },
 ]
 const byAssetRows: ReactNode[][] = payload.byAsset.map(function (item) { return [item.asset, String(item.sampleSize), h(ScoreBar, { value: item.hitRate * 100, label: 'hit', tone: item.hitRate >= 0.55 ? 'live' : 'warn' }), num(item.magnitudeErrorPct)] })
 const bySignalRows: ReactNode[][] = payload.bySignalType.map(function (item) { return [item.signalType, String(item.sampleSize), h(ScoreBar, { value: item.hitRate ? item.hitRate * 100 : 0, label: 'hit', tone: item.hitRate && item.hitRate >= 0.55 ? 'live' : 'warn' })] })
 const byRegimeRows: ReactNode[][] = (payload.byRegime ? payload.byRegime : []).map(function (item) { return [item.regime, String(item.sampleSize), h(ScoreBar, { value: item.hitRate * 100, label: 'hit', tone: item.hitRate >= 0.55 ? 'live' : 'warn' })] })
 const recentRows: ReactNode[][] = payload.recentRecords.map(function (item) { return [item.symbol, item.stance, num(item.expectedMove5dPct), num(item.realizedMove5dPct), item.outcome, item.regime ? item.regime : '-'] })
 return h(PageShell, { title: 'Track Record', subtitle: 'Evaluation lab for replay outcomes, signal consistency, and error discipline over closed windows.', active: 'track-record', mode: 'fallback' }, h('div', { className: 'space-y-4' }, [
  h(MetricGrid, { key: 'metrics', items: metrics }),
  h(Panel, { key: 'integrity', title: 'Replay integrity', subtitle: 'This surface is explicitly replay-only; no live discretionary PnL claims are implied.', level: 'integrity' }, h('div', { className: 'ws-status-band' }, [
   h(Badge, { key: 'mode' }, payload.mode),
   h(Badge, { key: 'freshness' }, payload.freshness.freshness),
   h(Badge, { key: 'runtime' }, payload.freshness.mode),
   h(Badge, { key: 'source' }, payload.freshness.source),
  ])),
  h('div', { key: 'grid', className: 'ws-two-panel' }, [
   h('div', { key: 'left', className: 'space-y-4' }, [
    h(Panel, { key: 'asset', title: 'By asset', subtitle: 'Hit rate and magnitude error by instrument.', level: 'command' }, h(DataTable, { headers: ['Asset', 'Samples', 'Hit rate', 'Magnitude error'], rows: byAssetRows.length !== 0 ? byAssetRows : [['-', '0', '-', '-']], dense: true })),
    h(Panel, { key: 'recent', title: 'Recent records', subtitle: 'Latest replay windows with expected-versus-realized outcomes.', level: 'command' }, h(DataTable, { headers: ['Asset', 'Stance', 'Expected 5d', 'Realized 5d', 'Outcome', 'Regime'], rows: recentRows.length !== 0 ? recentRows : [['-', '-', '-', '-', '-', '-']], dense: true, numericColumns: [2, 3] })),
   ]),
   h('div', { key: 'right', className: 'space-y-4' }, [
    h(Panel, { key: 'signal', title: 'By signal type', subtitle: 'Evaluation buckets by signal family.', level: 'context' }, h(DataTable, { headers: ['Signal', 'Samples', 'Hit rate'], rows: bySignalRows.length !== 0 ? bySignalRows : [['trend-regime replay', '0', '-']], dense: true })),
    h(Panel, { key: 'regime', title: 'By regime', subtitle: 'Replay outcomes segmented by broad macro backdrop.', level: 'context' }, h(DataTable, { headers: ['Regime', 'Samples', 'Hit rate'], rows: byRegimeRows.length !== 0 ? byRegimeRows : [['-', '0', '-']], dense: true })),
   ]),
  ]),
 ]))
}
