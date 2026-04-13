import { createElement as h } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(function () { return { getTrackRecord: vi.fn() } })
vi.mock('@/lib/server/api', function () { return { getTrackRecord: api.getTrackRecord } })
vi.mock('@/components/app/chrome', function () {
 return {
  PageShell: function PageShell(props: any) { return h('div', { 'data-testid': 'page-shell', 'data-mode': props.mode }, [h('h1', { key: 'title' }, props.title), h('div', { key: 'body' }, props.children)]) },
  Panel: function Panel(props: any) { return h('section', {}, [h('h2', { key: 'title' }, props.title), h('div', { key: 'body' }, props.children)]) },
  MetricGrid: function MetricGrid(props: any) { return h('div', {}, props.items.map(function (item: any) { return h('div', { key: item.label }, item.label + ' ' + item.value) })) },
  Badge: function Badge(props: any) { return h('span', {}, props.children) },
  DataTable: function DataTable(props: any) { return h('table', {}, [h('thead', { key: 'head' }, h('tr', {}, props.headers.map(function (header: string, index: number) { return h('th', { key: header + String(index) }, header) }))), h('tbody', { key: 'body' }, (props.rows || []).map(function (row: any[], rowIndex: number) { return h('tr', { key: rowIndex }, row.map(function (cell: any, cellIndex: number) { return h('td', { key: String(rowIndex) + '-' + String(cellIndex) }, cell) })) }))]) },
 }
})
import TrackRecordPage from '@/app/app/track-record/page'

const payload = { mode: 'replay', label: 'Replay only', sampleSize: 12, hitRate: 0.58, magnitudeErrorPct: 0.64, bySignalType: [{ signalType: 'trend-regime replay', sampleSize: 12, hitRate: 0.58 }], byAsset: [{ asset: 'SPX', sampleSize: 6, hitRate: 0.67, magnitudeErrorPct: 0.55 }], byEventFamily: [{ family: 'CPI', sampleSize: 4, hitRate: 0.5 }], byRegime: [{ regime: 'Supportive', sampleSize: 8, hitRate: 0.63 }], recentRecords: [{ symbol: 'SPX', asOf: '2026-04-24', stance: 'Bullish', expectedMove5dPct: 1.2, realizedMove5dPct: 0.9, outcome: 'Hit', signalType: 'trend-regime replay', family: 'CPI', href: '/app/events/event-cpi-mar', regime: 'Supportive' }], note: 'Track record is replayed over completed windows and is not audited live discretionary PnL.', freshness: { label: 'Track record', source: 'Composite replay', freshness: 'fresh', mode: 'fallback', note: 'Replay statistics' } }

describe('TrackRecordPage', function () {
 it('renders replay-only framing and core tables', async function () {
  api.getTrackRecord.mockResolvedValue(payload)
  const view = await TrackRecordPage()
  render(view)
  expect(screen.getByText('Track Record')).toBeInTheDocument()
  expect(screen.getByText('Mode Replay only')).toBeInTheDocument()
  expect(screen.getByText('By asset')).toBeInTheDocument()
  expect(screen.getByText('By signal type')).toBeInTheDocument()
  expect(screen.getByText('Recent records')).toBeInTheDocument()
  expect(screen.getByTestId('page-shell')).toHaveAttribute('data-mode', 'fallback')
 })
})
