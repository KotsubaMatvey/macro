import Link from 'next/link'
import { createElement as h } from 'react'
import type { ReactNode } from 'react'
import type { EventDetail, EventRelease, ImpactWindow } from '@macroaccess/types'

import { Badge, DataTable, EventLink, MetricGrid, PageShell, Panel } from '@/components/app/chrome'
import { getEventDetail, getEvents } from '@/lib/server/api'

function trackedEvents(events: EventRelease[]) {
 const released = events.filter(function (item) {
  if (item.status === 'Released') return true
  return item.status === 'Live'
 })
 if (released.length !== 0) return released.slice(0, 6)
 return events.slice(0, 6)
}

function primaryWindow(event: EventDetail) {
 const exact = event.historicalReactions.find(function (item) { return item.window === '5m' })
 if (exact) return exact
 return event.historicalReactions[0]
}

function continuationWindow(event: EventDetail) {
 const exact = event.historicalReactions.find(function (item) { return item.window === '1h' })
 if (exact) return exact
 return event.historicalReactions[1]
}

function verdict(window?: ImpactWindow) {
 if (!window) return 'WAIT'
 const bucket = Math.floor(Math.abs(window.avgMovePct) * window.consistency * 10)
 if (bucket === 0) return 'WAIT'
 if (bucket === 1) return 'HOLD'
 return 'ENTER'
}

function verdictRank(value: string) {
 if (value === 'ENTER') return 2
 if (value === 'HOLD') return 1
 return 0
}

export default async function LiveReactionsPage() {
 const events = await getEvents()
 const trackedResults = await Promise.allSettled(trackedEvents(events).map(function (item) { return getEventDetail(item.id) }))
 const tracked = [] as EventDetail[]
 for (const item of trackedResults) {
  if (item.status === 'fulfilled') tracked.push(item.value)
 }
 const ordered = tracked.slice().sort(function (left, right) {
  const leftVerdict = verdict(primaryWindow(left))
  const rightVerdict = verdict(primaryWindow(right))
  const rankDelta = verdictRank(rightVerdict) - verdictRank(leftVerdict)
  if (rankDelta !== 0) return rankDelta
  return Math.abs((primaryWindow(right) ? primaryWindow(right).avgMovePct : 0)) - Math.abs((primaryWindow(left) ? primaryWindow(left).avgMovePct : 0))
 })
 const metrics = [
  { label: 'Tracked releases', value: String(ordered.length), note: 'Events currently flowing into the reaction board' },
  { label: 'Enter states', value: String(ordered.filter(function (item) { return verdict(primaryWindow(item)) === 'ENTER' }).length), note: 'Reactions with stronger immediate follow-through' },
  { label: 'Hold states', value: String(ordered.filter(function (item) { return verdict(primaryWindow(item)) === 'HOLD' }).length), note: 'Moderate reaction windows requiring more confirmation' },
  { label: 'Wait states', value: String(ordered.filter(function (item) { return verdict(primaryWindow(item)) === 'WAIT' }).length), note: 'Events that still need cleaner tape confirmation' },
 ]
 const reactionRows: ReactNode[][] = ordered.map(function (event: EventDetail) {
  const shortWindow = primaryWindow(event)
  const continuation = continuationWindow(event)
  const state = verdict(shortWindow)
  return [h(EventLink, { eventId: event.id, slug: event.slug, title: event.title, meta: event.family + ' / ' + event.status }), shortWindow ? shortWindow.avgMovePct.toFixed(2) + '%' : '-', shortWindow ? Math.round(shortWindow.consistency * 100) + '%' : '-', continuation ? continuation.avgMovePct.toFixed(2) + '%' : '-', h(Badge, { accent: state === 'ENTER' }, state)]
 })
 const noteRows: ReactNode[][] = ordered.flatMap(function (event: EventDetail) {
  return event.historicalReactions.slice(0, 2).map(function (item: ImpactWindow) {
   return [event.title, item.window, item.narrative, verdict(item)]
  })
 })
 const workflowRows: ReactNode[][] = [
  [h(Link, { href: '/app/dashboard', className: 'text-sky-300 transition hover:text-sky-200' }, 'Open dashboard'), 'Use the tape to validate whether the current catalyst remains the highest-priority workflow.'],
  [h(Link, { href: '/app/market-bias', className: 'text-sky-300 transition hover:text-sky-200' }, 'Open market bias'), 'Check whether consensus is being confirmed or faded by the reaction profile.'],
  [h(Link, { href: '/app/regime-monitor', className: 'text-sky-300 transition hover:text-sky-200' }, 'Open liquidity regime'), 'Use the regime to decide whether follow-through should persist or mean-revert.'],
 ]
 return h(PageShell, { title: 'Live Reactions', subtitle: 'Recent event windows translated into clear operator states in demo mode.', active: 'live-reactions' }, h('div', { className: 'space-y-5' }, [
  h(MetricGrid, { key: 'metrics', items: metrics }),
  h(Panel, { key: 'board', title: 'Reaction board', subtitle: 'Verdict logic is derived from the primary reaction window and its consistency.' }, [
   h('div', { key: 'badges', className: 'flex flex-wrap gap-2' }, [h(Badge, { key: 'enter', accent: true }, String(metrics[1].value) + ' enter'), h(Badge, { key: 'hold' }, String(metrics[2].value) + ' hold'), h(Badge, { key: 'wait' }, String(metrics[3].value) + ' wait')]),
   h('div', { key: 'strip', className: 'mt-4 ws-utility-strip' }, ordered.slice(0, 3).map(function (item: EventDetail) { const shortWindow = primaryWindow(item); return h('div', { key: item.id, className: 'ws-note-card' }, [h('div', { key: 'label', className: 'text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500' }, item.family), h('div', { key: 'value', className: 'mt-2 text-sm font-medium text-white' }, verdict(shortWindow)), h('div', { key: 'move', className: 'mt-2 ws-mono text-[12px] text-slate-300' }, shortWindow ? shortWindow.avgMovePct.toFixed(2) + '%' : '-')]) })),
  ]),
  h('div', { key: 'grid', className: 'ws-page-grid' }, [
   h('div', { key: 'left', className: 'space-y-5' }, [
    h(Panel, { key: 'tape', title: 'Reaction tape', subtitle: 'Primary board for event, move, continuation, and verdict.' }, h(DataTable, { headers: ['Event', '5m move', 'Consistency', '1h continuation', 'Verdict'], rows: reactionRows.length !== 0 ? reactionRows : [['No reactions', '-', '-', '-', 'WAIT']], numericColumns: [1, 2, 3], dense: true })),
    h(Panel, { key: 'notes', title: 'Window notes', subtitle: 'Short-form narrative around the first two reaction windows.' }, h(DataTable, { headers: ['Event', 'Window', 'Narrative', 'State'], rows: noteRows.length !== 0 ? noteRows : [['No notes', '-', '-', 'WAIT']], dense: true })),
   ]),
   h('div', { key: 'right', className: 'space-y-5' }, [
    h(Panel, { key: 'tracked', title: 'Tracked releases', subtitle: 'Events currently feeding the live reaction board.' }, ordered.length !== 0 ? h('div', { className: 'grid gap-3' }, ordered.map(function (item: EventDetail) { return h(EventLink, { key: item.id, eventId: item.id, slug: item.slug, title: item.title, meta: item.family + ' / ' + item.status }) })) : h('div', { className: 'text-sm text-slate-500' }, 'No tracked releases available.')),
    h(Panel, { key: 'workflow', title: 'Workflow use', subtitle: 'Next surfaces that should be checked after the first reaction.' }, h(DataTable, { headers: ['Module', 'Use'], rows: workflowRows, dense: true })),
   ]),
  ]),
 ]))
}
