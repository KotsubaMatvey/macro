import { createElement as h } from 'react'
import { Panel } from '@/components/app/chrome'
export default function DisclaimerPage() { return h('main', { className: 'min-h-screen bg-[var(--bg)] px-6 py-8 text-slate-100' }, h('div', { className: 'mx-auto max-w-4xl' }, h(Panel, { title: 'Disclaimer' }, 'Northstar Macro provides workflow and research tooling. It does not provide personalized investment advice.'))) }
