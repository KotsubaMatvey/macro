import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { GeoboardMap } from '@/components/geoboard/GeoboardMap'

const sourceMeta = {
 providerKey: 'test-provider',
 label: 'Test source',
 sourceType: 'discovery' as const,
 sourceTier: 'secondary' as const,
 mode: 'live' as const,
 freshness: 'fresh' as const,
 note: 'test',
 sourceUrl: null,
 fetchedAt: '2026-04-18T10:00:00+00:00',
 lastUpdated: '2026-04-18T10:00:00+00:00',
}

const ranking = {
 rankScore: 0.8,
 urgencyScore: 0.8,
 importanceScore: 0.8,
 confidenceScore: 0.8,
 marketRelevanceScore: 0.8,
 deskRelevanceScore: 0.8,
 recencyScore: 0.8,
 sourceQualityScore: 0.8,
 watchlistOverlapScore: 0.2,
 catalystProximityScore: 0.5,
 regionSignificanceScore: 0.7,
 regimeRelevanceScore: 0.6,
 componentScores: {},
 rationale: ['test'],
}

describe('GeoboardMap', function () {
 let fetchMock: ReturnType<typeof vi.fn>

 beforeEach(function () {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
 })

 afterEach(function () {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
 })

 it('filters malformed coordinates and renders only valid nodes', async function () {
  fetchMock.mockResolvedValue({
   ok: true,
   json: async function () { return { features: [] } },
  } as Response)
  render(
   <GeoboardMap
    mode='STANDARD'
    gdeltEvents={[
     {
      id: 'geo-good',
      title: 'valid row',
      source: 'test',
      lat: 10,
      lon: 20,
      tone: -1,
      date: '2026-04-18T10:00:00+00:00',
      url: 'https://example.com',
      affectedAssets: ['DXY'],
      mode: 'live',
      classification: 'Conflict',
      regionCode: 'GL',
      regionGroup: 'Global',
      countryCode: 'US',
      country: 'United States',
      locationPrecision: 'country',
      relatedNewsClusterIds: [],
      relatedNewsIds: [],
      whyItMatters: 'test',
      geoboardModes: ['STANDARD', 'RISK'],
      sourceMeta,
      ranking,
     },
     {
      id: 'geo-bad',
      title: 'bad row',
      source: 'test',
      lat: 999,
      lon: 20,
      tone: -1,
      date: '2026-04-18T10:00:00+00:00',
      url: 'https://example.com',
      affectedAssets: ['DXY'],
      mode: 'live',
      classification: 'Conflict',
      regionCode: 'GL',
      regionGroup: 'Global',
      countryCode: 'US',
      country: 'United States',
      locationPrecision: 'country',
      relatedNewsClusterIds: [],
      relatedNewsIds: [],
      whyItMatters: 'test',
      geoboardModes: ['STANDARD', 'RISK'],
      sourceMeta,
      ranking,
     } as any,
    ]}
    macroEvents={[]}
    centralBanks={[]}
    tradeRoutes={[]}
    zones={[]}
    pulseId={null}
    selectedSourceId={null}
    focusTarget={null}
    onHoverChange={vi.fn()}
   />,
  )
  await waitFor(function () {
   expect(screen.getByTestId('geo-node-geo-good')).toBeInTheDocument()
  })
  expect(screen.queryByTestId('geo-node-geo-bad')).toBeNull()
 })

 it('shows degraded basemap banner when geo json fails', async function () {
  fetchMock.mockRejectedValue(new Error('network failure'))
  render(
   <GeoboardMap
    mode='STANDARD'
    gdeltEvents={[]}
    macroEvents={[]}
    centralBanks={[]}
    tradeRoutes={[]}
    zones={[]}
    pulseId={null}
    selectedSourceId={null}
    focusTarget={null}
    onHoverChange={vi.fn()}
   />,
  )
  await waitFor(function () {
   expect(screen.getByText('BASEMAP // DEGRADED // CONTINUING WITH GRID + SIGNAL LAYERS')).toBeInTheDocument()
  })
 })

 it('emits source selection when clicking a rendered geo node', async function () {
  fetchMock.mockResolvedValue({
   ok: true,
   json: async function () { return { features: [] } },
  } as Response)
  const onSelectSourceId = vi.fn()
  render(
   <GeoboardMap
    mode='STANDARD'
    gdeltEvents={[
     {
      id: 'geo-1',
      title: 'clickable row',
      source: 'test',
      lat: 22,
      lon: 55,
      tone: -2,
      date: '2026-04-18T10:00:00+00:00',
      url: 'https://example.com',
      affectedAssets: ['OIL'],
      mode: 'live',
      classification: 'Shipping / Logistics',
      regionCode: 'MENA',
      regionGroup: 'Middle East',
      countryCode: 'IR',
      country: 'Iran',
      locationPrecision: 'region',
      relatedNewsClusterIds: [],
      relatedNewsIds: [],
      whyItMatters: 'test',
      geoboardModes: ['STANDARD', 'RISK'],
      sourceMeta,
      ranking,
     },
    ]}
    macroEvents={[]}
    centralBanks={[]}
    tradeRoutes={[]}
    zones={[]}
    pulseId={null}
    selectedSourceId={null}
    focusTarget={null}
    onHoverChange={vi.fn()}
    onSelectSourceId={onSelectSourceId}
   />,
  )
  const node = await screen.findByTestId('geo-node-geo-1')
  fireEvent.click(node)
  expect(onSelectSourceId).toHaveBeenCalledWith('geo-1')
 })
})
