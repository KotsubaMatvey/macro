import Link from 'next/link'
import { createElement as h } from 'react'

import { APP_NAME, APP_SECTIONS, APP_TAGLINE } from '@northstar/config'

const heroStats = [
  { label: 'Tracked catalysts', value: '1,200+', note: 'Macro releases, speeches, inflation prints, labor data, and cross-asset follow-through.' },
  { label: 'Refresh cadence', value: '1 min', note: 'Fast enough for pre-release prep, not just end-of-day commentary.' },
  { label: 'Linked surfaces', value: '12', note: 'Bias, regime, calendar, briefings, impacts, charts, alerts, community, and more.' },
]

const primarySurfaces = [
  {
    title: 'Market Bias',
    eyebrow: 'Consensus engine',
    body: 'Directional stance by asset with structured rationale, narrative context, and positioning shifts before the release window.',
    href: '/sign-in',
  },
  {
    title: 'Risk Regime',
    eyebrow: 'State detection',
    body: 'A transparent read on whether the tape supports aggression, tactical patience, or defense across the session.',
    href: '/sign-in',
  },
  {
    title: 'Macro Calendar',
    eyebrow: 'Catalyst map',
    body: 'High-impact events with country, forecast, actual, status, and a clean route into the event-specific reaction view.',
    href: '/sign-in',
  },
  {
    title: 'Advanced Charts',
    eyebrow: 'Execution context',
    body: 'Provider-ready charting surface for tracking the reaction path around each release instead of reading headlines in isolation.',
    href: '/sign-in',
  },
]

const workflow = [
  {
    step: '01',
    title: 'Map the day',
    body: 'Start from the calendar, rank catalysts, and pin the releases that can actually move rates, FX, crypto beta, and index futures.',
  },
  {
    step: '02',
    title: 'Read the regime',
    body: 'Check whether the market is rewarding risk, punishing duration, or fading macro surprises before you size anything.',
  },
  {
    step: '03',
    title: 'Frame the reaction',
    body: 'Use briefings, bias, and historical impact windows to define what a beat, miss, or inline print should mean in practice.',
  },
  {
    step: '04',
    title: 'Execute and monitor',
    body: 'Keep charts, alerts, and community surfaces live while the event resolves and the second-order narrative forms.',
  },
]

const intelligencePanels = [
  {
    title: 'Briefings',
    body: 'Morning and pre-event prep distilled into a dense format designed for people who already know the vocabulary.',
    href: '/sign-in',
  },
  {
    title: 'Historical Impacts',
    body: 'Reaction windows and event families grouped so traders can study repeat patterns instead of relying on memory.',
    href: '/sign-in',
  },
  {
    title: 'Options Flow',
    body: 'A dedicated tape for unusual activity, large positioning shifts, and the context around institutional expression.',
    href: '/sign-in',
  },
  {
    title: 'Community',
    body: 'Professional discussion without turning the product into a social feed first and a workstation second.',
    href: '/sign-in',
  },
]

export default function HomePage() {
  return h('main', { className: 'macro-home min-h-screen px-6 py-8 text-slate-100' }, h('div', { className: 'mx-auto flex max-w-7xl flex-col gap-8' }, [
    h('section', { key: 'hero', className: 'macro-grid gap-6' }, [
      h('div', { key: 'copy', className: 'macro-card macro-card-hero' }, [
        h('div', { key: 'eyebrow', className: 'macro-kicker' }, 'Macro intelligence platform'),
        h('h1', { key: 'title', className: 'mt-5 max-w-5xl text-5xl font-semibold tracking-[-0.04em] text-white md:text-7xl' }, APP_TAGLINE),
        h('p', { key: 'body', className: 'mt-6 max-w-3xl text-base leading-7 text-slate-300 md:text-lg' }, APP_NAME + ' is a dense workstation for event-driven traders who need the release calendar, regime state, bias, intelligence, and reaction surfaces in one coherent flow. The product is built around catalysts and the market response, not generic dashboard filler.'),
        h('div', { key: 'actions', className: 'mt-8 flex flex-wrap gap-3' }, [
          h(Link, { key: 'demo', href: '/sign-in', className: 'rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[var(--accent-strong)]' }, 'Open demo workstation'),
          h(Link, { key: 'app', href: '/sign-in', className: 'rounded-full border border-white/12 bg-white/[0.04] px-5 py-3 text-sm text-slate-100 transition hover:border-white/25 hover:bg-white/[0.08]' }, 'View dashboard'),
        ]),
        h('div', { key: 'stats', className: 'mt-10 grid gap-3 md:grid-cols-3' }, heroStats.map(function (item) {
          return h('div', { key: item.label, className: 'macro-stat' }, [
            h('div', { key: 'label', className: 'text-[11px] uppercase tracking-[0.18em] text-slate-500' }, item.label),
            h('div', { key: 'value', className: 'mt-3 text-3xl font-semibold text-white' }, item.value),
            h('p', { key: 'note', className: 'mt-2 text-sm leading-6 text-slate-400' }, item.note),
          ])
        })),
      ]),
      h('div', { key: 'rail', className: 'flex flex-col gap-6' }, [
        h('div', { key: 'focus', className: 'macro-card macro-card-rail' }, [
          h('div', { key: 'title', className: 'macro-kicker' }, 'Operator focus'),
          h('div', { key: 'headline', className: 'mt-4 text-2xl font-semibold text-white' }, 'Built for release-driven decision loops'),
          h('div', { key: 'list', className: 'mt-6 grid gap-3' }, [
            'Know what matters before the print hits.',
            'Tie regime state to event expectations.',
            'Study reactions by event family, not anecdotes.',
            'Move from prep to execution without changing tools.',
          ].map(function (item) {
            return h('div', { key: item, className: 'macro-list-row' }, item)
          })),
        ]),
        h('div', { key: 'map', className: 'macro-card macro-card-rail' }, [
          h('div', { key: 'title', className: 'macro-kicker' }, 'Coverage map'),
          h('div', { key: 'grid', className: 'mt-4 grid gap-2 text-sm text-slate-300' }, APP_SECTIONS.slice(0, 12).map(function (item, index) {
            return h(Link, { key: item.slug, href: '/sign-in', className: 'macro-section-link' }, [
              h('span', { key: 'index', className: 'text-slate-500' }, String(index + 1).padStart(2, '0')),
              h('span', { key: 'title', className: 'text-white' }, item.title),
            ])
          })),
        ]),
      ]),
    ]),
    h('section', { key: 'surfaces', className: 'macro-card' }, [
      h('div', { key: 'heading', className: 'flex flex-col gap-3 border-b border-white/8 pb-6 md:flex-row md:items-end md:justify-between' }, [
        h('div', { key: 'copy' }, [
          h('div', { key: 'eyebrow', className: 'macro-kicker' }, 'Core surfaces'),
          h('h2', { key: 'title', className: 'mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl' }, 'The platform is organized around the decision stack'),
        ]),
        h('p', { key: 'body', className: 'max-w-2xl text-sm leading-6 text-slate-400' }, 'Each surface answers a distinct question: what matters today, what regime are we in, what should happen if the print surprises, and how is the market actually reacting.')
      ]),
      h('div', { key: 'grid', className: 'mt-6 grid gap-4 lg:grid-cols-2' }, primarySurfaces.map(function (item) {
        return h(Link, { key: item.title, href: item.href, className: 'macro-surface-card' }, [
          h('div', { key: 'eyebrow', className: 'text-[11px] uppercase tracking-[0.18em] text-amber-300/80' }, item.eyebrow),
          h('div', { key: 'title', className: 'mt-3 text-2xl font-semibold text-white' }, item.title),
          h('p', { key: 'body', className: 'mt-3 max-w-xl text-sm leading-6 text-slate-400' }, item.body),
          h('div', { key: 'action', className: 'mt-5 text-sm text-slate-200' }, 'Open surface')
        ])
      })),
    ]),
    h('section', { key: 'workflow', className: 'macro-grid gap-6' }, [
      h('div', { key: 'process', className: 'macro-card' }, [
        h('div', { key: 'eyebrow', className: 'macro-kicker' }, 'Trading workflow'),
        h('h2', { key: 'title', className: 'mt-3 text-3xl font-semibold tracking-tight text-white' }, 'From event prep to post-release monitoring'),
        h('div', { key: 'steps', className: 'mt-6 grid gap-4' }, workflow.map(function (item) {
          return h('div', { key: item.step, className: 'macro-workflow-row' }, [
            h('div', { key: 'step', className: 'text-xl font-semibold text-amber-300' }, item.step),
            h('div', { key: 'copy' }, [
              h('div', { key: 'title', className: 'text-lg font-medium text-white' }, item.title),
              h('p', { key: 'body', className: 'mt-2 text-sm leading-6 text-slate-400' }, item.body),
            ]),
          ])
        })),
      ]),
      h('div', { key: 'intel', className: 'macro-card' }, [
        h('div', { key: 'eyebrow', className: 'macro-kicker' }, 'Research layer'),
        h('h2', { key: 'title', className: 'mt-3 text-3xl font-semibold tracking-tight text-white' }, 'Intelligence surfaces that support execution'),
        h('div', { key: 'grid', className: 'mt-6 grid gap-3' }, intelligencePanels.map(function (item) {
          return h(Link, { key: item.title, href: item.href, className: 'macro-list-card' }, [
            h('div', { key: 'title', className: 'text-lg font-medium text-white' }, item.title),
            h('p', { key: 'body', className: 'mt-2 text-sm leading-6 text-slate-400' }, item.body),
          ])
        })),
      ]),
    ]),
    h('section', { key: 'cta', className: 'macro-card macro-cta' }, [
      h('div', { key: 'eyebrow', className: 'macro-kicker' }, 'Access'),
      h('h2', { key: 'title', className: 'mt-3 max-w-4xl text-3xl font-semibold tracking-tight text-white md:text-5xl' }, 'A serious macro front-end for traders who do not want five disconnected tools'),
      h('p', { key: 'body', className: 'mt-5 max-w-3xl text-base leading-7 text-slate-300' }, 'Open the demo workstation to inspect the product surfaces already wired into the app, or review the commercial framing on the pricing page.'),
      h('div', { key: 'actions', className: 'mt-8 flex flex-wrap gap-3' }, [
        h(Link, { key: 'signin', href: '/sign-in', className: 'rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200' }, 'Open demo'),
        h(Link, { key: 'pricing', href: '/pricing', className: 'rounded-full border border-white/12 bg-white/[0.04] px-5 py-3 text-sm text-white transition hover:border-white/25 hover:bg-white/[0.08]' }, 'Review pricing'),
      ]),
    ]),
  ]))
}
