import Link from 'next/link'
import { createElement as h } from 'react'
import type { DataMode } from '@macroaccess/types'

import { Badge, DataTable, MetricGrid, PageShell, Panel } from '@/components/app/chrome'
import { getReactions } from '@/lib/server/api'

type LiveReactionsSearchParamValue = string | readonly string[] | undefined

interface LiveReactionsSearchParams {
 family?: LiveReactionsSearchParamValue
 asset?: LiveReactionsSearchParamValue
 country?: LiveReactionsSearchParamValue
 currency?: LiveReactionsSearchParamValue
}

interface LiveReactionsPageProps {
 searchParams?: LiveReactionsSearchParams | Promise<LiveReactionsSearchParams | undefined>
}

function readParam(value: LiveReactionsSearchParamValue) {
 if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : ''
 if (typeof value === 'string') return value
 return ''
}

function pct(value?: number) {
 return value === undefined || value === null ? '-' : value.toFixed(2) + '%'
}

function hitRate(value: number) {
 return Math.round(value * 100) + '%'
}

function normalizeMode(value: string): DataMode {
 if (value === 'live' || value === 'demo' || value === 'fallback') return value
 return 'fallback'
}

function deriveSurfaceMode(marketMode: DataMode, calendarMode: DataMode) {
 if (marketMode === calendarMode) return marketMode
 return 'mixed' as const
}

async function resolveSearchParams(searchParams: LiveReactionsPageProps['searchParams']) {
 if (!searchParams) return undefined
 if (typeof (searchParams as Promise<LiveReactionsSearchParams>).then === 'function') {
  return await searchParams as LiveReactionsSearchParams | undefined
 }
 return searchParams as LiveReactionsSearchParams
}

export default async function LiveReactionsPage(props: LiveReactionsPageProps) {
 const searchParams = await resolveSearchParams(props.searchParams)
 const family = readParam(searchParams ? searchParams.family : undefined)
 const asset = readParam(searchParams ? searchParams.asset : undefined) || 'SPX'
 const country = readParam(searchParams ? searchParams.country : undefined)
 const currency = readParam(searchParams ? searchParams.currency : undefined)
 const payload = await getReactions(family, asset, country, currency)
 const marketMode = normalizeMode(payload.summary.freshness.mode)
 const calendarMode = normalizeMode(payload.calendar.mode)
 const surfaceMode = deriveSurfaceMode(marketMode, calendarMode)
 const metrics = [
  { label: 'Sample size', value: String(payload.summary.sampleSize), note: payload.summary.note },
  { label: 'Positive', value: String(payload.summary.directionDistribution.positive), note: 'Positive windows in the filtered study set' },
  { label: 'Negative', value: String(payload.summary.directionDistribution.negative), note: 'Negative windows in the filtered study set' },
  { label: 'Mode', value: surfaceMode, note: 'Market ' + marketMode + ' / Calendar ' + calendarMode + ' / ' + payload.calendar.note },
 ]
 const statRows = payload.summary.windowStats.map(function (item) { return [item.window, String(item.sampleSize), pct(item.meanMovePct), pct(item.medianMovePct), hitRate(item.positiveHitRate), hitRate(item.negativeHitRate)] })
 const recordRows = payload.records.map(function (item) { return [h(Link, { href: item.href, className: 'text-sky-300 transition hover:text-sky-200' }, item.title), item.scheduledAt.replace('T', ' ').slice(0, 16), item.country, item.currency, pct(item.windows.immediate), pct(item.windows['1h']), pct(item.windows['4h']), pct(item.windows['1d']), pct(item.windows['5d'])] })
 const familyLinks = payload.familyOptions.slice(0, 6).map(function (item) { return h(Link, { key: item, href: '/app/live-reactions?family=' + encodeURIComponent(item), className: 'ws-toolbar-chip' }, item) })
 const assetLinks = payload.assetOptions.map(function (item) { return h(Link, { key: item, href: '/app/live-reactions?asset=' + encodeURIComponent(item), className: 'ws-toolbar-chip' }, item) })
 const graphHref = payload.filters.family ? '/app/relationship-map?entity_type=reaction_family&ref_id=' + encodeURIComponent(payload.filters.family) : '/app/relationship-map'
 const workflowRows = [
  [h(Link, { href: '/app/macro-calendar', className: 'text-sky-300 transition hover:text-sky-200' }, 'Open macro calendar'), 'Move from reaction windows to the upcoming release tape for the same family/country context.'],
  [h(Link, { href: '/app/news?event_family=' + encodeURIComponent(payload.filters.family || ''), className: 'text-sky-300 transition hover:text-sky-200' }, 'Open linked news'), 'Validate whether current narrative flow supports the historical directional distribution.'],
  [h(Link, { href: '/app/market-bias?asset=' + encodeURIComponent(payload.filters.asset), className: 'text-sky-300 transition hover:text-sky-200' }, 'Open bias context'), 'Check if factor posture aligns with the reaction distribution for the selected asset.'],
  [h(Link, { href: graphHref, className: 'text-sky-300 transition hover:text-sky-200' }, 'Open relationship map'), 'Inspect graph-linked entities around this reaction family and connected events/assets.'],
  [h(Link, { href: '/app/data-sources', className: 'text-sky-300 transition hover:text-sky-200' }, 'Open data sources'), 'Verify market/calendar freshness and fallback modes behind the active reaction study.'],
  [h(Link, { href: '/app/workspaces', className: 'text-sky-300 transition hover:text-sky-200' }, 'Open workspaces'), 'Save the current family/asset filter deck as a reusable review preset.'],
 ]
 return h(PageShell, { title: 'Reactions', subtitle: 'Analysis tape for event response windows with explicit calendar-vs-market mode honesty.', active: 'live-reactions', mode: surfaceMode }, h('div', { className: 'space-y-4' }, [
  h(MetricGrid, { key: 'metrics', items: metrics }),
  h(Panel, { key: 'filters', title: 'Control deck', subtitle: 'Pivot the analysis tape by event family, region, and asset without losing statistical context.', level: 'command' }, [
   h('div', { key: 'badges', className: 'ws-status-band' }, [
    h(Badge, { key: 'family' }, payload.filters.family ? payload.filters.family : 'All families'),
    h(Badge, { key: 'asset', accent: true }, payload.filters.asset),
    h(Badge, { key: 'country' }, payload.filters.country ? payload.filters.country : 'All countries'),
    h(Badge, { key: 'currency' }, payload.filters.currency ? payload.filters.currency : 'All currencies'),
    h(Badge, { key: 'calendar-mode' }, 'calendar ' + calendarMode),
    h(Badge, { key: 'market-mode' }, 'market ' + marketMode),
   ]),
   h('div', { key: 'families', className: 'ws-toolbar mt-3' }, [h(Link, { key: 'all', href: '/app/live-reactions', className: 'ws-toolbar-chip' }, 'All families'), ...familyLinks]),
   h('div', { key: 'assets', className: 'ws-toolbar mt-2' }, assetLinks),
  ]),
  h('div', { key: 'grid', className: 'ws-two-panel' }, [
   h('div', { key: 'left', className: 'space-y-4' }, [
    h(Panel, { key: 'summary', title: 'Window summary', subtitle: 'Comparable reaction windows only; unsupported intervals remain out of sample.', level: 'command' }, h(DataTable, { headers: ['Window', 'Samples', 'Mean', 'Median', 'Positive', 'Negative'], rows: statRows.length !== 0 ? statRows : [['-', '0', '-', '-', '-', '-']], dense: true, numericColumns: [1, 2, 3, 4, 5] })),
    h(Panel, { key: 'records', title: 'Reaction tape', subtitle: 'Event-level outcomes with direct pivots back to source event context.', level: 'command' }, h(DataTable, { headers: ['Event', 'Scheduled', 'Country', 'CCY', 'Immediate', '1h', '4h', '1d', '5d'], rows: recordRows.length !== 0 ? recordRows : [['No matching reactions', '-', '-', '-', '-', '-', '-', '-', '-']], dense: true, numericColumns: [4, 5, 6, 7, 8], stickyHeader: true })),
   ]),
   h('div', { key: 'right', className: 'space-y-4' }, [
   h(Panel, { key: 'integrity', title: 'Integrity notes', subtitle: 'Source posture, replay constraints, and fallback boundaries are surfaced directly.', level: 'integrity' }, h(DataTable, { headers: ['Field', 'Value'], rows: [['Surface mode', surfaceMode], ['Calendar mode', calendarMode], ['Calendar freshness', payload.calendar.freshness], ['Market freshness', payload.summary.freshness.freshness], ['Study note', payload.summary.note]], dense: true })),
   h(Panel, { key: 'distribution', title: 'Directional distribution', subtitle: 'Directional balance across the current filtered sample set.', level: 'context' }, h(DataTable, { headers: ['Direction', 'Count'], rows: [['Positive', String(payload.summary.directionDistribution.positive)], ['Negative', String(payload.summary.directionDistribution.negative)], ['Flat', String(payload.summary.directionDistribution.flat)]], dense: true, numericColumns: [1] })),
    h(Panel, { key: 'workflow', title: 'Workflow pivots', subtitle: 'Cross-surface follow-through from reaction studies into graph, provider, and workspace workflows.', level: 'support' }, h(DataTable, { headers: ['Module', 'Use'], rows: workflowRows, dense: true })),
   ]),
  ]),
 ]))
}
