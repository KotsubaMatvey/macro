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
 stickyHeader?: boolean
 ariaLabel?: string
}

interface PageShellProps {
 title: string
 subtitle: string
 active: string
 children?: Child
 mode?: 'live' | 'demo' | 'fallback' | 'mixed'
}

function badgeClass(accent?: boolean) {
 if (accent) return 'border-sky-400/25 bg-sky-400/10 text-sky-200'
 return 'border-white/[0.08] bg-white/[0.02] text-slate-300'
}

export function Badge(props: BadgeProps) {
 return h('span', { className: cx('inline-flex items-center gap-2 rounded-[9px] border px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.18em]', badgeClass(props.accent)) }, props.children ? props.children : null)
}

export function Panel(props: PanelProps) {
 return h('section', { className: cx(surfaces.panel, props.className) }, [
  h('div', { key: 'header', className: 'mb-3 flex items-start justify-between gap-3 border-b border-white/[0.06] pb-2.5' }, [
   h('div', { key: 'copy', className: 'min-w-0' }, [
    h('h2', { key: 'title', className: 'text-[8px] font-semibold uppercase tracking-[0.24em] text-slate-500' }, props.title),
    props.subtitle ? h('div', { key: 'subtitle', className: 'mt-1.5 max-w-3xl text-[11px] leading-5 text-slate-400' }, props.subtitle) : null,
   ]),
   props.actions ? h('div', { key: 'actions', className: 'shrink-0' }, props.actions) : null,
  ]),
  h('div', { key: 'body', className: 'min-w-0' }, props.children ? props.children : null),
 ])
}

export function MetricGrid(props: { items: MetricItem[] }) {
 return h('div', { className: 'grid gap-2.5 md:grid-cols-2 2xl:grid-cols-4' }, props.items.map(function (item) {
  return h('div', { key: item.label, className: surfaces.metric }, [
   h('div', { key: 'label', className: 'text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500' }, item.label),
   h('div', { key: 'value', className: 'mt-2 ws-mono text-[24px] leading-none text-white' }, item.value),
   h('div', { key: 'note', className: 'mt-2 text-[12px] leading-5 text-slate-400' }, item.note),
  ])
 }))
}

export function DataTable(props: DataTableProps) {
 const numericColumns = new Set(props.numericColumns ? props.numericColumns : [])
 const rowPadding = props.dense ? 'py-1.5' : 'py-2'
 const headerClass = props.stickyHeader ? 'sticky top-0 z-[1] bg-[rgba(6,10,15,0.92)] supports-[backdrop-filter]:bg-[rgba(6,10,15,0.78)] supports-[backdrop-filter]:backdrop-blur' : 'bg-white/[0.025]'
 return h('div', { className: 'rounded-[12px] border border-white/[0.07] bg-[var(--panel-3)]' }, h('div', { className: 'overflow-x-auto' }, h('table', { 'aria-label': props.ariaLabel, className: 'min-w-full border-separate border-spacing-0 text-left text-[11px] leading-5' }, [
  h('thead', { key: 'head' }, h('tr', {}, props.headers.map(function (header, index) {
   return h('th', { key: header + String(index), className: cx('border-b border-white/8 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500', headerClass, numericColumns.has(index) ? 'text-right' : 'text-left') }, header)
  }))),
  h('tbody', { key: 'body' }, props.rows.map(function (row, rowIndex) {
   return h('tr', { key: rowIndex, className: 'group transition even:bg-white/[0.012] hover:bg-white/[0.036]' }, row.map(function (cell, cellIndex) {
    const isNumeric = numericColumns.has(cellIndex)
    let cellClass = 'text-slate-300'
    if (!isNumeric && cellIndex === 0) cellClass = 'font-medium text-slate-100'
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
 return h('div', { key, className: 'flex items-center justify-between gap-3 text-[9px] text-slate-500' }, [
  h('span', { key: 'label', className: 'uppercase tracking-[0.16em]' }, label),
  h('span', { key: 'value', className: 'ws-mono text-slate-200' }, value),
 ])
}

function navShortCode(slug: string) {
 if (slug === 'dashboard') return 'DB'
 if (slug === 'macro-calendar') return 'CAL'
 if (slug === 'market-bias') return 'BIAS'
 if (slug === 'advanced-charts') return 'CH'
 if (slug === 'education') return 'EDU'
 if (slug === 'settings') return 'SET'
 if (slug === 'admin') return 'ADM'
 return slug.slice(0, 3).toUpperCase()
}

export async function PageShell(props: PageShellProps) {
 const session = await getSession()
 const navItems = APP_SECTIONS.filter(function (item) {
  if (item.adminOnly) return session.role === 'admin'
  return true
 })
 const activeSection = navItems.find(function (item) {
  return sectionIsActive(item, props.active)
 })
 const mode = props.mode ? props.mode : 'mixed'
 return h('main', { className: surfaces.page }, h('div', { className: 'grid min-h-screen gap-0 xl:grid-cols-[248px_minmax(0,1fr)]' }, [
  h('aside', { key: 'sidebar', className: 'hidden xl:block' }, h('div', { className: 'sticky top-0 grid h-screen grid-rows-[auto_minmax(0,1fr)_auto] border-r border-white/[0.06] bg-[rgba(6,10,15,0.92)] px-3 py-3 backdrop-blur-sm' }, [
   h('div', { key: 'brand', className: 'border-b border-white/[0.06] pb-3' }, [
    h(Link, { key: 'home', href: '/app/dashboard', className: 'flex items-center justify-between gap-3 rounded-[11px] border border-white/[0.06] bg-white/[0.015] px-3 py-2.5 transition hover:border-white/[0.12] hover:bg-white/[0.03]' }, [
     h('div', { key: 'copy', className: 'min-w-0' }, [
      h('div', { key: 'eyebrow', className: 'flex items-center gap-2 text-[8px] font-semibold uppercase tracking-[0.22em] text-slate-500' }, [
       h('span', { key: 'dot', className: 'h-1.5 w-1.5 rounded-full bg-amber-300/80' }),
       'Macro desk',
      ]),
      h('div', { key: 'name', className: 'mt-1 truncate text-[12px] font-semibold text-white' }, APP_NAME),
     ]),
     h(Badge, { key: 'badge', accent: mode === 'live' }, mode),
    ]),
   ]),
   h('div', { key: 'nav-region', className: 'min-h-0 overflow-y-auto py-3 pr-1' }, h('nav', { className: 'grid gap-1' }, navItems.map(function (item) {
    const directActive = props.active === item.slug
    const active = directActive || sectionHasActiveChild(item, props.active)
    return h('div', { key: item.slug, className: 'grid gap-1' }, [
     h(Link, { href: '/app/' + item.slug, 'aria-current': directActive ? 'page' : undefined, className: cx('group flex items-center gap-3 rounded-[10px] px-3 py-2 text-[11px] leading-5 transition', active ? 'bg-white/[0.05] text-white shadow-[inset_2px_0_0_rgba(77,171,247,0.72)]' : 'text-slate-400 hover:bg-white/[0.025] hover:text-slate-100') }, [
      h('span', { key: 'icon', className: cx('inline-flex min-w-[34px] items-center justify-center rounded-[8px] border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em]', active ? 'border-sky-400/20 bg-sky-400/10 text-sky-100' : 'border-white/[0.06] bg-white/[0.015] text-slate-500 group-hover:border-white/[0.12] group-hover:text-slate-200') }, navShortCode(item.slug)),
      h('span', { key: 'title', className: 'truncate font-medium' }, item.title),
     ]),
     active && item.children && item.children.length !== 0 ? h('div', { key: 'submenu', className: 'ml-7 grid gap-0.5 border-l border-white/[0.06] pl-3' }, item.children.map(function (child) {
      const childActive = props.active === child.slug
      return h(Link, { key: child.slug, href: '/app/' + child.slug, 'aria-current': childActive ? 'page' : undefined, className: cx('group flex items-center gap-2 rounded-[8px] px-2 py-1 text-[10px] leading-5 transition', childActive ? 'bg-white/[0.04] text-white' : 'text-slate-500 hover:text-slate-200') }, [
       h('span', { key: 'dot', className: cx('h-1 w-1 shrink-0 rounded-full', childActive ? 'bg-amber-300/80' : 'bg-slate-700 group-hover:bg-slate-500') }),
       h('span', { key: 'title', className: 'truncate' }, child.title),
      ])
     })) : null,
    ])
   }))),
   h('div', { key: 'utility', className: 'border-t border-white/[0.06] pt-3' }, [
    h('form', { key: 'search', action: '/app/macro-calendar', className: 'mb-3' }, [
     h('label', { key: 'label', htmlFor: 'rail-search', className: 'sr-only' }, 'Search macro events'),
     h('input', { key: 'input', id: 'rail-search', name: 'search', type: 'search', placeholder: 'Search events', className: 'w-full rounded-[9px] border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[11px] text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-sky-400/30 focus:bg-white/[0.04]' }),
    ]),
    h('div', { key: 'session', className: 'grid gap-2 rounded-[12px] border border-white/[0.05] bg-white/[0.015] px-3 py-2.5' }, [
     h('div', { key: 'row', className: 'flex items-center justify-between gap-3' }, [
      h('div', { key: 'name', className: 'min-w-0 truncate text-[11px] font-medium text-slate-100' }, session.name),
      h('span', { key: 'role', className: 'inline-flex items-center rounded-full bg-white/[0.05] px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.16em] text-slate-400' }, session.role),
     ]),
     h('div', { key: 'email', className: 'truncate text-[10px] text-slate-500' }, session.email),
     utilityRow('mode', 'Mode', mode),
     utilityRow('focus', 'Focus', activeSection ? activeSection.title : 'Desk'),
    ]),
   ]),
  ])),
  h('div', { key: 'content', className: 'min-w-0 px-4 py-4 md:px-5 xl:px-6' }, [
   h('div', { key: 'topbar', className: 'mb-3 flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.06] pb-3' }, [
    h('div', { key: 'copy', className: 'min-w-0' }, [
     h('div', { key: 'eyebrow', className: 'text-[8px] font-semibold uppercase tracking-[0.24em] text-slate-500' }, 'Macro desk'),
     h('h1', { key: 'title', className: 'mt-0.5 text-[22px] font-semibold tracking-tight text-white' }, props.title),
     h('p', { key: 'subtitle', className: 'mt-1 max-w-3xl text-[11px] leading-5 text-slate-400' }, props.subtitle),
    ]),
    h('div', { key: 'utility', className: 'flex flex-wrap items-center gap-2' }, [
     h(Badge, { key: 'role' }, session.role),
     h(Badge, { key: 'mode', accent: mode === 'live' }, mode),
    ]),
   ]),
   props.children ? props.children : null,
  ]),
 ]))
}

