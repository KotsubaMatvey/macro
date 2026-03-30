import { createElement as h } from 'react'

import { Panel } from '@/components/app/chrome'

export default function DisclaimerPage() {
 return h('main', { className: 'min-h-screen bg-[var(--bg)] px-6 py-8 text-slate-100' }, h('div', { className: 'mx-auto max-w-5xl space-y-5' }, [
 h(Panel, { key: 'legal', title: 'Disclaimer' }, h('div', { className: 'space-y-3 text-sm text-slate-300' }, [
 h('p', { key: 'a' }, 'Northstar Macro provides workflow tooling and market context for educational and operational research purposes.'),
 h('p', { key: 'b' }, 'It does not provide personalized investment advice, solicitation, or guaranteed performance outcomes.'),
 h('p', { key: 'c' }, 'All demo-mode prices, states, and job outcomes are deterministic simulation artifacts.'),
 ])),
 h(Panel, { key: 'risk', title: 'Risk notice' }, h('p', { className: 'text-sm text-slate-300' }, 'Trading and investing involve risk of loss. Users are responsible for independent decision-making and risk management.'))
 ]))
}
