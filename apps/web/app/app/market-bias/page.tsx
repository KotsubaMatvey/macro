import { createElement as h } from 'react'

import { DataTable, PageShell, Panel } from '@/components/app/chrome'
import { getWorkstation } from '@/lib/server/api'

export default async function MarketBiasPage() {
  const payload = await getWorkstation()
  return h(PageShell, { title: 'Market Bias', subtitle: 'Transparent directional stance by asset, driven by the current macro state.', active: 'market-bias' }, h(Panel, { title: 'Bias table' }, h(DataTable, { headers: ['Asset', 'Direction', 'Score', '1d', '5d', 'Confidence'], rows: payload.biases.map(function (item: any) { return [item.symbol, item.direction, String(item.score), String(item.change1d), String(item.change5d), Math.round(item.confidence * 100) + '%'] }) })))
}
