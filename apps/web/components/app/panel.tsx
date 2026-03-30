import { createElement as h } from 'react'

import { cx, surfaces } from '@northstar/ui'

export function Panel(props: { title: string; children?: React.ReactNode; className?: string }) {
  return h('section', { className: cx(surfaces.panel, props.className) }, [
    h('div', { key: 'title', className: 'mb-4 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500' }, props.title),
    h('div', { key: 'body' }, props.children ?? null),
  ])
}
