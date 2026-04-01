import { createElement as h } from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const api = vi.hoisted(function () {
	return { getDashboard: vi.fn() }
})

vi.mock("@/lib/server/api", function () {
	return { getDashboard: api.getDashboard }
})

vi.mock("@/components/app/chrome", function () {
	return {
		PageShell: function PageShell(props: any) { return h('div', {}, [h('h1', { key: 'title' }, props.title), h('div', { key: 'body' }, props.children)]) },
		Panel: function Panel(props: any) { return h('section', {}, [h('h2', { key: 'title' }, props.title), h('div', { key: 'body' }, props.children)]) },
		MetricGrid: function MetricGrid() { return h('div', {}, 'metrics') },
		DataTable: function DataTable() { return h('div', {}, 'table') },
		Badge: function Badge(props: any) { return h('span', {}, props.children) },
	}
})

import DashboardPage from "@/app/app/dashboard/page"

describe("DashboardPage", function () {
	it('renders the real-data dashboard surfaces', async function () {
		api.getDashboard.mockResolvedValue({
			generatedAt: '2026-04-01T08:00:00+00:00',
			session: { id: 'user-demo', email: 'demo@macroaccess.local', name: 'Demo', role: 'user', onboardingCompleted: true, emailVerified: true },
			hero: { defaultSymbol: 'BTC', sourceNote: 'Source note', modelNote: 'Model note', assets: [{ symbol: 'BTC', title: 'Bitcoin / USD', subtitle: 'Source-derived price and model-derived edge estimate', sourceSymbol: 'CBBTCUSD', price: '', change1dPct: 1.2, change30dPct: 8.4, expectedMove5dPct: 6.1, stance: 'Bullish', skew: 'Positive', confidence: 0.72, sampleCount: 42, regimeContext: 'Risk supportive / liquidity supportive', sourceFacts: ['1d move +1.20%'], modelFacts: ['Expected 5d move 6.10%'], scenarioBuckets: [{ label: 'Downside', probability: 0.22, description: 'Lower tail' }, { label: 'Base', probability: 0.51, description: 'Expected range' }, { label: 'Upside', probability: 0.27, description: 'Upper tail' }], sparkline: [{ label: '1', value: 1 }, { label: '2', value: 2 }], freshness: { label: 'Price tape', source: 'FRED', freshness: 'fresh', mode: 'live', note: 'Official public series' } }] },
			keyCatalyst: { title: 'US CPI', status: 'Upcoming', scheduledAt: '2026-04-01T12:30:00+00:00', countdownLabel: '4h 30m', impact: 'High', country: 'United States', currency: 'USD', relatedAssets: ['BTC'], threshold: 'Beat if actual exceeds 2.9', sensitivity: 'Inflation reprices rates.', whyItMatters: 'Inflation reprices rates.', context: ['Risk regime supports the current tape'], href: '/app/events/event-cpi-mar', freshness: { label: 'Catalyst calendar', source: 'Internal calendar', freshness: 'aging', mode: 'demo', note: 'Live calendar provider missing' } },
			riskRegime: { label: 'Risk-on', score: 24.1, delta: 3.2, trend: 'Improving', interpretation: 'Risk appetite is supportive.', drivers: ['SPX and BTC momentum anchor the risk side'], history: [{ label: '1', value: 10 }, { label: '2', value: 20 }], freshness: { label: 'Risk regime', source: 'FRED composite', freshness: 'fresh', mode: 'live', note: 'Real market regime' } },
			liquidityRegime: { label: 'Supportive', score: 18.4, delta: 2.1, trend: 'Improving', interpretation: 'Liquidity remains supportive.', drivers: ['WALCL and NFCI frame the backdrop'], history: [{ label: '1', value: 8 }, { label: '2', value: 18 }], freshness: { label: 'Liquidity regime', source: 'FRED composite', freshness: 'fresh', mode: 'live', note: 'Real liquidity regime' } },
			marketConsensus: { label: 'Risk is being rewarded', score: 8.2, trend30d: 'Improving', confidence: 0.68, sampleSize: 1, note: 'Consensus is aggregated from live assets.', href: '/app/market-bias', assets: [{ symbol: 'BTC', direction: 'Bullish', score: 58.2, confidence: 0.72, change30dPct: 8.4, note: 'Risk supportive' }], freshness: { label: 'Consensus', source: 'FRED composite', freshness: 'fresh', mode: 'live', note: 'Derived from live market series' } },
			trackRecord: { status: 'Retrospective replay', evaluationMode: 'retrospective-model-replay', sampleSize: 6, hitRate: 0.67, magnitudeErrorPct: 2.4, note: 'Replay only.', records: [{ symbol: 'BTC', asOf: '2026-03-24T00:00:00+00:00', stance: 'Bullish', expectedMove5dPct: 5.5, realizedMove5dPct: 6.0, outcome: 'Hit', linkedEventTitle: 'US CPI', linkedEventHref: '/app/events/event-cpi-mar' }], freshness: { label: 'Track record', source: 'FRED composite', freshness: 'fresh', mode: 'live', note: 'Backtest' } },
			linkedIntelligence: { briefings: [{ title: 'Morning Briefing', subtitle: 'Desk note', href: '/app/briefings', mode: 'demo' }], news: [{ title: 'Fed headline', subtitle: 'Official release', href: 'https://example.com', mode: 'live' }], watchlists: [{ title: 'Rates Desk', subtitle: '2 instruments', href: '/app/watchlists', mode: 'live' }], alerts: [{ title: 'BTC alert', subtitle: 'Triggered / In-app', href: '/app/alerts', mode: 'live' }], catalysts: [{ title: 'US CPI', subtitle: 'High / Upcoming', href: '/app/events/event-cpi-mar', mode: 'demo' }] },
			utility: { activeSession: 'London / New York', refreshedAt: '2026-04-01T08:00:00+00:00', sessions: [{ code: 'LDN', label: 'London', active: true }], providers: [{ name: 'FRED market tape', status: 'live', detail: 'Official public series connected', mode: 'live' }] },
		})
		const view = await DashboardPage()
		render(view)
		expect(screen.getByText('Dashboard')).toBeInTheDocument()
		expect(screen.getByText('Today edge')).toBeInTheDocument()
		expect(screen.getByText('Key catalyst')).toBeInTheDocument()
		expect(screen.getByText('AI / model track record')).toBeInTheDocument()
	})
})
