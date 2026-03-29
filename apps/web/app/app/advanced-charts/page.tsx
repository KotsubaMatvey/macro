import { createElement as h } from 'react'

import { PageShell, Panel } from '@/components/app/chrome'

export default function AdvancedChartsPage() {
  return h(PageShell, { title: 'Advanced Charts', subtitle: 'Provider ready charting surface with event aware overlays kept intentionally thin for now.', active: 'advanced-charts' }, h(Panel, { title: 'Charting scaffold' }, h('div', { className: 'grid gap-3 text-sm text-slate-300' }, ['Multi asset chart panels hook into provider adapters later.', 'Event overlays and regime markers are wired conceptually, not via fake constants.', 'The page remains demo backed until a market data provider is attached.'].map(function (item) { return h('div', { key: item, className: 'rounded-xl border border-white/10 p-4' }, item) }))))
}
