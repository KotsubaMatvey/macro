import { createElement as h } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(function () {
 return { getProviderStatus: vi.fn() }
})

vi.mock('@/lib/server/api', function () {
 return { getProviderStatus: api.getProviderStatus }
})

vi.mock('@/components/app/chrome', function () {
 return {
  PageShell: function PageShell(props: any) {
   return h('div', { 'data-testid': 'page-shell', 'data-active': props.active }, [h('h1', { key: 'title' }, props.title), h('div', { key: 'body' }, props.children)])
  },
  Panel: function Panel(props: any) {
   return h('section', {}, [h('h2', { key: 'title' }, props.title), h('div', { key: 'body' }, props.children)])
  },
  MetricGrid: function MetricGrid() {
   return h('div', {}, 'metrics')
  },
  Badge: function Badge(props: any) {
   return h('span', {}, props.children)
  },
  ScoreBar: function ScoreBar(props: any) {
   return h('span', {}, String(Math.round(props.value || 0)))
  },
  SourceCell: function SourceCell(props: any) {
   return h('span', {}, [props.state, props.mode, props.freshness, props.sourceType].filter(Boolean).join(' '))
  },
  EmptyState: function EmptyState(props: any) {
   return h('div', {}, [h('strong', { key: 'title' }, props.title), h('p', { key: 'body' }, props.body), props.action])
  },
  DataTable: function DataTable(props: any) {
   return h('table', {}, [
    h('thead', { key: 'head' }, h('tr', {}, props.headers.map(function (header: string, index: number) { return h('th', { key: header + String(index) }, header) }))),
    h('tbody', { key: 'body' }, (props.rows || []).map(function (row: any[], rowIndex: number) {
     return h('tr', { key: rowIndex }, row.map(function (cell: any, cellIndex: number) { return h('td', { key: String(rowIndex) + '-' + String(cellIndex) }, cell) }))
    })),
   ])
  },
 }
})

import DataSourcesPage from '@/app/app/data-sources/page'

const payload = {
 generatedAt: '2026-04-22T08:00:00+00:00',
 summary: { domains: 2, providers: 3, live: 1, degraded: 1, fallback: 1 },
 domains: [
  {
   key: 'market_data',
   label: 'Market data',
   description: 'Provider-backed market rows.',
   counts: { live: 1, degraded: 1, fallback: 0, demo: 0, derived: 0, static: 0 },
   items: [
    {
     providerKey: 'market:SPX',
     label: 'SPX market tape',
     domainKey: 'market_data',
     sourceType: 'official',
     sourceTier: 'primary',
     mode: 'live',
     freshness: 'fresh',
     state: 'live',
     note: 'Primary provider connected.',
     lastRefresh: '2026-04-22T07:55:00+00:00',
     lastUpdated: '2026-04-22T07:54:00+00:00',
     routeHint: '/app/dashboard?asset=SPX',
     diagnosticsPath: '/app/data-sources?domain=market_data',
     affectedSurfaces: ['dashboard', 'market-bias'],
     meta: {},
    },
   ],
  },
  {
   key: 'news_feeds',
   label: 'News official + discovery feeds',
   description: 'News provider rows.',
   counts: { live: 0, degraded: 0, fallback: 1, demo: 0, derived: 0, static: 0 },
   items: [
    {
     providerKey: 'news:seeded',
     label: 'Seeded news continuity',
     domainKey: 'news_feeds',
     sourceType: 'seeded',
     sourceTier: 'secondary',
     mode: 'fallback',
     freshness: 'degraded',
     state: 'fallback',
     note: 'No provider run rows found.',
     lastRefresh: null,
     lastUpdated: null,
     routeHint: '/app/news',
     diagnosticsPath: '/app/data-sources?domain=news_feeds',
     affectedSurfaces: ['news'],
     meta: {},
    },
   ],
  },
 ],
}

describe('DataSourcesPage', function () {
 it('renders provider control plane domains and rows', async function () {
  api.getProviderStatus.mockResolvedValue(payload)
  const view = await DataSourcesPage({})
  render(view)
  expect(api.getProviderStatus).toHaveBeenCalledTimes(1)
  expect(screen.getByTestId('page-shell')).toHaveAttribute('data-active', 'data-sources')
  expect(screen.getByText('Market data')).toBeInTheDocument()
  expect(screen.getAllByText('News official + discovery feeds').length).toBeGreaterThan(0)
  expect(screen.getByText('SPX market tape')).toBeInTheDocument()
  expect(screen.getAllByText('Seeded news continuity').length).toBeGreaterThan(0)
 }, 15000)

 it('applies domain filter from search params', async function () {
  api.getProviderStatus.mockResolvedValue(payload)
  const view = await DataSourcesPage({ searchParams: Promise.resolve({ domain: 'market_data' }) })
  render(view)
  expect(screen.getByText('Market data')).toBeInTheDocument()
  expect(screen.queryByText('News official + discovery feeds')).not.toBeInTheDocument()
 }, 15000)
})
