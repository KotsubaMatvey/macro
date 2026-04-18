'use client'

import { useMemo } from 'react'

import useSWR from 'swr'

import { FALLBACK_GEOBOARD_PAYLOAD } from '../data'
import type { GeoboardMode, GeoboardPayload } from '../types'

const FEED_TIMEOUT_MS = 15000

const fetcher = async function fetcher<T>(url: string): Promise<T | null> {
 const controller = new AbortController()
 const timer = window.setTimeout(function () { controller.abort() }, FEED_TIMEOUT_MS)
 try {
  const response = await fetch(url, { credentials: 'include', signal: controller.signal })
  if (!response.ok) {
   console.error('Geoboard request failed', url, response.status)
   return null
  }
  try {
   return await response.json() as T
  } catch (error) {
   console.error('Geoboard JSON parse failed', url, error)
   return null
  }
 } catch (error) {
  if (error instanceof DOMException && error.name === 'AbortError') {
   console.warn('Geoboard request timed out', url, FEED_TIMEOUT_MS)
   return null
  }
  console.error('Geoboard network request failed', url, error)
  return null
 } finally {
  window.clearTimeout(timer)
 }
}

function fallbackPayload(mode: GeoboardMode): GeoboardPayload {
 return {
  ...FALLBACK_GEOBOARD_PAYLOAD,
  modeState: {
   ...FALLBACK_GEOBOARD_PAYLOAD.modeState,
   activeMode: mode,
  },
 }
}

function normalizePayload(payload: GeoboardPayload, mode: GeoboardMode): GeoboardPayload {
 return {
  ...payload,
  modeState: {
   ...payload.modeState,
   activeMode: mode,
  },
 }
}

function normalizeRuntimePayload(value: unknown, mode: GeoboardMode): GeoboardPayload | null {
 if (!value || typeof value !== 'object') return null
 const payload = value as Partial<GeoboardPayload>
 if (!Array.isArray(payload.feed) || !Array.isArray(payload.sourceStatus)) return null
 const base = fallbackPayload(mode)
 const safePayload: GeoboardPayload = {
  ...base,
  ...payload,
  generatedAt: typeof payload.generatedAt === 'string' ? payload.generatedAt : base.generatedAt,
  modeState: {
   ...base.modeState,
   ...(payload.modeState ? payload.modeState : {}),
   activeMode: mode,
   availableModes: ['STANDARD', 'RISK', 'LIQUIDITY', 'CENT.BANKS'],
   fallback: Boolean(payload.modeState ? payload.modeState.fallback : base.modeState.fallback),
   sourceHonesty: payload.modeState && typeof payload.modeState.sourceHonesty === 'string' ? payload.modeState.sourceHonesty : base.modeState.sourceHonesty,
  },
  sourceStatus: payload.sourceStatus,
  geoEvents: Array.isArray(payload.geoEvents) ? payload.geoEvents : [],
  macroEvents: Array.isArray(payload.macroEvents) ? payload.macroEvents : [],
  centralBanks: Array.isArray(payload.centralBanks) ? payload.centralBanks : [],
  tradeRoutes: Array.isArray(payload.tradeRoutes) ? payload.tradeRoutes : [],
  regimeZones: Array.isArray(payload.regimeZones) ? payload.regimeZones : [],
  feed: payload.feed.filter(function (item) {
   return Boolean(item && item.id && item.sourceId && item.sourceLayer && item.ranking)
  }),
  summary: payload.summary && typeof payload.summary === 'object' ? payload.summary : base.summary,
 }
 return normalizePayload(safePayload, mode)
}

export function useGeoboardData(mode: GeoboardMode) {
 const { data, error, isLoading } = useSWR<GeoboardPayload | null>(
  '/api/geoboard/feed?mode=' + encodeURIComponent(mode),
  fetcher,
  {
   refreshInterval: 90000,
   keepPreviousData: true,
   revalidateOnFocus: false,
   dedupingInterval: 7000,
   errorRetryCount: 2,
  },
 )
 const normalized = useMemo(function () {
  if (!data) return null
  return normalizeRuntimePayload(data, mode)
 }, [data, mode])
 const payload = normalized ? normalized : fallbackPayload(mode)
 const fallback = Boolean(error || !normalized || payload.modeState.fallback)
 return {
  payload,
  loading: Boolean(isLoading && !normalized),
  fallback,
  errors: { feedError: error },
 }
}
