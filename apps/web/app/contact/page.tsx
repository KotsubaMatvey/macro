import { createElement as h } from 'react'

import { Panel } from '@/components/app/chrome'

export default function ContactPage() {
 return h('main', { className: 'min-h-screen bg-[var(--bg)] px-6 py-8 text-slate-100' }, h('div', { className: 'mx-auto max-w-4xl space-y-5' }, [
 h(Panel, { key: 'contact', title: 'Contact' }, h('div', { className: 'space-y-3 text-sm text-slate-300' }, [
 h('p', { key: 'p1' }, 'For product feedback, implementation questions, and demo environment issues, use repository issues and pull requests.'),
 h('p', { key: 'p2' }, 'Operational incidents and access issues should be routed through admin users inside the workstation.'),
 ])),
 h(Panel, { key: 'response', title: 'Response scope' }, h('ul', { className: 'grid gap-2 text-sm text-slate-300' }, [
 h('li', { key: '1' }, 'Platform behavior and bug reports'),
 h('li', { key: '2' }, 'Data model and methodology clarification'),
 h('li', { key: '3' }, 'Deployment and environment setup support'),
 ])),
 ]))
}
