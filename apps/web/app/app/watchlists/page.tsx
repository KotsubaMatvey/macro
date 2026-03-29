import { createElement as h } from 'react'

import { DataTable, PageShell, Panel } from '@/components/app/chrome'
import { getWorkstation } from '@/lib/server/api'

export default async function WatchlistsPage() {
  const payload = await getWorkstation()
  return h(PageShell, { title: 'Watchlists', subtitle: 'Saved baskets of assets and events that shape the tape you care about.', active: 'watchlists' }, h(Panel, { title: 'Saved watchlists' }, h(DataTable, { headers: ['Name', 'Description', 'Items', 'Alerts'], rows: payload.watchlists.map(function (item: any) { return [item.name, item.description, String(item.itemCount), String(item.alertCount)] }) })))
}
