import { createElement as h } from 'react'

import { DataTable, EventLink, PageShell, Panel } from '@/components/app/chrome'
import { getEventDetail, getEvents } from '@/lib/server/api'

function verdict(move: number) {
  if (move >= 0.3) return 'ENTER'
  if (move >= 0.15) return 'HOLD'
  return 'WAIT'
}

export default async function LiveReactionsPage() {
  const events = await getEvents()
  const tracked = []
  for (const item of events.slice(0, 4)) {
    try {
      tracked.push(await getEventDetail(item.id))
    } catch {
      continue
    }
  }
  const rows = []
  for (const event of tracked) {
    for (const item of event.historicalReactions) {
      rows.push([event.title, item.window, item.avgMovePct.toFixed(2) + '%', Math.round(item.consistency * 100) + '%', verdict(item.avgMovePct)])
    }
  }
  return h(PageShell, { title: 'Live Reactions', subtitle: 'Recent event windows translated into clear enter, hold, or wait states in demo mode.', active: 'live-reactions' }, h('div', { className: 'space-y-5' }, [
    h(Panel, { key: 'tape', title: 'Reaction tape' }, h(DataTable, { headers: ['Event', 'Window', 'Move', 'Consistency', 'Verdict'], rows: rows })),
    h(Panel, { key: 'links', title: 'Tracked releases' }, h('div', { className: 'grid gap-3 sm:grid-cols-2' }, tracked.map(function (item: any) {
      return h(EventLink, { key: item.id, eventId: item.id, slug: item.slug, title: item.title, meta: item.family + ' / ' + item.status })
    }))),
  ]))
}
