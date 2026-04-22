import { createElement as h } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(function () {
 return { getEvents: vi.fn(), getGraphNeighborhood: vi.fn() }
})

vi.mock('@/lib/server/api', function () {
 return { getEvents: api.getEvents, getGraphNeighborhood: api.getGraphNeighborhood }
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
  DataTable: function DataTable(props: any) {
   return h('table', {}, [
    h('thead', { key: 'head' }, h('tr', {}, props.headers.map(function (header: string, index: number) { return h('th', { key: header + String(index) }, header) }))),
    h('tbody', { key: 'body' }, (props.rows || []).map(function (row: any[], rowIndex: number) {
     return h('tr', { key: rowIndex }, row.map(function (cell: any, cellIndex: number) { return h('td', { key: String(rowIndex) + '-' + String(cellIndex) }, cell) }))
    })),
   ])
  },
  KeyValueList: function KeyValueList(props: any) {
   return h('div', {}, props.items.map(function (item: any) { return h('div', { key: item.label }, String(item.label) + ': ' + String(item.value)) }))
  },
 }
})

import RelationshipMapPage from '@/app/app/relationship-map/page'

describe('RelationshipMapPage', function () {
 it('renders graph neighborhood with node and edge tables', async function () {
  api.getEvents.mockResolvedValue([{ id: 'event-cpi-mar' }])
  api.getGraphNeighborhood.mockResolvedValue({
   generatedAt: '2026-04-22T08:00:00+00:00',
   root: {
    id: 'ient-1',
    entityType: 'scheduled_event',
    refId: 'event-cpi-mar',
    title: 'US CPI March',
    source: 'calendar',
    sourceType: 'official',
    sourceTier: 'primary',
    mode: 'live',
    freshness: 'fresh',
    routeHint: '/app/events/event-cpi-mar',
    surfaceHint: 'macro-calendar',
   },
   nodes: [
    {
     id: 'ient-1',
     entityType: 'scheduled_event',
     refId: 'event-cpi-mar',
     title: 'US CPI March',
     source: 'calendar',
     sourceType: 'official',
     sourceTier: 'primary',
     mode: 'live',
     freshness: 'fresh',
     confidenceScore: 0.8,
     metadata: {},
     routeHint: '/app/events/event-cpi-mar',
     surfaceHint: 'macro-calendar',
    },
    {
     id: 'ient-2',
     entityType: 'news_item',
     refId: 'news-1',
     title: 'CPI headline',
     source: 'Federal Reserve',
     sourceType: 'official',
     sourceTier: 'primary',
     mode: 'live',
     freshness: 'fresh',
     confidenceScore: 0.7,
     metadata: {},
     routeHint: '/app/news?focus=news-1',
     surfaceHint: 'news',
    },
   ],
   edges: [
    {
     id: 'edge-1',
     fromId: 'ient-1',
     toId: 'ient-2',
     linkType: 'linked_news',
     confidenceScore: 0.75,
     rationale: 'Event connected to related news row.',
    },
   ],
   summary: { nodeCount: 2, edgeCount: 1, truncated: false },
   filters: { depth: 1, limit: 80, linkTypes: ['linked_news'] },
   seedEntities: [
    {
     id: 'seed-1',
     entityType: 'scheduled_event',
     refId: 'event-cpi-mar',
     title: 'US CPI March',
     mode: 'live',
     freshness: 'fresh',
     routeHint: '/app/events/event-cpi-mar',
    },
   ],
  })

  const view = await RelationshipMapPage({})
  render(view)
  expect(api.getGraphNeighborhood).toHaveBeenCalledWith(expect.objectContaining({ entityType: 'scheduled_event', refId: 'event-cpi-mar' }))
  expect(screen.getByTestId('page-shell')).toHaveAttribute('data-active', 'relationship-map')
  expect(screen.getByText('Node neighborhood')).toBeInTheDocument()
  expect(screen.getByText('Relationship edges')).toBeInTheDocument()
  expect(screen.getAllByText('US CPI March').length).toBeGreaterThan(0)
  expect(screen.getAllByText('CPI headline').length).toBeGreaterThan(0)
 }, 15000)
})
