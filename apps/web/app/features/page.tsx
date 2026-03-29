import { createElement as h } from 'react'
import { Panel } from '@/components/app/chrome'
export default function FeaturesPage() { return h('main', { className: 'min-h-screen bg-[var(--bg)] px-6 py-8 text-slate-100' }, h('div', { className: 'mx-auto max-w-4xl' }, h(Panel, { title: 'Features' }, 'Northstar Macro focuses on event intelligence, regime monitoring, market bias, alerts, briefings, and operational depth rather than brochure density.'))) }
