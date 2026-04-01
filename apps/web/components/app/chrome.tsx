import Link from 'next/link'
import { createElement as h } from 'react'
import type { ReactNode } from 'react'

import { APP_NAME, APP_SECTIONS } from '@macroaccess/config'
import type { NavSection } from '@macroaccess/types'
import { cx, surfaces, toneClass } from '@macroaccess/ui'
import { getSession } from '@/lib/server/api'

type Child = ReactNode

interface BadgeProps {
 children?: Child
 accent?: boolean
}

interface PanelProps {
 title: string
 subtitle?: string
 actions?: Child
 children?: Child
 className?: string
}

interface MetricItem {
 label: string
 value: string
 note: string
}

interface DataTableProps {
 headers: string[]
 rows: Child[][]
 numericColumns?: number[]
 dense?: boolean
}

function badgeClass(accent?: boolean) {
 if (accent) return 'border-amber-500/30 bg-amber-500/10 text-amber-300'
 return 'border-white/10 bg-white/[0.03] text-slate-300'
}

export function Badge(props: BadgeProps) {
 return h('span', { className: cx('inline-flex items-center gap-2 rounded-[10px] border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em]', badgeClass(props.accent)) }, props.children ? props.children : null)
}

export function Panel(props: PanelProps) {
 return h('section', { className: cx(surfaces.panel, props.className) }, [
 h('div', { key: 'header', className: 'mb-4 flex items-start justify-between gap-3 border-b border-white/7 pb-3' }, [
 h('div', { key: 'copy', className: 'min-w-0' }, [
 h('div', { key: 'title', className: 'text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-500' }, props.title),
 props.subtitle ? h('div', { key: 'subtitle', className: 'mt-2 max-w-3xl text-[12px] leading-5 text-slate-400' }, props.subtitle) : null,
 ]),
 props.actions ? h('div', { key: 'actions', className: 'shrink-0' }, props.actions) : null,
 ]),
 h('div', { key: 'body', className: 'min-w-0' }, props.children ? props.children : null),
])
}

export function MetricGrid(props: { items: MetricItem[] }) {
 return h('div', { className: 'grid gap-3 md:grid-cols-2 2xl:grid-cols-4' }, props.items.map(function (item) {
 return h('div', { key: item.label, className: surfaces.metric }, [
 h('div', { key: 'label', className: 'text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500' }, item.label),
 h('div', { key: 'value', className: 'mt-2 ws-mono text-[24px] leading-none text-white' }, item.value),
 h('div', { key: 'note', className: 'mt-2 text-[12px] leading-5 text-slate-400' }, item.note),
 ])
 }))
}

export function DataTable(props: DataTableProps) {
 const numericColumns = new Set(props.numericColumns ? props.numericColumns : [])
 const rowPadding = props.dense ? 'py-2' : 'py-2.5'
 return h('div', { className: 'overflow-hidden rounded-[14px] border border-white/7 bg-[var(--panel-3)]' }, h('div', { className: 'overflow-x-auto' }, h('table', { className: 'min-w-full border-separate border-spacing-0 text-left text-[12px] leading-5' }, [
 h('thead', { key: 'head' }, h('tr', { className: 'bg-white/[0.025]' }, props.headers.map(function (header, index) {
 return h('th', { key: header + String(index), className: cx('border-b border-white/8 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500', numericColumns.has(index) ? 'text-right' : 'text-left') }, header)
 }))),
 h('tbody', { key: 'body' }, props.rows.map(function (row, rowIndex) {
 return h('tr', { key: rowIndex, className: 'group transition even:bg-white/[0.012] hover:bg-white/[0.036]' }, row.map(function (cell, cellIndex) {
 const isNumeric = numericColumns.has(cellIndex)
 let cellClass = 'text-slate-300'
 if (!isNumeric) {
 if (cellIndex === 0) cellClass = 'font-medium text-slate-100'
 }
 return h('td', { key: String(rowIndex) + '-' + String(cellIndex), className: cx('border-b border-white/5 px-3 align-top', rowPadding, isNumeric ? 'ws-mono text-right text-slate-100' : cellClass) }, cell)
 }))
 })),
])))
}

export function KeyValueList(props: { items: { label: string; value: string; tone?: string }[] }) {
 return h('div', { className: 'grid gap-2.5' }, props.items.map(function (item) {
 return h('div', { key: item.label, className: 'flex items-center justify-between gap-4 border-b border-white/6 pb-2 text-[12px]' }, [
 h('span', { key: 'label', className: 'uppercase tracking-[0.14em] text-slate-500' }, item.label),
 h('span', { key: 'value', className: cx('ws-mono text-[12px]', item.tone ? toneClass(item.tone) : 'text-white') }, item.value),
 ])
 }))
}

export function EventLink(props: { eventId: string; slug: string; title: string; meta?: string }) {
 return h(Link, { href: '/app/events/' + props.eventId, className: 'group block rounded-[13px] border border-white/8 bg-white/[0.02] px-3 py-3 transition hover:border-white/15 hover:bg-white/[0.04]' }, [
 h('div', { key: 'copy', className: 'flex items-start justify-between gap-3' }, [
 h('div', { key: 'stack', className: 'min-w-0' }, [
 h('div', { key: 'title', className: 'text-sm font-medium text-white group-hover:text-amber-200' }, props.title),
 h('div', { key: 'meta', className: 'mt-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500' }, props.meta ? props.meta : props.slug),
 ]),
 h('span', { key: 'route', className: 'mt-0.5 text-[9px] uppercase tracking-[0.2em] text-slate-600 transition group-hover:text-slate-300' }, 'Open'),
 ]),
])
}

function sectionHasActiveChild(section: NavSection, activeSlug: string) {
 return section.children ? section.children.some(function (item) {
 return item.slug === activeSlug
 }) : false
}

function sectionIsActive(section: NavSection, activeSlug: string) {
 if (section.slug === activeSlug) return true
 return sectionHasActiveChild(section, activeSlug)
}

function utilityRow(key: string, label: string, value: string) {
 return h('div', { key, className: 'flex items-center justify-between gap-3 text-[10px] text-slate-500' }, [
 h('span', { key: 'label', className: 'uppercase tracking-[0.16em]' }, label),
 h('span', { key: 'value', className: 'ws-mono text-slate-200' }, value),
 ])
}

export async function PageShell(props: { title: string; subtitle: string; active: string; children?: Child }) {
 const session = await getSession()
 const navItems = APP_SECTIONS.filter(function (item) {
 if (item.adminOnly) return session.role === 'admin'
 return true
 })
 const activeSection = navItems.find(function (item) {
 return sectionIsActive(item, props.active)
 })
 return h('main', { className: surfaces.page }, h('div', { className: surfaces.shell }, [
 h('aside', { key: 'sidebar', className: surfaces.sidebar }, h('div', { className: 'grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] rounded-[20px] border border-white/6 bg-[linear-gradient(180deg,rgba(12,16,22,0.94),rgba(9,13,18,0.97))] px-2.5 py-2 shadow-[0_12px_30px_rgba(0,0,0,0.22)]' }, [
 h('div', { key: 'brand', className: 'flex items-center gap-2.5 border-b border-white/6 px-1.5 pb-2.5' }, [
 h('div', { key: 'mark', className: 'flex h-7 w-7 items-center justify-center rounded-[9px] bg-amber-400/10 text-[9px] font-semibold uppercase tracking-[0.18em] text-amber-200 ring-1 ring-inset ring-amber-400/20' }, 'MA'),
 h('div', { key: 'copy', className: 'min-w-0 flex-1' }, [
 h('div', { key: 'name', className: 'truncate text-[13px] font-semibold tracking-[0.01em] text-white' }, APP_NAME),
 ]),
 h('span', { key: 'badge', className: 'inline-flex items-center rounded-full bg-white/[0.05] px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.18em] text-slate-400' }, 'desk'),
 ]),
 h('div', { key: 'nav-region', className: 'min-h-0 overflow-y-auto py-1.5 pr-1' }, h('nav', { key: 'nav', className: 'grid gap-0.5' }, navItems.map(function (item) {
 const directActive = props.active === item.slug
 const active = directActive || sectionHasActiveChild(item, props.active)
 return h('div', { key: item.slug, className: 'grid gap-1' }, [
 h(Link, { href: '/app/' + item.slug, 'aria-current': directActive ? 'page' : undefined, className: cx(surfaces.navItem, active ? surfaces.navItemActive : surfaces.navItemIdle) }, [
 h('span', { key: 'title', className: 'truncate font-medium' }, item.title),
 active ? h('span', { key: 'marker', className: 'h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300/85' }) : null,
 ]),
 active && item.children && item.children.length !== 0 ? h('div', { key: 'submenu', className: 'ml-3 grid gap-0.5 border-l border-white/6 pl-2.5' }, item.children.map(function (child) {
 const childActive = props.active === child.slug
 return h(Link, { key: child.slug, href: '/app/' + child.slug, 'aria-current': childActive ? 'page' : undefined, className: cx('group flex items-center gap-2 rounded-[8px] px-2 py-1 text-[11px] leading-5 transition', childActive ? 'bg-white/[0.04] text-white' : 'text-slate-500 hover:text-slate-200') }, [
 h('span', { key: 'dot', className: cx('h-1 w-1 shrink-0 rounded-full', childActive ? 'bg-amber-300/80' : 'bg-slate-700 group-hover:bg-slate-500') }),
 h('span', { key: 'title', className: 'truncate' }, child.title),
 ])
 })) : null,
 ])
 }))),
 h('div', { key: 'utility', className: 'border-t border-white/6 px-1.5 pb-1 pt-3' }, [
 h('form', { key: 'search', action: '/app/macro-calendar', className: 'mb-3' }, [
 h('label', { key: 'label', htmlFor: 'rail-search', className: 'sr-only' }, 'Search macro events'),
 h('input', { key: 'input', id: 'rail-search', name: 'search', type: 'search', placeholder: 'Search events', className: 'w-full rounded-[9px] border border-white/7 bg-white/[0.03] px-3 py-2 text-[12px] text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-amber-400/35 focus:bg-white/[0.05]' }),
 ]),
 h('div', { key: 'session', className: 'grid gap-1 border-b border-white/6 pb-2.5' }, [
 h('div', { key: 'label', className: 'text-[8px] font-semibold uppercase tracking-[0.18em] text-slate-600' }, 'Session'),
 h('div', { key: 'row', className: 'flex items-center justify-between gap-3' }, [
 h('div', { key: 'name', className: 'min-w-0 truncate text-[11px] font-medium text-slate-100' }, session.name),
 h('span', { key: 'role', className: 'inline-flex items-center rounded-full bg-white/[0.05] px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-slate-400' }, session.role),
 ]),
 h('div', { key: 'email', className: 'truncate text-[11px] text-slate-500' }, session.email),
 ]),
 h('div', { key: 'state', className: 'grid gap-1.5 pt-2' }, [
 h('div', { key: 'label', className: 'text-[8px] font-semibold uppercase tracking-[0.18em] text-slate-600' }, 'Runtime'),
 utilityRow('focus', 'Focus', activeSection ? activeSection.title : 'Desk'),
 utilityRow('mode', 'Mode', 'Demo'),
 utilityRow('jobs', 'Queue', 'Redis'),
 ]),
 ]),
 ])),
 h('div', { key: 'content', className: 'min-w-0 px-4 py-4 md:px-5 xl:px-6' }, [
 h('div', { key: 'topbar', className: surfaces.topbar }, [
 h('div', { key: 'copy', className: 'min-w-0' }, [
 h('div', { key: 'eyebrow', className: 'text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-500' }, 'Workstation surface'),
 h('h1', { key: 'title', className: 'mt-1 text-[26px] font-semibold tracking-tight text-white' }, props.title),
 h('p', { key: 'subtitle', className: 'mt-1 max-w-3xl text-[12px] leading-5 text-slate-400' }, props.subtitle),
 ]),
 h('div', { key: 'utility', className: 'ws-utility-strip xl:min-w-[340px]' }, [
 h('div', { key: 'api', className: 'ws-note-card' }, [h('div', { key: 'label', className: 'text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500' }, 'Runtime'), h('div', { key: 'value', className: 'mt-2 text-sm font-medium text-white' }, 'Backend linked')]),
 h('div', { key: 'auth', className: 'ws-note-card' }, [h('div', { key: 'label', className: 'text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500' }, 'Access'), h('div', { key: 'value', className: 'mt-2 text-sm font-medium text-white' }, 'Role aware')]),
 h('div', { key: 'worker', className: 'ws-note-card' }, [h('div', { key: 'label', className: 'text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500' }, 'Refresh'), h('div', { key: 'value', className: 'mt-2 text-sm font-medium text-white' }, 'Job driven')]),
 ]),
 ]),
 props.children ? props.children : null,
 ]),
]))
}
