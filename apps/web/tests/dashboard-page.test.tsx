import { createElement as h } from 'react'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(function () {
 return { getDashboard: vi.fn(), getEvents: vi.fn() }
})

vi.mock('@/lib/server/api', function () {
 return { getDashboard: api.getDashboard, getEvents: api.getEvents }
})

vi.mock('@/components/app/chrome', function () {
 return {
 PageShell: function PageShell(props: any) { return h('div', {}, [h('h1', { key: 'title' }, props.title), h('div', { key: 'body' }, props.children)]) },
 Panel: function Panel(props: any) { return h('section', {}, [h('h2', { key: 'title' }, props.title), props.actions ? h('div', { key: 'actions' }, props.actions) : null, h('div', { key: 'body' }, props.children)]) },
 DataTable: function DataTable(props: any) { return h('table', {}, [h('thead', { key: 'head' }, h('tr', {}, props.headers.map(function (header: string, index: number) { return h('th', { key: header + String(index) }, header) }))), h('tbody', { key: 'body' }, (props.rows || []).map(function (row: any[], rowIndex: number) { return h('tr', { key: rowIndex }, row.map(function (cell: any, cellIndex: number) { return h('td', { key: String(rowIndex) + '-' + String(cellIndex) }, cell) })) }))]) },
 Badge: function Badge(props: any) { return h('span', {}, props.children) },
 }
})

import DashboardPage from '@/app/app/dashboard/page'

const payload = {
 generatedAt: '2026-04-01T08:00:00+00:00',
 session: { id: 'user-demo', email: 'demo@macroaccess.local', name: 'Demo', role: 'user', onboardingCompleted: true, emailVerified: true },
 hero: {
 defaultSymbol: 'SPX',
 sourceNote: 'Source note',
 modelNote: 'Model note',
 assets: [
 { symbol: 'SPX', title: 'SPX Index', price: '5,712.40', change1dPct: -0.08, change30dPct: 3.4, expectedMove5dPct: 1.9, stance: 'Bullish', confidence: 0.74, regimeContext: 'Risk supportive / liquidity mixed', freshness: { label: 'SPX', source: 'FRED', freshness: 'fresh', mode: 'live', note: 'Desk tape' } },
 { symbol: 'US10Y', title: 'US 10Y Yield', price: '4.31%', change1dPct: 0.12, change30dPct: 0.44, expectedMove5dPct: 0.2, stance: 'Bearish', confidence: 0.68, regimeContext: 'Rates remain restrictive', freshness: { label: 'US10Y', source: 'FRED', freshness: 'fresh', mode: 'live', note: 'Desk tape' } },
 { symbol: 'DXY', title: 'Broad Dollar Index', price: '103.82', change1dPct: 0.21, change30dPct: 1.8, expectedMove5dPct: 0.7, stance: 'Bullish', confidence: 0.61, regimeContext: 'Dollar is taxing liquidity', freshness: { label: 'DXY', source: 'FRED', freshness: 'fresh', mode: 'live', note: 'Desk tape' } },
 { symbol: 'XAU', title: 'Gold AM Fix', price: ',318.00/oz', change1dPct: 0.42, change30dPct: 4.1, expectedMove5dPct: 1.4, stance: 'Neutral', confidence: 0.52, regimeContext: 'Real rates and dollar offset safe-haven demand', freshness: { label: 'XAU', source: 'FRED', freshness: 'fresh', mode: 'live', note: 'Desk tape' } },
 { symbol: 'BTC', title: 'Bitcoin / USD', price: ',450', change1dPct: 1.2, change30dPct: 8.4, expectedMove5dPct: 6.1, stance: 'Bullish', confidence: 0.72, regimeContext: 'Risk appetite remains supportive', freshness: { label: 'BTC', source: 'FRED', freshness: 'fresh', mode: 'live', note: 'Desk tape' } },
 { symbol: 'EURUSD', title: 'EUR / USD', price: '1.0832', change1dPct: -0.11, change30dPct: -0.8, expectedMove5dPct: 0.5, stance: 'Bearish', confidence: 0.57, regimeContext: 'Dollar strength still dominates', freshness: { label: 'EURUSD', source: 'FRED', freshness: 'fresh', mode: 'live', note: 'Desk tape' } },
 { symbol: 'US2Y', title: 'US 2Y Yield', price: '4.67%', change1dPct: 0.05, change30dPct: 0.31, expectedMove5dPct: 0.12, stance: 'Bearish', confidence: 0.59, regimeContext: 'Front-end remains tight', freshness: { label: 'US2Y', source: 'FRED', freshness: 'fresh', mode: 'live', note: 'Desk tape' } },
 ],
 },
 keyCatalyst: { title: 'Core CPI (MoM)', status: 'Upcoming', scheduledAt: '2026-04-01T12:30:00+00:00', countdownLabel: '4h 30m', impact: 'High', country: 'United States', currency: 'USD', relatedAssets: ['SPX', 'US10Y', 'BTC'], threshold: 'Prev 0.4% В· Est 0.3%', sensitivity: 'Inflation reprices rates.', whyItMatters: 'Inflation reprices rates.', context: ['Risk regime supports the current tape', 'Liquidity is still mixed beneath the surface', 'Desk note linked into the catalyst board'], href: '/app/events/event-cpi-mar', freshness: { label: 'Catalyst calendar', source: 'Internal calendar', freshness: 'aging', mode: 'demo', note: 'Live provider missing' } },
 riskRegime: { label: 'Risk-on', score: 24.1, delta: 3.2, trend: 'Improving', interpretation: 'Risk appetite is supportive.', drivers: ['SPX and BTC momentum anchor the risk side', 'Dollar pressure only partly offsets the tape'], history: [{ label: '1', value: 10 }, { label: '2', value: 18 }, { label: '3', value: 24 }], freshness: { label: 'Risk regime', source: 'FRED composite', freshness: 'fresh', mode: 'live', note: 'Real regime' } },
 liquidityRegime: { label: 'Neutral', score: 2.4, delta: -1.1, trend: 'Stable', interpretation: 'Liquidity remains mixed.', drivers: ['WALCL is supportive but front-end yields remain tight', 'Dollar strength acts as a liquidity tax'], history: [{ label: '1', value: 8 }, { label: '2', value: 4 }, { label: '3', value: 2 }], freshness: { label: 'Liquidity regime', source: 'FRED composite', freshness: 'fresh', mode: 'live', note: 'Real liquidity' } },
 marketConsensus: { label: 'Risk is being rewarded', score: 8.2, trend30d: 'Improving', confidence: 0.68, sampleSize: 7, note: 'Consensus is aggregated from live assets.', href: '/app/market-bias', assets: [{ symbol: 'SPX', direction: 'Bullish', confidence: 0.74, change30dPct: 3.4, note: 'Equities remain bid' }, { symbol: 'US10Y', direction: 'Bearish', confidence: 0.68, change30dPct: 0.44, note: 'Rates stay restrictive' }, { symbol: 'DXY', direction: 'Bullish', confidence: 0.61, change30dPct: 1.8, note: 'Dollar still firm' }, { symbol: 'BTC', direction: 'Bullish', confidence: 0.72, change30dPct: 8.4, note: 'Risk assets lead' }], freshness: { label: 'Consensus', source: 'FRED composite', freshness: 'fresh', mode: 'live', note: 'Derived from live series' } },
 liquidityInputs: [{ label: 'Balance sheet', value: '.86T', detail: '+0.42% / 8w', tone: 'Supportive' }, { label: 'US 2Y', value: '4.67%', detail: '+0.31 / 20d', tone: 'Restrictive' }, { label: 'Dollar', value: '103.82', detail: '+1.80% / 20d', tone: 'Restrictive' }],
 trackRecord: { status: 'Retrospective replay', evaluationMode: 'retrospective-model-replay', sampleSize: 8, hitRate: 0.63, note: 'Replay only.', records: [], freshness: { label: 'Track record', source: 'FRED composite', freshness: 'fresh', mode: 'live', note: 'Backtest' } },
 linkedIntelligence: { briefings: [{ title: 'Morning Briefing', subtitle: 'Desk note', href: '/app/briefings', mode: 'demo' }], news: [], watchlists: [], alerts: [{ title: 'CPI alert', subtitle: 'Scheduled / In-app', href: '/app/alerts', mode: 'live' }], catalysts: [] },
 utility: { activeSession: 'London / New York', refreshedAt: '2026-04-01T08:00:00+00:00', sessions: [{ code: 'LDN', label: 'London', active: true }, { code: 'NYC', label: 'New York', active: false }], providers: [{ name: 'FRED market tape', status: 'live', detail: 'Official public series connected', mode: 'live' }, { name: 'Catalyst calendar', status: 'fallback', detail: 'Internal seeded calendar', mode: 'demo' }] },
}

const events = [
 { id: 'event-cpi-mar', family: 'CPI', title: 'Core CPI (MoM)', slug: 'core-cpi-mom', country: 'United States', currency: 'USD', impact: 'High', category: 'Inflation', scheduledAt: '2026-04-01T12:30:00+00:00', status: 'Upcoming', previous: 0.4, forecast: 0.3, whyItMatters: 'Inflation reprices rates.', relatedAssets: ['SPX', 'US10Y', 'BTC'] },
 { id: 'event-fed-waller', family: 'Fed Speaker', title: 'Fed Speaker -- Waller', slug: 'fed-speaker-waller', country: 'United States', currency: 'USD', impact: 'Low', category: 'Central bank', scheduledAt: '2026-04-01T16:00:00+00:00', status: 'Upcoming', previous: undefined, forecast: undefined, whyItMatters: 'Guidance can shift rate expectations.', relatedAssets: ['US10Y', 'DXY'] },
 { id: 'event-jobless', family: 'Jobless Claims', title: 'Initial Jobless Claims', slug: 'initial-jobless-claims', country: 'United States', currency: 'USD', impact: 'High', category: 'Labor', scheduledAt: '2026-04-02T08:30:00+00:00', status: 'Upcoming', previous: 212, forecast: 215, whyItMatters: 'Labor softness changes the rates path.', relatedAssets: ['SPX', 'US10Y'] },
 { id: 'event-ecb-rate', family: 'ECB Rate Decision', title: 'ECB Rate Decision', slug: 'ecb-rate-decision', country: 'Eurozone', currency: 'EUR', impact: 'Medium', category: 'Central bank', scheduledAt: '2026-04-02T10:00:00+00:00', status: 'Upcoming', previous: 4.5, forecast: 4.5, whyItMatters: 'EUR rates and FX repricing.', relatedAssets: ['EURUSD', 'DXY'] },
 { id: 'event-nfp', family: 'Nonfarm Payrolls', title: 'Nonfarm Payrolls', slug: 'nonfarm-payrolls', country: 'United States', currency: 'USD', impact: 'High', category: 'Labor', scheduledAt: '2026-04-04T08:30:00+00:00', status: 'Upcoming', previous: 236, forecast: 242, whyItMatters: 'Payrolls can reset the whole rates path.', relatedAssets: ['SPX', 'US10Y', 'DXY'] },
]

describe('DashboardPage', function () {
 it('renders the workstation boards and desk links', async function () {
 api.getDashboard.mockResolvedValue(payload)
 api.getEvents.mockResolvedValue(events)
 const view = await DashboardPage({})
 render(view)
 expect(api.getDashboard).toHaveBeenCalledTimes(1)
 expect(api.getEvents).toHaveBeenCalledTimes(1)
 expect(screen.getByText('Regime & Bias')).toBeInTheDocument()
 expect(screen.getByText('Next Catalysts')).toBeInTheDocument()
 expect(screen.getByText('Macro Calendar -- APR 2026')).toBeInTheDocument()
 expect(screen.getByText('Market strip')).toBeInTheDocument()
 expect(screen.getByText('Balance sheet')).toBeInTheDocument()
 expect(screen.getAllByText('SPX')[0]).toBeInTheDocument()
 expect(screen.getAllByText('BTC')[0]).toBeInTheDocument()
 expect(screen.getAllByText('live').length).toBeGreaterThan(0)
 expect(screen.getAllByText('demo').length).toBeGreaterThan(0)
 expect(screen.getAllByRole('link', { name: 'Core CPI (MoM)' })[0]).toHaveAttribute('href', '/app/events/event-cpi-mar')
 expect(screen.getByRole('link', { name: 'Open full calendar' })).toHaveAttribute('href', '/app/macro-calendar')
 expect(screen.getByText('Macro Calendar -- APR 2026')).toBeInTheDocument()
 }, 15000)

 it('respects the catalyst window and calendar impact filters', async function () {
 api.getDashboard.mockResolvedValue(payload)
 api.getEvents.mockResolvedValue(events)
 const view = await DashboardPage({ searchParams: Promise.resolve({ window: '48h', impact: 'High' }) })
 render(view)
 const catalystPanel = screen.getByRole('heading', { name: 'Next Catalysts' }).closest('section') as HTMLElement
 const calendarPanel = screen.getByRole('heading', { name: 'Macro Calendar -- APR 2026' }).closest('section') as HTMLElement
 expect(within(catalystPanel).getAllByText('Core CPI (MoM)')[0]).toBeInTheDocument()
 expect(within(catalystPanel).queryByText('Nonfarm Payrolls')).not.toBeInTheDocument()
 expect(within(calendarPanel).getByText('Initial Jobless Claims')).toBeInTheDocument()
 expect(within(calendarPanel).queryByText('ECB Rate Decision')).not.toBeInTheDocument()
 }, 15000)

 it('accepts backend Medium impact values while keeping compact labels', async function () {
  api.getDashboard.mockResolvedValue(payload)
  api.getEvents.mockResolvedValue(events)
  const view = await DashboardPage({ searchParams: Promise.resolve({ impact: 'Medium' }) })
  render(view)
  const calendarPanel = screen.getByRole('heading', { name: 'Macro Calendar -- APR 2026' }).closest('section') as HTMLElement
  expect(within(calendarPanel).getByRole('link', { name: 'ECB Rate Decision' })).toBeInTheDocument()
  expect(within(calendarPanel).queryByText('Initial Jobless Claims')).not.toBeInTheDocument()
  expect(within(calendarPanel).getAllByText('Med').length).toBeGreaterThan(1)
 }, 15000)

 it('normalizes legacy Med query params and preserves drill-down links', async function () {
  api.getDashboard.mockResolvedValue(payload)
  api.getEvents.mockResolvedValue(events)
  const view = await DashboardPage({ searchParams: Promise.resolve({ impact: 'Med', window: '1w' }) })
  render(view)
  const catalystPanel = screen.getByRole('heading', { name: 'Next Catalysts' }).closest('section') as HTMLElement
  const calendarPanel = screen.getByRole('heading', { name: 'Macro Calendar -- APR 2026' }).closest('section') as HTMLElement
  expect(within(calendarPanel).getByRole('link', { name: 'ECB Rate Decision' })).toBeInTheDocument()
  expect(within(calendarPanel).getByRole('link', { name: 'ECB Rate Decision' })).toHaveAttribute('href', '/app/events/event-ecb-rate')
  expect(within(catalystPanel).getByRole('link', { name: /Nonfarm Payrolls/ })).toHaveAttribute('href', '/app/events/event-nfp')
 }, 15000)

 it('keeps market strip freshness honest for the focused asset context', async function () {
  const marketPayload = JSON.parse(JSON.stringify(payload))
  marketPayload.hero.assets = marketPayload.hero.assets.map(function (item: any) {
   if (item.symbol !== 'EURUSD') return item
   return { ...item, freshness: { ...item.freshness, mode: 'demo', freshness: 'aging' } }
  })
  api.getDashboard.mockResolvedValue(marketPayload)
  api.getEvents.mockResolvedValue(events)
  const view = await DashboardPage({ searchParams: Promise.resolve({ asset: 'EURUSD' }) })
  render(view)
  const marketPanel = screen.getByRole('heading', { name: 'Market strip' }).closest('section') as HTMLElement
  expect(within(marketPanel).getByText('demo')).toBeInTheDocument()
  expect(within(marketPanel).getByText('aging')).toBeInTheDocument()
  expect(within(marketPanel).getByRole('link', { name: /EURUSD/ })).toHaveAttribute('href', '/app/dashboard?asset=EURUSD')
 }, 15000)

 it('applies region and category filters inside the calendar board', async function () {
  api.getDashboard.mockResolvedValue(payload)
  api.getEvents.mockResolvedValue(events)
  const view = await DashboardPage({ searchParams: Promise.resolve({ impact: 'Medium', region: 'Eurozone', category: 'Central bank' }) })
  render(view)
  const calendarPanel = screen.getByRole('heading', { name: 'Macro Calendar -- APR 2026' }).closest('section') as HTMLElement
  expect(within(calendarPanel).getByRole('link', { name: 'ECB Rate Decision' })).toBeInTheDocument()
  expect(within(calendarPanel).queryByText('Initial Jobless Claims')).not.toBeInTheDocument()
  expect(within(calendarPanel).getByRole('link', { name: 'Eurozone' })).toBeInTheDocument()
 }, 15000)

 it('treats degraded live assets as fallback in strip totals', async function () {
  const marketPayload = JSON.parse(JSON.stringify(payload))
  marketPayload.hero.assets = marketPayload.hero.assets.map(function (item: any) {
   if (item.symbol !== 'US10Y') return item
   return { ...item, freshness: { ...item.freshness, mode: 'live', freshness: 'degraded' } }
  })
  api.getDashboard.mockResolvedValue(marketPayload)
  api.getEvents.mockResolvedValue(events)
  const view = await DashboardPage({})
  render(view)
  const marketPanel = screen.getByRole('heading', { name: 'Market strip' }).closest('section') as HTMLElement
  expect(marketPanel.textContent).toContain('Live 6')
  expect(marketPanel.textContent).toContain('Fallback 1')
 }, 15000)
 it('reports calendar dataset and filtered view modes separately', async function () {
  const mixedEvents = [
   { ...events[0], freshness: { label: 'Catalyst calendar', source: 'TradingEconomics', freshness: 'fresh', mode: 'live', note: 'Live row' } },
   { ...events[1], freshness: { label: 'Catalyst calendar', source: 'Seeded macro calendar', freshness: 'degraded', mode: 'demo', note: 'Fallback row' } },
  ]
  api.getDashboard.mockResolvedValue(payload)
  api.getEvents.mockResolvedValue(mixedEvents)
  const view = await DashboardPage({ searchParams: Promise.resolve({ impact: 'High' }) })
  render(view)
  const calendarPanel = screen.getByRole('heading', { name: 'Macro Calendar -- APR 2026' }).closest('section') as HTMLElement
  expect(calendarPanel.textContent).toContain('Dataset mixed (1/1/0)')
  expect(calendarPanel.textContent).toContain('View live (1/0/0)')
 }, 15000)

})


