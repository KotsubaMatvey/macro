import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({ getEventDetail: vi.fn(), getEvents: vi.fn(), getWorkstation: vi.fn() }))
vi.mock('@/lib/server/api', () => ({ getEventDetail: api.getEventDetail, getEvents: api.getEvents, getWorkstation: api.getWorkstation }))
vi.mock('@/components/app/chrome', () => ({
  PageShell: function PageShell(props: any) { return <div><h1>{props.title}</h1><div>{props.children}</div></div> },
  Panel: function Panel(props: any) { return <section><h2>{props.title}</h2><div>{props.children}</div></section> },
  DataTable: function DataTable() { return <div>table</div> },
  KeyValueList: function KeyValueList() { return <div>meta</div> },
  EventLink: function EventLink(props: any) { return <a>{props.title}</a> },
}))

import EventDetailPage from '@/app/app/events/[eventId]/page'

describe('EventDetailPage', () => {
  it('renders dynamic event payload fields', async () => {
    api.getEventDetail.mockResolvedValue({ id: 'event-cpi-mar', title: 'US CPI March', family: 'US CPI', category: 'Inflation', country: 'United States', currency: 'USD', impact: 'High', status: 'Released', scheduledAt: '2026-04-10T12:30:00+00:00', previous: 3.1, forecast: 2.9, actual: 2.8, surprise: -3.4, whyItMatters: 'Inflation surprise reprices rates.', relatedAssets: ['SPX'], historicalReactions: [{ window: '5m', avgMovePct: 0.2, consistency: 0.7, narrative: 'Initial rates reaction' }], linkedBriefings: [], linkedNews: [] })
    api.getEvents.mockResolvedValue([{ id: 'event-cpi-feb', slug: 'us-cpi-feb', title: 'US CPI February', family: 'US CPI', country: 'United States', currency: 'USD', impact: 'High', category: 'Inflation', status: 'Released', scheduledAt: '2026-03-10T12:30:00+00:00', relatedAssets: ['SPX'] }])
    api.getWorkstation.mockResolvedValue({ regime: { interpretation: 'Risk backdrop remains contained.' }, biases: [{ symbol: 'SPX', direction: 'Bullish', score: 62, confidence: 0.71, rationale: ['Rates easing'] }] })
    const view = await EventDetailPage({ params: Promise.resolve({ eventId: 'event-cpi-mar' }) })
    render(view)
    expect(screen.getByText('US CPI March')).toBeInTheDocument()
    expect(screen.getByText('Archive selector')).toBeInTheDocument()
    expect(screen.getByText('Bias context')).toBeInTheDocument()
  })
})
