import { createElement as h } from 'react'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(function () {
 return { getNews: vi.fn() }
})

vi.mock('@/lib/server/api', function () {
 return { getNews: api.getNews }
})

vi.mock('@/components/app/chrome', function () {
 return {
  PageShell: function PageShell(props: any) { return h('div', { 'data-testid': 'page-shell', 'data-mode': props.mode }, [h('h1', { key: 'title' }, props.title), h('div', { key: 'body' }, props.children)]) },
  Panel: function Panel(props: any) { return h('section', {}, [h('h2', { key: 'title' }, props.title), h('div', { key: 'body' }, props.children)]) },
  MetricGrid: function MetricGrid() { return h('div', {}, 'metrics') },
  Badge: function Badge(props: any) { return h('span', {}, props.children) },
  EventLink: function EventLink(props: any) { return h('a', { href: '/app/events/' + props.eventId }, props.title) },
  DataTable: function DataTable(props: any) { return h('table', {}, [h('thead', { key: 'head' }, h('tr', {}, props.headers.map(function (header: string, index: number) { return h('th', { key: header + String(index) }, header) }))), h('tbody', { key: 'body' }, (props.rows || []).map(function (row: any[], rowIndex: number) { return h('tr', { key: rowIndex }, row.map(function (cell: any, cellIndex: number) { return h('td', { key: String(rowIndex) + '-' + String(cellIndex) }, cell) })) }))]) },
 }
})

import NewsPage from '@/app/app/news/page'

const payload = {
 mode: 'wire',
 modeLabel: 'Wire',
 shellMode: 'mixed',
 freshness: 'fresh',
 sourceMeta: { label: 'News feed', source: 'Macro Access News Pipeline', freshness: 'fresh', mode: 'fallback', note: 'Primary official feeds are ranked above discovery feeds. AI text is deterministic enrichment over ingested data.' },
 summary: { total: 2, official: 1, discovery: 1, linkedEvents: 1, watchlistHits: 1, clusters: 2 },
 filters: { search: '', sourceType: '', region: '', topic: '', category: '', currency: '', asset: '', eventFamily: '', officialOnly: false, watchlistOnly: false, minUrgency: 0 },
 available: { modes: ['wire', 'macro', 'watchlist'], sourceTypes: ['official', 'discovery', 'seeded'], categories: ['Central bank', 'Labor'], regions: ['US'], topics: ['Central banks', 'Labor'], currencies: ['USD'], assets: ['SPX', 'US10Y'] },
 items: [
  { id: 'news-fed', slug: 'fed', title: 'Fed speakers stay patient', source: 'Federal Reserve', sourceType: 'official', sourceTier: 'primary', sourceUrl: 'https://www.federalreserve.gov', publishedAt: '2026-04-10T12:30:00+00:00', summary: 'Officials remain data dependent.', topic: 'Central banks', category: 'Central bank', sentiment: 'Neutral', region: 'US', country: 'United States', currency: 'USD', eventFamily: 'FOMC', affectedAssets: ['US2Y', 'DXY'], assetSymbols: ['US2Y', 'DXY'], importanceScore: 0.88, urgencyScore: 0.71, confidenceScore: 0.86, rankingScore: 0.91, mode: 'live', freshness: 'fresh', clusterId: 'cluster-a', clusterCount: 1, canonical: true, whyItMatters: 'Policy guidance reprices front-end rates.', relatedEventId: 'event-cpi-mar', relatedEventSlug: 'us-cpi-mar', relatedDashboardAsset: 'US2Y', watchOverlap: 1, links: { event: '/app/events/event-cpi-mar', calendar: '/app/macro-calendar', reactions: '/app/live-reactions', bias: '/app/market-bias', reports: '/app/reports', news: '/app/news?focus=news-fed', source: 'https://www.federalreserve.gov' } },
  { id: 'news-payroll', slug: 'payroll', title: 'Payrolls preview remains firm', source: 'Reuters', sourceType: 'discovery', sourceTier: 'secondary', sourceUrl: 'https://www.reuters.com', publishedAt: '2026-04-10T11:30:00+00:00', summary: 'Labor remains resilient.', topic: 'Labor', category: 'Labor', sentiment: 'Neutral', region: 'US', country: 'United States', currency: 'USD', eventFamily: 'US Payrolls', affectedAssets: ['SPX'], assetSymbols: ['SPX'], importanceScore: 0.73, urgencyScore: 0.63, confidenceScore: 0.62, rankingScore: 0.72, mode: 'live', freshness: 'fresh', clusterId: 'cluster-b', clusterCount: 2, canonical: true, whyItMatters: 'Labor surprises reprice rates path.', watchOverlap: 1, links: { calendar: '/app/macro-calendar', reactions: '/app/live-reactions', bias: '/app/market-bias', reports: '/app/reports', news: '/app/news?focus=news-payroll', source: 'https://www.reuters.com' } },
 ],
 rails: {
  topNow: [],
  centralBanks: [],
  calendarLinked: [],
  watchlistNews: [],
  highUrgency: [],
  sourceStatus: [
   { providerKey: 'fed', sourceType: 'official', status: 'live', mode: 'live', detail: '4 normalized / 1 deduped' },
  ],
 },
}

describe('NewsPage', function () {
 it('renders news wire, source status, and mode controls', async function () {
  api.getNews.mockResolvedValue(payload)
  const view = await NewsPage({})
  render(view)
  expect(api.getNews).toHaveBeenCalledTimes(1)
  expect(screen.getByText('Mode / filters')).toBeInTheDocument()
  expect(screen.getByText('Wire feed')).toBeInTheDocument()
  expect(screen.getByText('Source status')).toBeInTheDocument()
  expect(screen.getByText('Workflow pivots')).toBeInTheDocument()
  expect(screen.getByText('Fed speakers stay patient')).toBeInTheDocument()
  expect(screen.getByText('4 normalized / 1 deduped')).toBeInTheDocument()
  expect(screen.getAllByRole('link', { name: 'Graph' })[0]).toHaveAttribute('href', '/app/relationship-map?entity_type=scheduled_event&ref_id=event-cpi-mar')
  expect(screen.getByRole('link', { name: 'Open data sources' })).toHaveAttribute('href', '/app/data-sources')
  expect(screen.getByTestId('page-shell')).toHaveAttribute('data-mode', 'mixed')
 }, 15000)

 it('passes watchlist mode from search params to backend call', async function () {
  api.getNews.mockResolvedValue({ ...payload, mode: 'watchlist', modeLabel: 'Watchlist', shellMode: 'live' })
  const view = await NewsPage({ searchParams: Promise.resolve({ mode: 'watchlist', watchlist_only: 'true' }) })
  render(view)
  expect(api.getNews).toHaveBeenCalledWith(expect.objectContaining({ mode: 'watchlist', watchlistOnly: true }))
  expect(screen.getByTestId('page-shell')).toHaveAttribute('data-mode', 'live')
 }, 15000)

 it('renders empty-state row when feed is empty', async function () {
  api.getNews.mockResolvedValue({ ...payload, items: [], summary: { ...payload.summary, total: 0 } })
  const view = await NewsPage({})
  render(view)
  const feedPanel = screen.getByRole('heading', { name: 'Wire feed' }).closest('section') as HTMLElement
  expect(within(feedPanel).getByText('No items match current filters')).toBeInTheDocument()
 }, 15000)
})
