import Link from 'next/link'
import { createElement as h } from 'react'
import type { ReactNode } from 'react'

import { APP_NAME, APP_SECTIONS } from '@macroaccess/config'
import type { NavSection } from '@macroaccess/types'
import { cx, surfaces, toneClass } from '@macroaccess/ui'
import { getSession } from '@/lib/server/api'
import { CommandPalette } from './command-palette'

type Child = ReactNode

interface BadgeProps {
 children?: Child
 accent?: boolean
 className?: string
 quiet?: boolean
}

interface PanelProps {
 title: string
 subtitle?: string
 actions?: Child
 children?: Child
 className?: string
 level?: 'command' | 'context' | 'integrity' | 'support'
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
 className?: string
 emptyMessage?: string
}

interface PageShellProps {
 title: string
 subtitle: string
 active: string
 children?: Child
 mode?: 'live' | 'demo' | 'fallback' | 'mixed'
 hideTopbar?: boolean
 contentClassName?: string
}

function badgeValue(children?: Child) {
 if (typeof children === 'string') return children
 if (typeof children === 'number') return String(children)
 return ''
}

function badgeToneClass(value: string, accent?: boolean) {
 if (accent) return 'ws-badge-accent'
 const token = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')
 if (['live', 'fresh', 'online', 'official', 'ready', 'enabled'].includes(token)) return 'ws-badge-live'
 if (['mixed', 'discovery', 'derived', 'static', 'seeded', 'secondary'].includes(token)) return 'ws-badge-mixed'
 if (['demo', 'aging', 'replay', 'warning', 'pending', 'high', 'high-urgency'].includes(token)) return 'ws-badge-demo'
 if (['fallback', 'degraded', 'stale', 'offline', 'failed', 'low-confidence'].includes(token)) return 'ws-badge-fallback'
 return ''
}

function panelLevelClass(level?: PanelProps['level']) {
 if (level === 'command') return 'ws-panel-level-command'
 if (level === 'integrity') return 'ws-panel-level-integrity'
 if (level === 'support') return 'ws-panel-level-support'
 return 'ws-panel-level-context'
}

export function Badge(props: BadgeProps) {
 const value = badgeValue(props.children)
 return h('span', { className: cx('ws-badge', props.quiet ? 'ws-badge-quiet' : '', badgeToneClass(value, props.accent), props.className) }, props.children ? props.children : null)
}

export function Panel(props: PanelProps) {
 return h('section', { className: cx('ws-panel', panelLevelClass(props.level), props.className) }, [
  h('div', { key: 'header', className: 'ws-panel-head' }, [
   h('div', { key: 'copy', className: 'min-w-0' }, [
    h('div', { key: 'eyebrow', className: 'ws-panel-kicker' }, props.level ? props.level : 'context'),
    h('h2', { key: 'title', className: 'ws-panel-title' }, props.title),
    props.subtitle ? h('div', { key: 'subtitle', className: 'ws-panel-subtitle' }, props.subtitle) : null,
   ]),
   props.actions ? h('div', { key: 'actions', className: 'ws-panel-actions' }, props.actions) : null,
  ]),
  h('div', { key: 'body', className: 'min-w-0' }, props.children ? props.children : null),
 ])
}

export function MetricGrid(props: { items: MetricItem[] }) {
 return h('div', { className: 'grid gap-2.5 md:grid-cols-2 2xl:grid-cols-4' }, props.items.map(function (item) {
  return h('div', { key: item.label, className: surfaces.metric }, [
   h('div', { key: 'label', className: 'text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500' }, item.label),
   h('div', { key: 'value', className: 'mt-2 ws-mono text-[23px] leading-none text-white' }, item.value),
   h('div', { key: 'note', className: 'mt-2 text-[11px] leading-5 text-slate-400' }, item.note),
  ])
 }))
}

export function ScoreBar(props: { value: number; label?: string; tone?: 'live' | 'warn' | 'bad' | 'neutral'; className?: string }) {
 const value = Math.max(0, Math.min(100, Number.isFinite(props.value) ? props.value : 0))
 return h('div', { className: cx('ws-score', props.className), 'aria-label': props.label ? props.label + ' ' + String(Math.round(value)) + '%' : String(Math.round(value)) + '%' }, [
  props.label ? h('div', { key: 'label', className: 'ws-score-label' }, [
   h('span', { key: 'text' }, props.label),
   h('span', { key: 'value', className: 'ws-mono' }, String(Math.round(value))),
  ]) : null,
  h('div', { key: 'track', className: 'ws-score-track' }, h('div', { className: cx('ws-score-fill', props.tone ? 'ws-score-' + props.tone : ''), style: { width: String(value) + '%' } })),
 ])
}

export function EmptyState(props: { title: string; body: string; action?: Child; tone?: 'integrity' | 'support'; className?: string }) {
 return h('div', { className: cx('ws-empty-state', props.tone === 'integrity' ? 'ws-empty-integrity' : '', props.className) }, [
  h('div', { key: 'title', className: 'ws-empty-title' }, props.title),
  h('p', { key: 'body', className: 'ws-empty-body' }, props.body),
  props.action ? h('div', { key: 'action', className: 'mt-3' }, props.action) : null,
 ])
}

export function SourceCell(props: { state: string; mode?: string; freshness?: string; sourceType?: string; compact?: boolean }) {
 const items = [props.state, props.mode, props.freshness, props.sourceType].filter(Boolean) as string[]
 return h('div', { className: props.compact ? 'ws-source-cell ws-source-cell-compact' : 'ws-source-cell' }, items.map(function (item, index) {
  return h(Badge, { key: item + String(index), accent: index === 0 && ['live', 'official', 'fresh'].includes(item.toLowerCase()), quiet: index > 0 }, item)
 }))
}

export function DataTable(props: DataTableProps) {
 const numericColumns = new Set(props.numericColumns ? props.numericColumns : [])
 const rowPadding = props.dense ? 'py-1.5' : 'py-2'
 const headerClass = props.stickyHeader ? 'sticky top-0 z-[1] bg-[rgba(6,10,15,0.96)] supports-[backdrop-filter]:bg-[rgba(6,10,15,0.86)] supports-[backdrop-filter]:backdrop-blur' : ''
 const rows = props.rows && props.rows.length !== 0 ? props.rows : [[h('span', { key: 'empty', className: 'text-slate-500' }, props.emptyMessage ? props.emptyMessage : 'No rows available')]]
 return h('div', { className: cx('ws-table-wrap', props.className) }, h('div', { className: 'overflow-x-auto' }, h('table', { 'aria-label': props.ariaLabel, className: 'min-w-full border-separate border-spacing-0 text-left text-[11px] leading-5' }, [
  h('thead', { key: 'head' }, h('tr', {}, props.headers.map(function (header, index) {
   return h('th', { key: header + String(index), className: cx('ws-table-head-cell', headerClass, numericColumns.has(index) ? 'text-right' : 'text-left') }, header)
  }))),
  h('tbody', { key: 'body' }, rows.map(function (row, rowIndex) {
   return h('tr', { key: rowIndex, tabIndex: 0, className: 'ws-table-row even:bg-white/[0.008]' }, row.map(function (cell, cellIndex) {
    const isNumeric = numericColumns.has(cellIndex)
    let cellClass = 'text-slate-300'
    if (!isNumeric && cellIndex === 0) cellClass = 'font-medium text-slate-100'
    return h('td', { key: String(rowIndex) + '-' + String(cellIndex), colSpan: row.length === 1 ? props.headers.length : undefined, className: cx('ws-table-cell', rowPadding, isNumeric ? 'ws-mono text-right text-slate-100' : cellClass) }, cell)
   }))
  })),
 ])))
}

export function KeyValueList(props: { items: { label: string; value: string; tone?: string }[] }) {
 return h('div', { className: 'grid gap-2' }, props.items.map(function (item) {
  return h('div', { key: item.label, className: 'flex items-center justify-between gap-4 border-b border-white/6 pb-2 text-[11px] last:border-b-0 last:pb-0' }, [
   h('span', { key: 'label', className: 'uppercase tracking-[0.15em] text-slate-500' }, item.label),
   h('span', { key: 'value', className: cx('ws-mono text-[11px]', item.tone ? toneClass(item.tone) : 'text-white') }, item.value),
  ])
 }))
}

export function EventLink(props: { eventId: string; slug: string; title: string; meta?: string }) {
 return h(Link, { href: '/app/events/' + props.eventId, className: 'group block rounded-[8px] border border-white/8 bg-white/[0.015] px-3 py-2.5 transition hover:border-white/14 hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/35' }, [
  h('div', { key: 'copy', className: 'flex items-start justify-between gap-3' }, [
   h('div', { key: 'stack', className: 'min-w-0' }, [
    h('div', { key: 'title', className: 'text-[13px] font-medium text-white group-hover:text-amber-100' }, props.title),
    h('div', { key: 'meta', className: 'mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500' }, props.meta ? props.meta : props.slug),
   ]),
   h('span', { key: 'route', className: 'mt-0.5 text-[9px] uppercase tracking-[0.18em] text-slate-600 transition group-hover:text-slate-300' }, 'Open'),
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
 if (slug === 'geoboard') return 'GEO'
 if (slug === 'settings') return 'SET'
 if (slug === 'admin') return 'ADM'
 return slug.slice(0, 3).toUpperCase()
}

function navGlyph(icon?: string) {
 if (icon !== 'globe') return null
 return h('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', className: 'h-3.5 w-3.5' }, [
  h('circle', { key: 'ring', cx: 12, cy: 12, r: 8.5 }),
  h('path', { key: 'lat', d: 'M3.5 12h17' }),
  h('path', { key: 'lon-a', d: 'M12 3.5c2.6 2.6 4.1 5.4 4.1 8.5S14.6 17.9 12 20.5' }),
  h('path', { key: 'lon-b', d: 'M12 3.5c-2.6 2.6-4.1 5.4-4.1 8.5s1.5 5.9 4.1 8.5' }),
 ])
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
 return h('main', { className: surfaces.page }, h('div', { className: 'grid min-h-screen gap-0 xl:grid-cols-[244px_minmax(0,1fr)]' }, [
  h('aside', { key: 'sidebar', className: 'hidden xl:block' }, h('div', { className: 'sticky top-0 grid h-screen grid-rows-[auto_minmax(0,1fr)_auto] border-r border-white/[0.055] bg-[rgba(6,10,15,0.92)] px-3 py-3 backdrop-blur-sm' }, [
   h('div', { key: 'brand', className: 'border-b border-white/[0.055] pb-3' }, [
    h(Link, { key: 'home', href: '/app/dashboard', className: 'flex items-center justify-between gap-3 rounded-[11px] border border-white/[0.055] bg-white/[0.014] px-3 py-2.5 transition hover:border-white/[0.11] hover:bg-white/[0.028]' }, [
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
     h(Link, { key: 'nav-link', href: '/app/' + item.slug, 'aria-current': directActive ? 'page' : undefined, className: cx('group flex items-center gap-3 rounded-[10px] px-3 py-2 text-[11px] leading-5 transition', active ? 'bg-white/[0.04] text-white shadow-[inset_2px_0_0_rgba(77,171,247,0.68)]' : 'text-slate-400 hover:bg-white/[0.024] hover:text-slate-100') }, [
      h('span', { key: 'icon', className: cx('inline-flex min-w-[34px] items-center justify-center rounded-[8px] border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.15em]', active ? 'border-sky-400/20 bg-sky-400/10 text-sky-100' : 'border-white/[0.055] bg-white/[0.014] text-slate-500 group-hover:border-white/[0.11] group-hover:text-slate-200') }, item.icon ? navGlyph(item.icon) : navShortCode(item.slug)),
      h('span', { key: 'title', className: 'truncate font-medium' }, item.title),
     ]),
     active && item.children && item.children.length !== 0 ? h('div', { key: 'submenu', className: 'ml-7 grid gap-0.5 border-l border-white/[0.055] pl-3' }, item.children.map(function (child) {
      const childActive = props.active === child.slug
      return h(Link, { key: child.slug, href: '/app/' + child.slug, 'aria-current': childActive ? 'page' : undefined, className: cx('group flex items-center gap-2 rounded-[8px] px-2 py-1 text-[10px] leading-5 transition', childActive ? 'bg-white/[0.035] text-white' : 'text-slate-500 hover:text-slate-200') }, [
       h('span', { key: 'dot', className: cx('h-1 w-1 shrink-0 rounded-full', childActive ? 'bg-amber-300/80' : 'bg-slate-700 group-hover:bg-slate-500') }),
       h('span', { key: 'title', className: 'truncate' }, child.title),
      ])
     })) : null,
    ])
   }))),
   h('div', { key: 'utility', className: 'border-t border-white/[0.055] pt-3' }, [
    h('form', { key: 'search', action: '/app/macro-calendar', className: 'mb-3' }, [
     h('label', { key: 'label', htmlFor: 'rail-search', className: 'sr-only' }, 'Search macro events'),
     h('input', { key: 'input', id: 'rail-search', name: 'search', type: 'search', placeholder: 'Search events', className: 'w-full rounded-[9px] border border-white/[0.07] bg-white/[0.018] px-3 py-2 text-[11px] text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-sky-400/30 focus:bg-white/[0.035]' }),
    ]),
    h('div', { key: 'session', className: 'grid gap-2 rounded-[11px] border border-white/[0.05] bg-white/[0.012] px-3 py-2.5' }, [
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
  h('div', { key: 'content', className: cx('min-w-0 px-4 py-4 md:px-5 xl:px-6', props.contentClassName) }, [
   !props.hideTopbar ? h('div', { key: 'topbar', className: surfaces.topbar }, [
    h('div', { key: 'copy', className: 'min-w-0' }, [
     h('div', { key: 'eyebrow', className: 'text-[8px] font-semibold uppercase tracking-[0.24em] text-slate-500' }, activeSection ? activeSection.title : 'Macro desk'),
     h('h1', { key: 'title', className: 'mt-0.5 text-[22px] font-semibold tracking-tight text-white' }, props.title),
     h('p', { key: 'subtitle', className: 'mt-1 max-w-3xl text-[11px] leading-5 text-slate-400' }, props.subtitle),
    ]),
    h('div', { key: 'utility', className: 'flex flex-wrap items-center gap-1.5' }, [
     h(CommandPalette, { key: 'cmdk' }),
     h(Link, { key: 'workspaces', href: '/app/workspaces', className: 'desk-tab' }, 'Workspaces'),
     h(Link, { key: 'providers', href: '/app/data-sources', className: 'desk-tab' }, 'Data Sources'),
     h(Badge, { key: 'role' }, session.role),
     h(Badge, { key: 'mode', accent: mode === 'live' }, mode),
    ]),
   ]) : null,
   props.children ? h('div', { key: 'page-body' }, props.children) : null,
  ]),
 ]))
}
