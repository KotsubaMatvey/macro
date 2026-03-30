import { createElement as h } from 'react'

import { DataTable, PageShell, Panel } from '@/components/app/chrome'
import { getEvents } from '@/lib/server/api'

export default async function MacroCalendarPage() {
  const events = await getEvents()
  return h(PageShell, { title: 'Macro Calendar', subtitle: 'Event schedule with forecast, actual, and release-state context for the current tape.', active: 'macro-calendar' }, h(Panel, { title: 'Upcoming and recent events' }, h(DataTable, { headers: ['Event', 'Country', 'Impact', 'Forecast', 'Actual', 'Status'], rows: events.map(function (item: any) { return [item.title, item.country, item.impact, String(item.forecast ?? '-'), String(item.actual ?? '-'), item.status] }) })))
}
