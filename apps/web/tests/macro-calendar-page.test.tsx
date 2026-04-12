import { createElement as h } from 'react'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(function () {
 return { getEvents: vi.fn(), getWorkstation: vi.fn() }
})

vi.mock('@/lib/server/api', function () {
 return { getEvents: api.getEvents, getWorkstation: api.getWorkstation }
})

vi.mock('@/components/app/chrome', function () {
 return {
  PageShell: function PageShell(props: any) { return h('div', { 'data-testid': 'page-shell', 'data-mode': props.mode }, [h('h1', { key: 'title' }, props.title), h('div', { key: 'body' }, props.children)]) },
  Panel: function Panel(props: any) { return h('section', {}, [h('h2', { key: 'title' }, props.title), h('div', { key: 'body' }, props.children)]) },
  MetricGrid: function MetricGrid() { return h('div', {}, 'metrics') },
  KeyValueList: function KeyValueList() { return h('div', {}, 'kv') },
  EventLink: function EventLink(props: any) { return h('a', { href: '/app/events/' + props.eventId }, props.title) },
  Badge: function Badge(props: any) { return h('span', {}, props.children) },
  DataTable: function DataTable(props: any) { return h('table', {}, [h('thead', { key: 'head' }, h('tr', {}, props.headers.map(function (header: string, index: number) { return h('th', { key: header + String(index) }, header) }))), h('tbody', { key: 'body' }, (props.rows || []).map(function (row: any[], rowIndex: number) { return h('tr', { key: rowIndex }, row.map(function (cell: any, cellIndex: number) { return h('td', { key: String(rowIndex) + '-' + String(cellIndex) }, cell) })) }))]) },
 }
})

import MacroCalendarPage from '@/app/app/macro-calendar/page'

const events = [
 { id: 'event-cpi', family: 'CPI', title: 'Core CPI (MoM)', slug: 'core-cpi', country: 'United States', currency: 'USD', impact: 'High', category: 'Inflation', scheduledAt: '2026-04-01T12:30:00+00:00', status: 'Upcoming', previous: 0.4, forecast: 0.3, whyItMatters: 'Inflation reprices rates.', relatedAssets: ['SPX'], freshness: { label: 'Catalyst calendar', source: 'TradingEconomics', freshness: 'fresh', mode: 'live', note: 'Live row' } },
 { id: 'event-ecb', family: 'ECB', title: 'ECB Rate Decision', slug: 'ecb-rate', country: 'Eurozone', currency: 'EUR', impact: 'Medium', category: 'Central bank', scheduledAt: '2026-04-02T10:00:00+00:00', status: 'Upcoming', previous: 4.5, forecast: 4.5, whyItMatters: 'EUR rates.', relatedAssets: ['EURUSD'], freshness: { label: 'Catalyst calendar', source: 'Seeded macro calendar', freshness: 'degraded', mode: 'demo', note: 'Fallback row' } }]

const workstation = { watchlists: [{ id: 'watch-1', name: 'Desk', description: 'Desk', itemCount: 1, alertCount: 0, items: [{ id: 'itm-1', symbol: 'SPX', itemType: 'asset', note: '' }] }] }

describe('MacroCalendarPage', function () {
 it('renders the calendar table and event drill-down links', async function () {
  api.getEvents.mockResolvedValue(events)
  api.getWorkstation.mockResolvedValue(workstation)
  const view = await MacroCalendarPage({})
  render(view)
  expect(screen.getByText('Control deck')).toBeInTheDocument()
  expect(screen.getByText('Calendar tape')).toBeInTheDocument()
  expect(screen.getByTestId('page-shell')).toHaveAttribute('data-mode', 'mixed')
  expect(screen.getAllByRole('link', { name: 'Core CPI (MoM)' })[0]).toHaveAttribute('href', '/app/events/event-cpi')
 }, 15000)

 it('applies calendar filters to the tape', async function () {
  api.getEvents.mockResolvedValue(events)
  api.getWorkstation.mockResolvedValue(workstation)
  const view = await MacroCalendarPage({ searchParams: Promise.resolve({ impact: 'High', currency: 'USD' }) })
  render(view)
  const tape = screen.getByRole('heading', { name: 'Calendar tape' }).closest('section') as HTMLElement
  expect(within(tape).getByText('Core CPI (MoM)')).toBeInTheDocument()
  expect(within(tape).queryByText('ECB Rate Decision')).not.toBeInTheDocument()
 }, 15000)

 it('keeps dataset mode honest while showing filtered view mode', async function () {
  api.getEvents.mockResolvedValue(events)
  api.getWorkstation.mockResolvedValue(workstation)
  const view = await MacroCalendarPage({ searchParams: Promise.resolve({ impact: ['High'], currency: ['USD'] }) })
  render(view)
  expect(screen.getByTestId('page-shell')).toHaveAttribute('data-mode', 'mixed')
  const sourcePanel = screen.getByRole('heading', { name: 'Source / freshness' }).closest('section') as HTMLElement
  expect(within(sourcePanel).getByText('View mode (filtered)')).toBeInTheDocument()
  expect(within(sourcePanel).getByText('1 / 0 / 0')).toBeInTheDocument()
 }, 15000)
})


