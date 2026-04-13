import { createElement as h } from 'react'
import type { ReactNode } from 'react'
import type { WeeklyReport } from '@macroaccess/types'

import { Badge, DataTable, MetricGrid, PageShell, Panel } from '@/components/app/chrome'
import { getReports } from '@/lib/server/api'

function watchItems(report: WeeklyReport) {
 const body = report.body as { watchItems?: unknown }
 return Array.isArray(body.watchItems) ? body.watchItems.slice(0, 3).join(' / ') : '-'
}

function reportSurfaceMode(mode: string | undefined) {
 if (mode === 'live') return 'live' as const
 if (mode === 'demo') return 'demo' as const
 if (mode === 'deterministic' || mode === 'replay') return 'fallback' as const
 return 'fallback' as const
}

export default async function ReportsPage() {
 const reports = await getReports()
 const latest = reports[0]
 const metrics = [
  { label: 'Reports', value: String(reports.length), note: 'Structured weekly briefs archived in the workstation' },
  { label: 'Mode', value: latest ? latest.mode : 'none', note: 'Generation mode for latest digest' },
  { label: 'Latest week', value: latest ? latest.weekStart : '-', note: latest ? latest.weekEnd : 'No report generated yet' },
  { label: 'Status', value: latest ? latest.status : '-', note: latest ? latest.summary : 'No report generated yet' },
 ]
 const rows: ReactNode[][] = reports.map(function (item) { return [item.title, item.weekStart + ' / ' + item.weekEnd, item.mode, item.status, watchItems(item)] })
 const cards = reports.slice(0, 4).map(function (item) {
  return h('div', { key: item.id, className: 'ws-feed-card' }, [
   h('div', { key: 'meta', className: 'ws-status-band' }, [
    h(Badge, { key: 'mode' }, item.mode),
    h(Badge, { key: 'status' }, item.status),
   ]),
   h('div', { key: 'title', className: 'mt-2 text-sm font-medium text-white' }, item.title),
   h('div', { key: 'period', className: 'mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-500' }, item.weekStart + ' / ' + item.weekEnd),
   h('p', { key: 'body', className: 'mt-2 text-sm leading-6 text-slate-400' }, item.summary),
   h('div', { key: 'watch', className: 'mt-2 text-[10px] uppercase tracking-[0.16em] text-slate-500' }, watchItems(item)),
  ])
 })
 return h(PageShell, { title: 'Reports', subtitle: 'Archive and digest surface for weekly macro summaries with explicit generation-mode labeling.', active: 'reports', mode: reportSurfaceMode(latest ? latest.mode : undefined) }, h('div', { className: 'space-y-4' }, [
  h(MetricGrid, { key: 'metrics', items: metrics }),
  h(Panel, { key: 'integrity', title: 'Archive integrity', subtitle: 'Digest mode is explicit: deterministic/replay output is visible without live-feed pretense.', level: 'integrity' }, h('div', { className: 'ws-status-band' }, [
   h(Badge, { key: 'surface' }, reportSurfaceMode(latest ? latest.mode : undefined)),
   h(Badge, { key: 'latest-mode' }, latest ? latest.mode : 'none'),
   h(Badge, { key: 'latest-status' }, latest ? latest.status : 'none'),
  ])),
  h('div', { key: 'grid', className: 'ws-two-panel' }, [
   h('div', { key: 'left', className: 'space-y-4' }, [
    h(Panel, { key: 'archive', title: 'Report archive', subtitle: 'Weekly briefs sorted for quick desk retrieval and mode-aware context.', level: 'command' }, h(DataTable, { headers: ['Title', 'Week', 'Mode', 'Status', 'Watch items'], rows: rows.length !== 0 ? rows : [['No report', '-', '-', '-', '-']], dense: true })),
   ]),
   h('div', { key: 'right', className: 'space-y-4' }, [
    h(Panel, { key: 'latest', title: 'Latest briefs', subtitle: 'Recent digest cards with compact reading rhythm and watch-item scan.', level: 'support' }, cards.length !== 0 ? h('div', { className: 'grid gap-2.5' }, cards) : h('div', { className: 'text-sm text-slate-500' }, 'No reports generated yet.')),
   ]),
  ]),
 ]))
}
