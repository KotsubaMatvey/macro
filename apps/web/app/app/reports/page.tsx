import { createElement as h } from 'react' 
import type { ReactNode } from 'react' 
import type { WeeklyReport } from '@macroaccess/types' 
 
import { DataTable, MetricGrid, PageShell, Panel } from '@/components/app/chrome' 
import { getReports } from '@/lib/server/api' 
 
function watchItems(report: WeeklyReport) { 
 const body = report.body as { watchItems?: unknown } 
 return Array.isArray(body.watchItems) ? body.watchItems.slice(0, 3).join(' / ') : '-' 
} 
 
export default async function ReportsPage() { 
 const reports = await getReports() 
 const latest = reports[0] 
 const metrics = [ 
  { label: 'Reports', value: String(reports.length), note: 'Structured weekly briefs archived in the product' }, 
  { label: 'Mode', value: latest ? latest.mode : 'none', note: 'Current generation mode for the latest brief' }, 
  { label: 'Latest week', value: latest ? latest.weekStart : '-', note: latest ? latest.weekEnd : 'No report generated yet' }, 
  { label: 'Status', value: latest ? latest.status : '-', note: latest ? latest.summary : 'No report generated yet' }, 
 ] 
 const rows: ReactNode[][] = reports.map(function (item) { return [item.title, item.weekStart + ' / ' + item.weekEnd, item.mode, item.status, watchItems(item)] }) 
 const cards = reports.slice(0, 4).map(function (item) { return h('div', { key: item.id, className: 'ws-feed-card' }, [h('div', { key: 'meta', className: 'text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500' }, item.weekStart + ' / ' + item.mode), h('div', { key: 'title', className: 'mt-2 text-sm font-medium text-white' }, item.title), h('p', { key: 'body', className: 'mt-2 text-sm leading-6 text-slate-400' }, item.summary), h('div', { key: 'watch', className: 'mt-3 text-[11px] uppercase tracking-[0.16em] text-slate-500' }, watchItems(item))]) }) 
 return h(PageShell, { title: 'Reports', subtitle: 'Weekly macro brief archive grounded in the current data stack and explicit source freshness.', active: 'reports', mode: latest ? latest.mode === 'deterministic' ? 'fallback' : 'live' : 'fallback' }, h('div', { className: 'space-y-5' }, [ 
  h(MetricGrid, { key: 'metrics', items: metrics }), 
  h('div', { key: 'grid', className: 'ws-two-panel' }, [ 
   h('div', { key: 'left', className: 'space-y-5' }, [ 
    h(Panel, { key: 'archive', title: 'Report archive', subtitle: 'Weekly briefs with generation mode and desk watch items.' }, h(DataTable, { headers: ['Title', 'Week', 'Mode', 'Status', 'Watch items'], rows: rows.length !== 0 ? rows : [['No report', '-', '-', '-', '-']], dense: true })), 
   ]), 
   h('div', { key: 'right', className: 'space-y-5' }, [ 
    h(Panel, { key: 'latest', title: 'Latest briefs', subtitle: 'Recent weekly summaries generated from the structured data layer.' }, cards.length !== 0 ? h('div', { className: 'grid gap-3' }, cards) : h('div', { className: 'text-sm text-slate-500' }, 'No reports generated yet.')), 
   ]), 
  ]), 
 ]))
}
