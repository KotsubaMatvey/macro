/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { createElement as h } from 'react'

import { DataTable, MetricGrid, PageShell, Panel } from '@/components/app/chrome'
import { getWorkstation } from '@/lib/server/api'

export default async function RegimeMonitorPage() {
  const payload = await getWorkstation()
  const metrics = [
    { label: 'State', value: payload.regime.label, note: payload.regime.trend },
    { label: 'Score', value: payload.regime.score.toFixed(2), note: 'Directional composite' },
    { label: 'Confidence', value: Math.round(payload.regime.confidence * 100) + '%', note: 'Model certainty' },
    { label: 'Components', value: String(payload.regime.components.length), note: 'Tracked regime dimensions' },
  ]
  const rows = payload.regime.components.map(function (item) {
    return [item.key, item.label, item.value.toFixed(2)]
  })
  return h(PageShell, { title: 'Liquidity Regime', subtitle: payload.regime.interpretation, active: 'regime-monitor' }, h('div', { className: 'space-y-5' }, [
    h(MetricGrid, { key: 'metrics', items: metrics }),
    h('div', { key: 'grid', className: 'grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_360px]' }, [
      h(Panel, { key: 'components', title: 'Regime components' }, h(DataTable, { headers: ['Dimension', 'Label', 'Score'], rows: rows })),
      h(Panel, { key: 'method', title: 'Methodology' }, h('div', { className: 'space-y-3 text-sm text-slate-300' }, [
        h('p', { key: 'copy', className: 'leading-7' }, payload.regime.methodology),
        h('div', { key: 'score', className: 'rounded-xl border border-white/8 p-4 text-slate-400' }, 'Use the regime as a risk filter. Stronger score and confidence argue for cleaner follow through after the print.'),
      ])),
    ]),
  ]))
}
