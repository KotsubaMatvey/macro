'use client'

import useSWR from 'swr'

import { FALLBACK_GEOBOARD_PAYLOAD } from '../data'
import type { GeoboardMode, GeoboardPayload } from '../types'

const fetcher = async function fetcher<T>(url: string): Promise<T | null> {
 try {
  const response = await fetch(url, { credentials: 'include' })
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
  console.error('Geoboard network request failed', url, error)
  return null
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

export function useGeoboardData(mode: GeoboardMode) {
 const { data, error, isLoading } = useSWR<GeoboardPayload | null>('/api/geoboard/feed?mode=' + encodeURIComponent(mode), fetcher, { refreshInterval: 90000 })
 const payload = data ? data : fallbackPayload(mode)
 const fallback = Boolean(error || !data || payload.modeState.fallback)
 return {
  payload,
  loading: isLoading,
  fallback,
  errors: { feedError: error },
 }
}
