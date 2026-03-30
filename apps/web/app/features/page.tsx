import { createElement as h } from 'react'

import Link from 'next/link'

import { Panel } from '@/components/app/chrome'

const blocks = [
 { title: 'Event Routing', body: 'Calendar, explorer, briefings, and news surfaces route into one dynamic event detail contract.' },
 { title: 'Regime + Bias', body: 'Transparent regime components and per-asset directional bias are rendered from backend payloads.' },
 { title: 'Worker Runtime', body: 'Redis-queued demo jobs refresh market state, recompute snapshots, and publish scheduled content.' },
 { title: 'Role-Aware UX', body: 'Admin surfaces are visible only to admin users and protected server-side by API role checks.' },
]

export default function FeaturesPage() {
 return h('main', { className: 'min-h-screen bg-[var(--bg)] px-6 py-8 text-slate-100' }, h('div', { className: 'mx-auto max-w-6xl space-y-5' }, [
 h(Panel, { key: 'hero', title: 'Features' }, h('div', { className: 'space-y-3 text-sm text-slate-300' }, [
 h('div', { key: 'title', className: 'text-2xl font-semibold text-white' }, 'Product-grade macro workstation surfaces'),
 h('p', { key: 'body' }, 'Northstar Macro is organized around catalyst tracking, regime interpretation, and reaction execution workflows.'),
 h('div', { key: 'links', className: 'flex flex-wrap gap-3 pt-2' }, [
 h(Link, { key: 'app', href: '/app/dashboard', className: 'rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-100 hover:bg-white/5' }, 'Open workstation'),
 h(Link, { key: 'pricing', href: '/pricing', className: 'rounded-lg border border-white/15 px-3 py-2 text-xs text-slate-100 hover:bg-white/5' }, 'View pricing'),
 ]),
 ])),
 h('div', { key: 'grid', className: 'grid gap-5 md:grid-cols-2' }, blocks.map(function (item) {
 return h(Panel, { key: item.title, title: item.title }, h('p', { className: 'text-sm text-slate-300' }, item.body))
 })),
 ]))
}
