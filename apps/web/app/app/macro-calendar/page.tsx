import { createElement as h } from 'react'

import { DataTable, PageShell, Panel } from '@/components/app/chrome'
import { getEvents } from '@/lib/server/api'

export default async function MacroCalendarPage() {
  const events = await getEvents()
  return h(PageShell, { title: 'Macro Calendar', subtitle: 'Searchable event schedule with prior, forecast, actual, and surprise context.', active: 'macro-calendar' }, h(Panel, { title: 'Calendar' }, h(DataTable, { headers: ['Event', 'Country', 'Category', 'Forecast', 'Actual', 'Surprise'], rows: events.map(function (item: any) { return [item.title, item.country, item.category, String(item.forecast ?? '-'), String(item.actual ?? '-'), String(item.surprise ?? '-')] }) })))
}
