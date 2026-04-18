import { createElement as h } from 'react'
import type { ReactNode } from 'react'

import { cx } from '@macroaccess/ui'

export function Panel(props: { title: string; subtitle?: string; children?: ReactNode; className?: string }) {
 return h('section', { className: cx('ws-panel ws-panel-level-context p-4', props.className) }, h('div', { className: 'ws-panel-head' }, h('div', { className: 'min-w-0' }, h('div', { className: 'ws-panel-kicker' }, 'context'), h('h2', { className: 'ws-panel-title' }, props.title), props.subtitle ? h('p', { className: 'ws-panel-subtitle' }, props.subtitle) : null)), h('div', null, props.children ?? null))
}