import { createElement as h } from 'react'

import { DataTable, PageShell, Panel } from '@/components/app/chrome'
import { getBriefings } from '@/lib/server/api'

export default async function BriefingsPage() {
  const items = await getBriefings()
  return h(PageShell, { title: 'Briefings', subtitle: 'Desk notes, post event intelligence, and regime aware commentary.', active: 'briefings' }, h(Panel, { title: 'Published briefings' }, h(DataTable, { headers: ['Title', 'Type', 'Analyst', 'Assets'], rows: items.map(function (item: any) { return [item.title, item.kind, item.analystName, item.assetSymbols.join(', ')] }) })))
}
