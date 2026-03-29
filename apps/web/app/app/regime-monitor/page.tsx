import { createElement as h } from 'react'

import { DataTable, PageShell, Panel } from '@/components/app/chrome'
import { getWorkstation } from '@/lib/server/api'

export default async function RegimeMonitorPage() {
  const payload = await getWorkstation()
  return h(PageShell, { title: 'Regime Monitor', subtitle: payload.regime.interpretation, active: 'regime-monitor' }, h(Panel, { title: 'Regime components' }, h(DataTable, { headers: ['Dimension', 'Label', 'Score'], rows: payload.regime.components.map(function (item: any) { return [item.key, item.label, item.value.toFixed(2)] }) })))
}
