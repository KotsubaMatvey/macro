import { createElement as h } from 'react'
import { Panel } from '@/components/app/chrome'
export default function AboutPage() { return h('main', { className: 'min-h-screen bg-[var(--bg)] px-6 py-8 text-slate-100' }, h('div', { className: 'mx-auto max-w-4xl' }, h(Panel, { title: 'About' }, 'Northstar Macro is designed as a premium macro intelligence workstation for event driven traders and analysts.'))) }
