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
 return h('div', { key, className: 'flex items-center justify-between gap-3 text-[11px] text-slate-400' }, [
 h('span', { key: 'label' }, label),
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
 h('aside', { key: 'sidebar', className: surfaces.sidebar }, h('div', { className: 'grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-3 rounded-[22px] border border-white/7 bg-[linear-gradient(180deg,rgba(10,14,20,0.96),rgba(8,11,17,0.98))] p-3 shadow-[0_18px_48px_rgba(0,0,0,0.34)]' }, [
 h('div', { key: 'brand', className: 'flex items-center gap-3 rounded-[16px] border border-white/7 bg-white/[0.02] px-3 py-2.5' }, [
 h('div', { key: 'mark', className: 'flex h-10 w-10 items-center justify-center rounded-[12px] border border-amber-400/20 bg-[radial-gradient(circle_at_top,rgba(209,138,47,0.28),rgba(209,138,47,0.08)_48%,rgba(255,255,255,0.01)_100%)] text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-200' }, 'MA'),
 h('div', { key: 'copy', className: 'min-w-0 flex-1' }, [
 h('div', { key: 'name', className: 'truncate text-[14px] font-semibold tracking-[0.02em] text-white' }, APP_NAME),
 h('div', { key: 'subtitle', className: 'mt-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-500' }, 'Macro workstation'),
 ]),
 h(Badge, { key: 'badge' }, 'desk'),
 ]),
 h('div', { key: 'nav-region', className: 'min-h-0 rounded-[18px] border border-white/6 bg-black/10 px-2 py-2.5' }, [
 h('div', { key: 'label', className: 'px-2 text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-500' }, 'Navigation'),
 h('nav', { key: 'nav', className: 'mt-2 grid max-h-full gap-1 overflow-y-auto pr-1' }, navItems.map(function (item) {
 const directActive = props.active === item.slug
 const active = directActive || sectionHasActiveChild(item, props.active)
 return h('div', { key: item.slug, className: 'grid gap-1' }, [
 h(Link, { href: '/app/' + item.slug, 'aria-current': directActive ? 'page' : undefined, className: cx(surfaces.navItem, active ? surfaces.navItemActive : surfaces.navItemIdle) }, [
 h('div', { key: 'row', className: 'flex items-start justify-between gap-3' }, [
 h('div', { key: 'stack', className: 'min-w-0' }, [
 h('div', { key: 'title', className: 'truncate text-[12px] font-medium leading-5' }, item.title),
 h('div', { key: 'desc', className: cx('mt-0.5 text-[10px] leading-4', active ? 'text-slate-300/90' : 'text-slate-500 group-hover:text-slate-400') }, item.description),
 ]),
 item.children && item.children.length !== 0 ? h('span', { key: 'count', className: cx('mt-0.5 shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em]', active ? 'border-amber-400/15 bg-amber-400/10 text-amber-200' : 'border-white/6 text-slate-500 group-hover:border-white/10 group-hover:text-slate-400') }, String(item.children.length)) : null,
 ]),
 ]),
 active && item.children && item.children.length !== 0 ? h('div', { key: 'submenu', className: 'ml-3 grid gap-0.5 border-l border-white/7 pl-3' }, item.children.map(function (child) {
 const childActive = props.active === child.slug
 return h(Link, { key: child.slug, href: '/app/' + child.slug, 'aria-current': childActive ? 'page' : undefined, className: cx('group rounded-[10px] px-2 py-1.5 transition', childActive ? 'bg-white/[0.06] text-white' : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200') }, [
 h('div', { key: 'title', className: 'truncate text-[11px] font-medium leading-5' }, child.title),
 child.description ? h('div', { key: 'desc', className: cx('text-[9px] uppercase tracking-[0.16em]', childActive ? 'text-amber-200/80' : 'text-slate-600 group-hover:text-slate-500') }, child.description) : null,
 ])
 })) : null,
 ])
 })),
 ]),
 h('div', { key: 'utility', className: 'grid gap-2.5 rounded-[18px] border border-white/6 bg-white/[0.018] p-2.5' }, [
 h('form', { key: 'search', action: '/app/macro-calendar', className: 'rounded-[14px] border border-white/6 bg-black/20 px-3 py-2.5' }, [
 h('label', { key: 'label', htmlFor: 'rail-search', className: 'text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500' }, 'Quick search'),
 h('div', { key: 'field', className: 'mt-2 flex items-center gap-2' }, [
 h('input', { key: 'input', id: 'rail-search', name: 'search', type: 'search', placeholder: 'Search macro events', className: 'min-w-0 flex-1 rounded-[10px] border border-white/8 bg-white/[0.03] px-3 py-2 text-[12px] text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400/40 focus:bg-white/[0.05]' }),
 h('button', { key: 'submit', type: 'submit', className: 'rounded-[10px] border border-white/8 bg-white/[0.03] px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-200 transition hover:border-white/15 hover:bg-white/[0.05]' }, 'Go'),
 ]),
 ]),
 h('div', { key: 'session', className: 'rounded-[14px] border border-white/6 bg-white/[0.02] px-3 py-2.5' }, [
 h('div', { key: 'label', className: 'text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500' }, 'Session'),
 h('div', { key: 'row', className: 'mt-2 flex items-center justify-between gap-3' }, [
 h('div', { key: 'copy', className: 'min-w-0' }, [
 h('div', { key: 'name', className: 'truncate text-[12px] font-medium text-white' }, session.name),
 h('div', { key: 'email', className: 'truncate text-[11px] text-slate-500' }, session.email),
 ]),
 h(Badge, { key: 'role', accent: true }, session.role),
 ]),
 ]),
 h('div', { key: 'state', className: 'rounded-[14px] border border-white/6 bg-white/[0.015] px-3 py-2.5' }, [
 h('div', { key: 'title', className: 'text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500' }, 'Desk state'),
 h('div', { key: 'rows', className: 'mt-2 grid gap-1.5' }, [
 utilityRow('focus', 'Focus', activeSection ? activeSection.title : 'Desk'),
 utilityRow('mode', 'Mode', 'Demo'),
 utilityRow('routing', 'Routing', 'Dynamic'),
 utilityRow('jobs', 'Jobs', 'Redis'),
 ]),
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
