import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const getSession = vi.fn()
const getEventDetail = vi.fn()
vi.mock('@/lib/server/api', () => ({ getSession, getEventDetail }))

import EventDetailPage from '@/app/app/events/[eventId]/page'

describe('EventDetailPage', () => {
  it('renders dynamic event payload fields', async () => {
    getSession.mockResolvedValue({ id: 'user-demo', email: 'demo@northstarmacro.local', name: 'Demo', role: 'user', onboardingCompleted: true, emailVerified: true })
    getEventDetail.mockResolvedValue({ id: 'event-cpi-mar', title: 'US CPI March', family: 'US CPI', category: 'Inflation', country: 'United States', currency: 'USD', impact: 'High', status: 'Released', scheduledAt: '2026-04-10T12:30:00+00:00', previous: 3.1, forecast: 2.9, actual: 2.8, surprise: -3.4, whyItMatters: 'Inflation surprise reprices rates.', relatedAssets: ['SPX'], historicalReactions: [{ window: '5m', avgMovePct: 0.2, consistency: 0.7, narrative: 'Initial rates reaction' }], linkedBriefings: [], linkedNews: [] })
    const view = await EventDetailPage({ params: Promise.resolve({ eventId: 'event-cpi-mar' }) })
    render(view)
    expect(screen.getByText('US CPI March')).toBeInTheDocument()
    expect(screen.getByText('Event context')).toBeInTheDocument()
  })
})
