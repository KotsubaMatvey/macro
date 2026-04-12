import { createElement as h } from 'react' 
import type { ReactNode } from 'react' 
import type { TrackRecordPayload } from '@macroaccess/types' 
 
import { DataTable, MetricGrid, PageShell, Panel } from '@/components/app/chrome' 
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
 const byAssetRows: ReactNode[][] = payload.byAsset.map(function (item) { return [item.asset, String(item.sampleSize), pct(item.hitRate), num(item.magnitudeErrorPct)] }) 
 const bySignalRows: ReactNode[][] = payload.bySignalType.map(function (item) { return [item.signalType, String(item.sampleSize), pct(item.hitRate)] }) 
 const byRegimeRows: ReactNode[][] = (payload.byRegime ? payload.byRegime : []).map(function (item) { return [item.regime, String(item.sampleSize), pct(item.hitRate)] }) 
 const recentRows: ReactNode[][] = payload.recentRecords.map(function (item) { return [item.symbol, item.stance, num(item.expectedMove5dPct), num(item.realizedMove5dPct), item.outcome, item.regime ? item.regime : '-'] })
 return h(PageShell, { title: 'Track Record', subtitle: 'Replay evaluation surface for model posture, hit rate, and magnitude error across the current product history.', active: 'track-record', mode: payload.freshness.mode === 'demo' ? 'demo' : 'fallback' }, h('div', { className: 'space-y-5' }, [ 
  h(MetricGrid, { key: 'metrics', items: metrics }), 
  h('div', { key: 'grid', className: 'ws-two-panel' }, [ 
   h('div', { key: 'left', className: 'space-y-5' }, [ 
    h(Panel, { key: 'asset', title: 'By asset', subtitle: 'Hit rate and magnitude error by instrument.' }, h(DataTable, { headers: ['Asset', 'Samples', 'Hit rate', 'Magnitude error'], rows: byAssetRows.length !== 0 ? byAssetRows : [['-', '0', '-', '-']], dense: true })), 
    h(Panel, { key: 'recent', title: 'Recent records', subtitle: 'Most recent replay windows and outcomes.' }, h(DataTable, { headers: ['Asset', 'Stance', 'Expected 5d', 'Realized 5d', 'Outcome', 'Regime'], rows: recentRows.length !== 0 ? recentRows : [['-', '-', '-', '-', '-', '-']], dense: true, numericColumns: [2, 3] })), 
   ]), 
   h('div', { key: 'right', className: 'space-y-5' }, [ 
    h(Panel, { key: 'signal', title: 'By signal type', subtitle: 'Current evaluation buckets by signal family.' }, h(DataTable, { headers: ['Signal', 'Samples', 'Hit rate'], rows: bySignalRows.length !== 0 ? bySignalRows : [['trend-regime replay', '0', '-']], dense: true })), 
    h(Panel, { key: 'regime', title: 'By regime', subtitle: 'Replay outcomes segmented by broad macro backdrop.' }, h(DataTable, { headers: ['Regime', 'Samples', 'Hit rate'], rows: byRegimeRows.length !== 0 ? byRegimeRows : [['-', '0', '-']], dense: true })), 
   ]), 
  ]), 
 ]))
}
