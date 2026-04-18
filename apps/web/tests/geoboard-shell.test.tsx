import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { GeoboardShell } from '@/components/geoboard/GeoboardShell'

const hooks = vi.hoisted(function () {
 return { useGeoboardData: vi.fn() }
})

vi.mock('@/components/geoboard/hooks/useGeoboardData', function () {
 return { useGeoboardData: hooks.useGeoboardData }
})

vi.mock('@/components/geoboard/GeoboardMap', function () {
 return {
  GeoboardMap: function GeoboardMap(props: any) {
   return <div data-testid='geoboard-map' data-pulse={props.pulseId ? props.pulseId : ''} data-mode={props.mode}></div>
  },
 }
})

vi.mock('@/components/geoboard/GeoboardPopup', function () {
 return { GeoboardPopup: function GeoboardPopup() { return <div data-testid='geoboard-popup' /> } }
})

function payload(mode: 'STANDARD' | 'RISK' | 'LIQUIDITY' | 'CENT.BANKS', fallback = false) {
 const sourceMeta = { providerKey: 'gdelt', label: 'GDELT discovery stream', sourceType: fallback ? 'fallback' : 'discovery', sourceTier: 'secondary', mode: fallback ? 'fallback' : 'live', freshness: fallback ? 'degraded' : 'fresh', note: 'Discovery stream', sourceUrl: 'https://example.com', fetchedAt: '2026-04-12T08:00:00+00:00', lastUpdated: '2026-04-12T08:00:00+00:00' }
 const ranking = { rankScore: 0.81, urgencyScore: 0.78, importanceScore: 0.84, confidenceScore: 0.62, recencyScore: 0.74, sourceQualityScore: 0.58, watchlistOverlapScore: 0.33, catalystProximityScore: 0.55, regionSignificanceScore: 0.8, regimeRelevanceScore: 0.6, rationale: ['test'] }
 const feedItem = {
  id: 'feed-geo-1',
  feedType: 'GEO_RISK',
  title: 'Hormuz insurer risk repricing',
  subtitle: 'Shipping / Logistics / Middle East',
  time: '2026-04-12T08:00:00+00:00',
  impactLine: 'OIL / DXY / XAU',
  whyItMatters: 'Chokepoint risk can reprice energy and havens.',
  lat: 26.6,
  lon: 56.9,
  sourceId: 'geo-1',
  sourceLayer: 'geo',
  regionCode: 'MENA',
  regionGroup: 'Middle East',
  linkedEventId: 'event-cpi-mar',
  linkedEventSlug: 'us-cpi-mar',
  relatedNewsClusterIds: ['cluster-a'],
  relatedNewsIds: ['news-a'],
  linkedAssetSymbols: ['OIL', 'DXY', 'XAU'],
  tags: ['Shipping'],
  geoboardModes: ['STANDARD', 'RISK'],
  links: { event: '/app/events/event-cpi-mar', calendar: '/app/macro-calendar', reactions: '/app/live-reactions', bias: '/app/market-bias', reports: '/app/reports', news: '/app/news?focus=news-a', watchlists: '/app/watchlists', alerts: '/app/alerts', source: 'https://example.com' },
  sourceMeta,
  ranking,
 }
 return {
  generatedAt: '2026-04-12T08:00:00+00:00',
  modeState: { activeMode: mode, availableModes: ['STANDARD', 'RISK', 'LIQUIDITY', 'CENT.BANKS'], fallback, sourceHonesty: 'Discovery rows are ranked signals, static overlays remain curated, and derived zones are dashboard-projected context.' },
  sourceStatus: [
   { layer: 'geo', state: fallback ? 'fallback' : 'live', sourceType: fallback ? 'fallback' : 'discovery', mode: fallback ? 'fallback' : 'live', detail: 'Geo stream state' },
   { layer: 'macro', state: 'derived', sourceType: 'derived', mode: 'derived', detail: 'Macro map' },
   { layer: 'cb', state: 'static', sourceType: 'static', mode: 'static', detail: 'Central bank nodes' },
   { layer: 'trade', state: 'static', sourceType: 'static', mode: 'static', detail: 'Trade routes' },
   { layer: 'regime', state: 'derived', sourceType: 'derived', mode: 'derived', detail: 'Regime zones' },
   { layer: 'feed', state: fallback ? 'fallback' : 'live', sourceType: 'derived', mode: 'derived', detail: 'Feed' },
  ],
  geoEvents: [
   {
    id: 'geo-1',
    title: 'Hormuz insurer risk repricing',
    source: 'GDELT',
    lat: 26.6,
    lon: 56.9,
    tone: -6.8,
    date: '2026-04-12T08:00:00+00:00',
    url: 'https://example.com',
    affectedAssets: ['OIL', 'DXY', 'XAU'],
    mode: fallback ? 'fallback' : 'live',
    classification: 'Shipping / Logistics',
    regionCode: 'MENA',
    regionGroup: 'Middle East',
    countryCode: 'IR',
    country: 'Iran',
    locationPrecision: 'region',
    linkedEventId: 'event-cpi-mar',
    linkedEventSlug: 'us-cpi-mar',
    relatedNewsClusterIds: ['cluster-a'],
    relatedNewsIds: ['news-a'],
    whyItMatters: 'test',
    geoboardModes: ['STANDARD', 'RISK'],
    sourceMeta,
    ranking,
   },
  ],
  macroEvents: [],
  centralBanks: [
   {
    id: 'fed',
    name: 'FED',
    lat: 38.9,
    lon: -77,
    rate: '5.25%',
    nextMeeting: '2026-05-06',
    bias: 'DATA DEPENDENT',
    signal: 'USD LIQUIDITY TIGHT',
    liquidityWeight: 100,
    country: 'United States',
    countryCode: 'US',
    regionCode: 'NA',
    regionGroup: 'North America',
    linkedEventId: null,
    linkedEventSlug: null,
    linkedEventPath: '/app/macro-calendar',
    linkedNewsPath: '/app/news',
    linkedReactionPath: '/app/live-reactions',
    linkedBiasPath: '/app/market-bias',
    relatedAssets: ['DXY'],
    relatedNewsClusterIds: [],
    whyItMatters: 'test',
    geoboardModes: ['STANDARD', 'LIQUIDITY', 'CENT.BANKS'],
    sourceMeta: { ...sourceMeta, sourceType: 'static', mode: 'static' },
    ranking,
   },
  ],
  tradeRoutes: [],
  regimeZones: [
   {
    id: 'USA',
    label: 'USA',
    flag: 'US',
    regime: 'NEUTRAL',
    confidence: 62,
    center: [-98, 38],
    zoom: 2.7,
    sourceMeta: { ...sourceMeta, sourceType: 'derived', mode: 'derived' },
    relatedAssets: ['SPX'],
    whyItMatters: 'test',
    geoboardModes: ['STANDARD', 'LIQUIDITY'],
   },
  ],
  feed: [feedItem],
  summary: { totalFeedItems: 1, geoSignals: 1, macroCatalysts: 0, centralBanks: 1, tradeRoutes: 0, regimeZones: 1, watchlistSymbols: 1, activeAlerts: 1, fallbackLayers: fallback ? 2 : 0 },
 }
}

describe('GeoboardShell', function () {
 it('renders ranked feed and source honesty rail', function () {
  hooks.useGeoboardData.mockReturnValue({ payload: payload('STANDARD', false), loading: false, fallback: false, errors: { feedError: null } })
  render(<GeoboardShell />)
  expect(screen.getByText('GLOBAL MACRO AOR // STANDARD')).toBeInTheDocument()
  expect(screen.getByText('Hormuz insurer risk repricing')).toBeInTheDocument()
  expect(screen.getByText('Source Integrity')).toBeInTheDocument()
  expect(screen.getByText(/Discovery rows are ranked signals/)).toBeInTheDocument()
  expect(screen.getByText('GEO // LIVE')).toBeInTheDocument()
 })

 it('switches modes and updates data hook mode argument', function () {
  hooks.useGeoboardData.mockImplementation(function (mode: any) { return { payload: payload(mode, false), loading: false, fallback: false, errors: { feedError: null } } })
  render(<GeoboardShell />)
  fireEvent.click(screen.getByRole('button', { name: 'RISK' }))
  expect(screen.getByText('GLOBAL MACRO AOR // RISK')).toBeInTheDocument()
  expect(hooks.useGeoboardData).toHaveBeenCalledWith('RISK')
 })

 it('shows degraded badge and pulses selected feed source id on map', function () {
  hooks.useGeoboardData.mockReturnValue({ payload: payload('STANDARD', true), loading: false, fallback: true, errors: { feedError: new Error('fallback') } })
  render(<GeoboardShell />)
  expect(screen.getAllByText('DEGRADED').length).toBeGreaterThan(0)
  fireEvent.click(screen.getByText('Hormuz insurer risk repricing'))
  expect(screen.getByTestId('geoboard-map')).toHaveAttribute('data-pulse', 'geo-1')
 })

 it('renders explicit empty-feed message when active mode has no rows', function () {
  const empty = payload('CENT.BANKS', false)
  empty.feed = []
  hooks.useGeoboardData.mockReturnValue({ payload: empty, loading: false, fallback: false, errors: { feedError: null } })
  render(<GeoboardShell />)
  expect(screen.getByText('No ranked rows for this mode. Switch mode or review source status.')).toBeInTheDocument()
 })
})

