import { createElement as h } from 'react'

import { Panel } from '@/components/app/chrome'

export default function AboutPage() {
 return h('main', { className: 'min-h-screen bg-[var(--bg)] px-6 py-8 text-slate-100' }, h('div', { className: 'mx-auto max-w-5xl space-y-5' }, [
 h(Panel, { key: 'mission', title: 'About' }, h('div', { className: 'space-y-3 text-sm text-slate-300' }, [
 h('div', { key: 'title', className: 'text-2xl font-semibold text-white' }, 'Northstar Macro'),
 h('p', { key: 'body-1' }, 'Built as a premium macro intelligence workstation for event-driven traders who need dense, actionable context.'),
 h('p', { key: 'body-2' }, 'The product is structured around catalyst tracking, regime interpretation, and reaction analysis instead of generic dashboard filler.'),
 ])),
 h(Panel, { key: 'principles', title: 'Product principles' }, h('ul', { className: 'grid gap-2 text-sm text-slate-300' }, [
 h('li', { key: '1' }, 'Transparent methodology over black-box claims.'),
 h('li', { key: '2' }, 'Operator-first workflows over feed noise.'),
 h('li', { key: '3' }, 'Deterministic demo mode over fake live data marketing.'),
 ])),
 ]))
}
