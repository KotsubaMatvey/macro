/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { createElement as h } from 'react'

import { DataTable, MetricGrid, PageShell, Panel } from '@/components/app/chrome'
import { getWorkstation } from '@/lib/server/api'

export default async function WatchlistsPage() {
  const payload = await getWorkstation()
  const itemCount = payload.watchlists.reduce(function (total: number, item: any) { return total + item.itemCount }, 0)
  const alertCount = payload.watchlists.reduce(function (total: number, item: any) { return total + item.alertCount }, 0)
  const metrics = [
    { label: 'Watchlists', value: String(payload.watchlists.length), note: 'Saved baskets currently attached to the workstation' },
    { label: 'Tracked items', value: String(itemCount), note: 'Assets and events inside saved baskets' },
    { label: 'Linked alerts', value: String(alertCount), note: 'Alert load connected to these watchlists' },
    { label: 'Coverage', value: payload.watchlists.length ? 'Active' : 'Empty', note: 'Demo watchlist state for the signed-in user' },
  ]
  const listRows = payload.watchlists.map(function (item: any) {
    return [item.name, item.description, String(item.itemCount), String(item.alertCount)]
  })
  const itemRows = payload.watchlists.reduce(function (rows: any[], list: any) {
    list.items.forEach(function (item: any) {
      rows.push([list.name, item.symbol, item.itemType, item.note ? item.note : '-'])
    })
    return rows
  }, [])
  return h(PageShell, { title: 'Watchlists', subtitle: 'Saved baskets of assets and events that shape the tape you care about.', active: 'watchlists' }, h('div', { className: 'space-y-5' }, [
    h(MetricGrid, { key: 'metrics', items: metrics }),
    h('div', { key: 'grid', className: 'grid gap-5 xl:grid-cols-2' }, [
      h(Panel, { key: 'lists', title: 'Saved watchlists' }, h(DataTable, { headers: ['Name', 'Description', 'Items', 'Alerts'], rows: listRows.length ? listRows : [['No watchlists', '-', '0', '0']] })),
      h(Panel, { key: 'items', title: 'Tracked symbols and events' }, h(DataTable, { headers: ['Watchlist', 'Symbol', 'Type', 'Note'], rows: itemRows.length ? itemRows : [['No items', '-', '-', '-']] })),
    ]),
  ]))
}
