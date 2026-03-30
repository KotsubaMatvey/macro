import { createElement as h } from 'react'

import { Panel } from '@/components/app/chrome'

const tiers = [
 ['Pro', 'Single operator seat', 'Workstation + alerts + briefings + impact lab', ' / month (demo)'],
 ['Team', 'Desk collaboration', 'Role-aware access + admin operations + shared context', ' / month (demo)'],
 ['Enterprise', 'Multi-desk rollout', 'Deployment controls and integration planning', 'Contact'],
]

export default function PricingPage() {
 return h('main', { className: 'min-h-screen bg-[var(--bg)] px-6 py-8 text-slate-100' }, h('div', { className: 'mx-auto max-w-6xl space-y-5' }, [
 h(Panel, { key: 'hero', title: 'Pricing' }, h('div', { className: 'space-y-3 text-sm text-slate-300' }, [
 h('div', { key: 'title', className: 'text-2xl font-semibold text-white' }, 'Serious tooling, clear scope, no hype packaging'),
 h('p', { key: 'body' }, 'Billing endpoints are demo-backed, but tier boundaries and data contracts are fully wired in product flow.'),
 ])),
 h(Panel, { key: 'tiers', title: 'Plans' }, h('div', { className: 'grid gap-3' }, tiers.map(function (row) {
 return h('div', { key: row[0], className: 'rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm' }, [
 h('div', { key: 'name', className: 'font-semibold text-white' }, row[0]),
 h('div', { key: 'seat', className: 'mt-1 text-slate-400' }, row[1]),
 h('div', { key: 'scope', className: 'mt-2 text-slate-300' }, row[2]),
 h('div', { key: 'price', className: 'mt-3 font-mono text-amber-300' }, row[3]),
 ])
 }))),
 ]))
}
