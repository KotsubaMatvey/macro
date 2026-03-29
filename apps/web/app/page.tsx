import Link from 'next/link'
import { createElement as h } from 'react'

import { APP_NAME, APP_TAGLINE, PUBLIC_LINKS } from '@northstar/config'
import { Panel } from '@/components/app/chrome'

export default function HomePage() {
  return h('main', { className: 'min-h-screen bg-[var(--bg)] px-6 py-8 text-slate-100' }, h('div', { className: 'mx-auto max-w-7xl space-y-12' }, [
    h('header', { key: 'hero', className: 'grid gap-6 border-b border-white/10 pb-8 lg:grid-cols-[1.4fr_1fr]' }, [
      h('div', { key: 'copy', className: 'max-w-4xl' }, [h('div', { key: 'eyebrow', className: 'inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-amber-300' }, 'Macro intelligence workstation'), h('h1', { key: 'title', className: 'mt-4 text-5xl font-semibold tracking-tight text-white' }, APP_TAGLINE), h('p', { key: 'body', className: 'mt-5 max-w-3xl text-lg leading-8 text-slate-400' }, APP_NAME + ' is a serious macro terminal for event driven traders. The platform links events, regime, market bias, briefings, alerts, and community workflows into one dense desktop surface.'), h('div', { key: 'actions', className: 'mt-6 flex flex-wrap gap-3' }, [h(Link, { key: 'demo', href: '/sign-in', className: 'rounded-md bg-amber-500 px-4 py-3 text-sm font-medium text-black' }, 'Open demo workstation'), h(Link, { key: 'pricing', href: '/pricing', className: 'rounded-md border border-white/10 px-4 py-3 text-sm text-slate-200' }, 'View pricing')])]),
      h(Panel, { key: 'panel', title: 'Platform shape' }, h('div', { className: 'grid gap-3 text-sm text-slate-300' }, ['Backend driven demo mode', 'Real auth and sessions', 'Postgres plus Redis worker', 'Modular app routes for major surfaces'].map(function (item) { return h('div', { key: item, className: 'rounded-xl border border-white/10 p-4' }, item) }))),
    ]),
    h('div', { key: 'links', className: 'grid gap-4 md:grid-cols-3' }, PUBLIC_LINKS.map(function (item) { return h(Link, { key: item.slug, href: '/' + item.slug, className: 'rounded-2xl border border-white/10 bg-[var(--panel)] p-5 text-sm text-slate-300 transition hover:border-white/20 hover:text-white' }, item.title) })),
  ]))
}
