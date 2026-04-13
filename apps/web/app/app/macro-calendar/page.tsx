import Link from 'next/link'
import { createElement as h } from 'react'
import type { ReactNode } from 'react'
import type { DataMode, EventRelease, Watchlist } from '@macroaccess/types'

import { Badge, DataTable, EventLink, KeyValueList, MetricGrid, PageShell, Panel } from '@/components/app/chrome'
import { getEvents, getWorkstation } from '@/lib/server/api'

type CalendarImpactFilter = '' | 'High' | 'Medium' | 'Low'
type CalendarDataMode = DataMode
type CalendarShellMode = CalendarDataMode | 'mixed'
type CalendarSearchParamValue = string | readonly string[] | undefined

interface CalendarFilterState {
 impact: CalendarImpactFilter
 currency: string
 status: string
 region: string
 category: string
 family: string
 search: string
}

interface MacroCalendarSearchParams {
 impact?: CalendarSearchParamValue
 currency?: CalendarSearchParamValue
 status?: CalendarSearchParamValue
 region?: CalendarSearchParamValue
 category?: CalendarSearchParamValue
 family?: CalendarSearchParamValue
 search?: CalendarSearchParamValue
}

interface MacroCalendarPageProps {
 searchParams?: Promise<MacroCalendarSearchParams | undefined>
}

function verdict(item: EventRelease) {
 if (item.actual === undefined) return 'Pending'
 if (item.forecast === undefined) return 'Pending'
 if (item.surprise !== undefined) {
  const surpriseDirection = Math.sign(item.surprise)
  if (surpriseDirection === -1) return 'Miss'
  if (surpriseDirection === 0) return 'Inline'
  return 'Beat'
 }
 const printDirection = Math.sign(item.actual - item.forecast)
 if (printDirection === -1) return 'Miss'
 if (printDirection === 0) return 'Inline'
 return 'Beat'
}

function timeLabel(value: string) {
 return value.replace('T', ' ').slice(0, 16)
}

function canonicalImpact(value: string): CalendarImpactFilter {
 if (value.trim().toLowerCase() === 'high') return 'High'
 if (['medium', 'med'].includes(value.trim().toLowerCase())) return 'Medium'
 if (value.trim().toLowerCase() === 'low') return 'Low'
 return ''
}

function compactImpactLabel(value: string) {
 return canonicalImpact(value) === 'Medium' ? 'Med' : canonicalImpact(value)
}

function readParam(value: CalendarSearchParamValue) {
 if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : ''
 if (typeof value === 'string') return value
 return ''
}

function eventMode(item: EventRelease): CalendarDataMode {
 const mode = item.freshness ? item.freshness.mode : 'fallback'
 if (mode === 'live') return mode
 if (mode === 'demo') return mode
 return 'fallback'
}

function eventSource(item: EventRelease) {
 return item.freshness ? item.freshness.source : 'Unknown source'
}

function eventFreshness(item: EventRelease) {
 return item.freshness ? item.freshness.freshness : 'degraded'
}

function calendarHref(filters: CalendarFilterState, overrides: Partial<CalendarFilterState>) {
 const next = { impact: filters.impact, currency: filters.currency, status: filters.status, region: filters.region, category: filters.category, family: filters.family, search: filters.search, ...overrides }
 const params = new URLSearchParams()
 if (next.impact) params.set('impact', next.impact)
 if (next.currency) params.set('currency', next.currency)
 if (next.status) params.set('status', next.status)
 if (next.region) params.set('region', next.region)
 if (next.category) params.set('category', next.category)
 if (next.family) params.set('family', next.family)
 if (next.search) params.set('search', next.search)
 const query = params.toString()
 return query ? '/app/macro-calendar?' + query : '/app/macro-calendar'
}

function filterEvents(events: EventRelease[], filters: CalendarFilterState) {
 return events.filter(function (item: EventRelease) {
  if (filters.search) {
   const needle = filters.search.toLowerCase()
   const text = [item.title, item.family, item.country, item.category].join(' ').toLowerCase()
   if (!text.includes(needle)) return false
  }
  return true
 })
}

function applyCalendarFilters(events: EventRelease[], filters: CalendarFilterState) {
 const seeded = filterEvents(events, filters)
 return seeded.filter(function (item: EventRelease) {
  if (filters.impact) {
   if (canonicalImpact(item.impact) !== filters.impact) return false
  }
  if (filters.currency) {
   if (item.currency !== filters.currency) return false
  }
  if (filters.status) {
   if (item.status !== filters.status) return false
  }
  if (filters.region) {
   if (item.country !== filters.region) {
    if (item.currency !== filters.region) return false
   }
  }
  if (filters.category) {
   if (item.category !== filters.category) return false
  }
  if (filters.family) {
   if (item.family !== filters.family) return false
  }
  return true
 })
}

function countMode(events: EventRelease[], mode: CalendarDataMode) {
 return events.filter(function (item: EventRelease) { return eventMode(item) === mode }).length
}

function deriveShellMode(events: EventRelease[]): CalendarShellMode {
 const liveRows = countMode(events, 'live')
 const demoRows = countMode(events, 'demo')
 const fallbackRows = countMode(events, 'fallback')
 const activeModes = [liveRows, demoRows, fallbackRows].filter(function (value) { return value !== 0 }).length
 if (activeModes === 0) return 'fallback'
 if (activeModes !== 1) return 'mixed'
 if (liveRows !== 0) return 'live'
 if (demoRows !== 0) return 'demo'
 return 'fallback'
}

function sourceNote(events: EventRelease[]) {
 const notes = Array.from(new Set(events.map(function (item) { return item.freshness ? item.freshness.note : '' }).map(function (note) { return note.trim() }).filter(function (note) { return note.length !== 0 })))
 if (notes.length === 0) return 'Source note unavailable'
 if (notes.length === 1) return notes[0]
 return notes.slice(0, 3).join(' | ')
}

export default async function MacroCalendarPage(props: MacroCalendarPageProps) {
 const events = await getEvents()
 const payload = await getWorkstation()
 const searchParams = props.searchParams ? await props.searchParams : undefined
 const filters: CalendarFilterState = {
  impact: canonicalImpact(readParam(searchParams ? searchParams.impact : undefined)),
  currency: readParam(searchParams ? searchParams.currency : undefined),
  status: readParam(searchParams ? searchParams.status : undefined),
  region: readParam(searchParams ? searchParams.region : undefined),
  category: readParam(searchParams ? searchParams.category : undefined),
  family: readParam(searchParams ? searchParams.family : undefined),
  search: readParam(searchParams ? searchParams.search : undefined),
 }
 const filtered = applyCalendarFilters(events, filters)
 const watchSymbols = Array.from(new Set((payload.watchlists ? payload.watchlists : []).flatMap(function (list: Watchlist) { return list.items.map(function (item) { return item.symbol }) })))
 const currencies = Array.from(new Set(events.map(function (item: EventRelease) { return item.currency }))).slice(0, 6)
 const regions = Array.from(new Set(events.map(function (item: EventRelease) { return item.country }))).slice(0, 6)
 const categories = Array.from(new Set(events.map(function (item: EventRelease) { return item.category }))).slice(0, 6)
 const families = Array.from(new Set(events.map(function (item: EventRelease) { return item.family }))).slice(0, 6)
 const liveRows = countMode(filtered, 'live')
 const demoRows = countMode(filtered, 'demo')
 const fallbackRows = countMode(filtered, 'fallback')
 const degradedRows = demoRows + fallbackRows
 const datasetMode = deriveShellMode(events)
 const viewMode = deriveShellMode(filtered)
 const sourceLabels = Array.from(new Set(filtered.map(function (item: EventRelease) { return eventSource(item) }))).slice(0, 4)
 const metrics = [
  { label: 'Tracked releases', value: String(events.length), note: 'Calendar rows loaded into the standalone tape' },
  { label: 'Filtered rows', value: String(filtered.length), note: 'Rows matching the active control deck' },
  { label: 'Live rows', value: String(liveRows), note: 'Rows backed by live provider output in this view' },
  { label: 'Fallback rows', value: String(degradedRows), note: 'Demo or fallback continuity rows still visible in tape' },
 ]
 const rows: ReactNode[][] = filtered.map(function (item: EventRelease) {
  const watchedAssets = item.relatedAssets.filter(function (asset) { return watchSymbols.includes(asset) })
  return [timeLabel(item.scheduledAt), item.country + ' / ' + item.currency, h(EventLink, { eventId: item.id, slug: item.slug, title: item.title, meta: item.category + ' / ' + eventMode(item) + ' / ' + eventFreshness(item) }, item.title), compactImpactLabel(item.impact), item.status, item.actual !== undefined ? String(item.actual) : '-', item.forecast !== undefined ? String(item.forecast) : '-', verdict(item), eventSource(item), watchedAssets.length !== 0 ? watchedAssets.join(', ') : 'Open']
 })
 const sourceRows: ReactNode[][] = [
  ['Calendar mode (dataset)', datasetMode],
  ['View mode (filtered)', viewMode],
  ['Live / demo / fallback', String(liveRows) + ' / ' + String(demoRows) + ' / ' + String(fallbackRows)],
  ['Source labels', sourceLabels.length !== 0 ? sourceLabels.join(', ') : 'No rows in view'],
  ['Filter scope', filters.region ? filters.region : filters.category ? filters.category : filters.family ? filters.family : 'All regions / categories / families'],
 ]
 const familyRows: ReactNode[][] = families.map(function (family) { return [h(Link, { href: calendarHref(filters, { family: family }), className: 'text-sky-300 transition hover:text-sky-200' }, family), String(events.filter(function (item: EventRelease) { return item.family === family }).length)] })
 const highImpact = applyCalendarFilters(events, { impact: 'High', currency: filters.currency, status: filters.status, region: filters.region, category: filters.category, family: filters.family, search: filters.search }).slice(0, 6)
 const workflowRows: ReactNode[][] = [
  [h(Link, { href: '/app/alerts', className: 'text-sky-300 transition hover:text-sky-200' }, 'Open alerts'), 'Turn filtered rows into scheduled operator reminders before the print.'],
  [h(Link, { href: '/app/watchlists', className: 'text-sky-300 transition hover:text-sky-200' }, 'Open watchlists'), 'Use tracked baskets to prioritize tape rows that already drive desk risk.'],
  [h(Link, { href: '/app/event-explorer', className: 'text-sky-300 transition hover:text-sky-200' }, 'Open event explorer'), 'Pivot one row into family archive, surprise history, and linked reaction studies.'],
 ]
 sourceRows.push(['Source note', sourceNote(filtered.length !== 0 ? filtered : events)])
 return h(PageShell, { title: 'Macro Calendar', subtitle: 'Event tape surface for operator scan: dense rows, explicit provenance, and direct drill paths.', active: 'macro-calendar', mode: datasetMode }, h('div', { className: 'space-y-4' }, [
  h(MetricGrid, { key: 'metrics', items: metrics }),
  h(Panel, { key: 'controls', title: 'Control deck', subtitle: 'Set tape scope by impact, currency, region, category, and family without losing ranked scan order.', level: 'command' }, [
   h('div', { key: 'toolbar', className: 'ws-toolbar' }, [
    h(Link, { key: 'reset', href: calendarHref(filters, { impact: '', currency: '', status: '', region: '', category: '', family: '', search: filters.search }), className: 'ws-toolbar-chip' }, 'Reset'),
    h(Link, { key: 'high', href: calendarHref(filters, { impact: 'High' }), className: 'ws-toolbar-chip' }, 'High impact'),
    h(Link, { key: 'upcoming', href: calendarHref(filters, { status: 'Upcoming' }), className: 'ws-toolbar-chip' }, 'Upcoming'),
    currencies.map(function (currency: string) { return h(Link, { key: currency, href: calendarHref(filters, { currency: currency }), className: 'ws-toolbar-chip' }, currency) }),
   ]),
   h('div', { key: 'regions', className: 'ws-toolbar mt-3' }, [h(Link, { key: 'all-regions', href: calendarHref(filters, { region: '' }), className: 'ws-toolbar-chip' }, 'All regions'), regions.map(function (region: string) { return h(Link, { key: region, href: calendarHref(filters, { region: region }), className: 'ws-toolbar-chip' }, region) })]),
   h('div', { key: 'categories', className: 'ws-toolbar mt-2' }, [h(Link, { key: 'all-categories', href: calendarHref(filters, { category: '' }), className: 'ws-toolbar-chip' }, 'All categories'), categories.map(function (category: string) { return h(Link, { key: category, href: calendarHref(filters, { category: category }), className: 'ws-toolbar-chip' }, category) })]),
   h('div', { key: 'families', className: 'ws-toolbar mt-2' }, [h(Link, { key: 'all-families', href: calendarHref(filters, { family: '' }), className: 'ws-toolbar-chip' }, 'All families'), families.map(function (family: string) { return h(Link, { key: family, href: calendarHref(filters, { family: family }), className: 'ws-toolbar-chip' }, family) })]),
   h('div', { key: 'status', className: 'ws-status-band mt-3' }, [
    h(Badge, { key: 'impact', accent: Boolean(filters.impact) }, filters.impact ? compactImpactLabel(filters.impact) : 'All impact'),
    h(Badge, { key: 'currency', accent: Boolean(filters.currency) }, filters.currency ? filters.currency : 'All currencies'),
    h(Badge, { key: 'status' }, filters.status ? filters.status : 'All states'),
    h(Badge, { key: 'region' }, filters.region ? filters.region : 'All regions'),
    h(Badge, { key: 'category' }, filters.category ? filters.category : 'All categories'),
    h(Badge, { key: 'family' }, filters.family ? filters.family : 'All families'),
    h(Badge, { key: 'dataset' }, 'dataset ' + datasetMode),
    h(Badge, { key: 'view', accent: viewMode === 'live' }, 'view ' + viewMode),
   ]),
  ]),
  h('div', { key: 'grid', className: 'ws-two-panel' }, [
   h('div', { key: 'left', className: 'space-y-4' }, [
    h(Panel, { key: 'tape', title: 'Calendar tape', subtitle: 'Dense event rows with impact, source class, freshness posture, and watch overlap.', level: 'command' }, [
     h('div', { key: 'meta', className: 'mb-3 flex flex-wrap gap-1.5' }, [
      h(Badge, { key: 'live' }, 'live ' + String(liveRows)),
      h(Badge, { key: 'demo' }, 'demo ' + String(demoRows)),
      h(Badge, { key: 'fallback' }, 'fallback ' + String(fallbackRows)),
     ]),
     h(DataTable, { headers: ['Time', 'Region', 'Event', 'Impact', 'Status', 'Actual', 'Forecast', 'Verdict', 'Source', 'Watch'], rows: rows.length !== 0 ? rows : [['-', '-', 'No events match the current filters', '-', '-', '-', '-', '-', '-', '-']], numericColumns: [5, 6], dense: true, stickyHeader: true, ariaLabel: 'Standalone macro calendar' }),
    ]),
   ]),
   h('div', { key: 'right', className: 'space-y-4' }, [
    h(Panel, { key: 'focus', title: 'Desk focus', subtitle: 'Quick read on current tape scope and watch overlap.', level: 'context' }, h(KeyValueList, { items: [{ label: 'Rows visible', value: String(filtered.length) }, { label: 'Tracked symbols', value: String(watchSymbols.length) }, { label: 'Live rows', value: String(liveRows) }, { label: 'Fallback rows', value: String(degradedRows) }, { label: 'Search', value: filters.search ? filters.search : 'No search' }] })),
    h(Panel, { key: 'source', title: 'Source / freshness', subtitle: 'Live, demo, fallback, and note provenance are presented with one consistent trust language.', level: 'integrity' }, h(DataTable, { headers: ['Field', 'Value'], rows: sourceRows, dense: true })),
    h(Panel, { key: 'families', title: 'Family board', subtitle: 'Family-level pivots into the current event tape.', level: 'support' }, h(DataTable, { headers: ['Family', 'Rows'], rows: familyRows.length !== 0 ? familyRows : [['No families', '0']], dense: true })),
    h(Panel, { key: 'high-board', title: 'High impact board', subtitle: 'Fast lane for releases most likely to move desk positioning.', level: 'command' }, highImpact.length !== 0 ? h('div', { className: 'grid gap-2.5' }, highImpact.map(function (item: EventRelease) { return h(EventLink, { key: item.id, eventId: item.id, slug: item.slug, title: item.title, meta: item.status + ' / ' + timeLabel(item.scheduledAt) }) })) : h('div', { className: 'text-sm text-slate-500' }, 'No high-impact releases loaded.')),
    h(Panel, { key: 'workflow', title: 'Workflow use', subtitle: 'Operator follow-through from filtered tape to action surfaces.', level: 'support' }, h(DataTable, { headers: ['Module', 'Use'], rows: workflowRows, dense: true })),
   ]),
  ]),
 ]))
}
