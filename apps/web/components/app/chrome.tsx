import Link from 'next/link'  
import { createElement as h } from 'react'  
  
import { APP_NAME, APP_SECTIONS } from '@northstar/config'  
import { cx, surfaces } from '@northstar/ui'  
  
type Child = any  
  
export function Badge(props: { children?: Child; accent?: boolean }) {  
  return h('span', { className: cx('inline-flex rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.16em]', props.accent ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-white/10 bg-white/[0.03] text-slate-300') }, props.children ?? null)  
}  
  
export function Panel(props: { title: string; children?: Child; className?: string }) {  
  return h('section', { className: cx(surfaces.panel, props.className) }, [  
    h('div', { key: 'title', className: 'mb-4 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500' }, props.title),  
    h('div', { key: 'body' }, props.children ?? null),  
  ])  
}  
  
export function MetricGrid(props: { items: { label: string; value: string; note: string }[] }) {  
  return h('div', { className: 'grid gap-4 md:grid-cols-2 2xl:grid-cols-4' }, props.items.map(function (item) {  
    return h('div', { key: item.label, className: surfaces.metric }, [  
      h('div', { key: 'label', className: 'text-[11px] uppercase tracking-[0.14em] text-slate-500' }, item.label),  
      h('div', { key: 'value', className: 'mt-3 font-mono text-3xl text-white' }, item.value),  
      h('div', { key: 'note', className: 'mt-2 text-sm text-slate-400' }, item.note),  
    ])  
  }))  
}  
  
export function DataTable(props: { headers: string[]; rows: string[][] }) {  
  return h('div', { className: 'overflow-x-auto' }, h('table', { className: 'min-w-full border-separate border-spacing-0 text-left text-sm' }, [  
    h('thead', { key: 'head' }, h('tr', {}, props.headers.map(function (header) { return h('th', { key: header, className: 'border-b border-white/10 px-3 py-3 text-[11px] uppercase tracking-[0.16em] text-slate-500' }, header) }))),  
    h('tbody', { key: 'body' }, props.rows.map(function (row, index) { return h('tr', { key: index }, row.map(function (cell, cellIndex) { return h('td', { key: String(index) + '-' + String(cellIndex), className: 'border-b border-white/5 px-3 py-3 text-slate-200' }, cell) })) })),  
  ]))  
}  
  
export function PageShell(props: { title: string; subtitle: string; active: string; rightRail?: Child; children?: Child }) {  
  const navItems = APP_SECTIONS.filter(function (item) { return !item.adminOnly })  
  return h('main', { className: surfaces.page }, h('div', { className: surfaces.shell }, [  
    h('aside', { key: 'sidebar', className: surfaces.sidebar }, [  
      h('div', { key: 'brand', className: 'mb-6 border-b border-white/10 pb-4' }, [  
        h('div', { key: 'eyebrow', className: 'text-[11px] uppercase tracking-[0.22em] text-amber-400' }, 'Macro Intelligence'),  
        h('div', { key: 'name', className: 'mt-2 text-2xl font-semibold text-white' }, APP_NAME),  
      ]),  
      h('nav', { key: 'nav', className: 'grid gap-1' }, navItems.map(function (item) { return h(Link, { key: item.slug, href: '/app/' + item.slug, className: cx('rounded-md px-3 py-2 text-sm transition', props.active === item.slug ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white') }, item.title) })),  
    ]),  
    h('div', { key: 'content', className: 'px-5 py-5' }, [  
      h('div', { key: 'topbar', className: surfaces.topbar }, [  
        h('div', { key: 'copy' }, [h('h1', { key: 'title', className: 'text-3xl font-semibold tracking-tight text-white' }, props.title), h('p', { key: 'subtitle', className: 'mt-1 max-w-3xl text-sm text-slate-400' }, props.subtitle)]),  
        h('div', { key: 'badges', className: 'flex flex-wrap gap-2' }, [h(Badge, { key: 'demo', accent: true }, 'Backend driven'), h(Badge, { key: 'auth' }, 'Real auth'), h(Badge, { key: 'worker' }, 'Redis jobs')]),  
      ]),  
      props.children ?? null,  
    ]),  
  ]))  
}