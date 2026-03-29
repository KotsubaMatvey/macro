import { createElement as h } from 'react'
import { Panel } from '@/components/app/chrome'
export default function ContactPage() { return h('main', { className: 'min-h-screen bg-[var(--bg)] px-6 py-8 text-slate-100' }, h('div', { className: 'mx-auto max-w-4xl' }, h(Panel, { title: 'Contact' }, 'Use the repository issues or admin surfaces for demo feedback and platform iteration.'))) }
