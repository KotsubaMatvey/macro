'use client'

import useSWR from 'swr'
import type { DashboardPayload } from '@macroaccess/types'

import { deriveRegimeZones, FALLBACK_GEO_EVENTS, FALLBACK_MACRO_EVENTS } from '../data'
import type { GeoEvent, MacroEvent } from '../types'

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

export function useGeoboardData() {
 const { data: gdeltEvents, error: gdeltError, isLoading: gdeltLoading } = useSWR<GeoEvent[] | null>('/api/geoboard/gdelt-events', fetcher, { refreshInterval: 300000 })
 const { data: macroEvents, error: macroError, isLoading: macroLoading } = useSWR<MacroEvent[] | null>('/api/geoboard/macro-events', fetcher, { refreshInterval: 60000 })
 const { data: dashboard, error: dashboardError, isLoading: dashboardLoading } = useSWR<DashboardPayload | null>('/api/dashboard', fetcher, { refreshInterval: 120000 })

 return {
 gdeltEvents: gdeltEvents ? gdeltEvents : FALLBACK_GEO_EVENTS,
 macroEvents: macroEvents ? macroEvents : FALLBACK_MACRO_EVENTS,
 dashboard: dashboard ? dashboard : null,
 regimeZones: deriveRegimeZones(dashboard ? dashboard : null),
 loading: gdeltLoading || macroLoading || dashboardLoading,
 fallback: Boolean(gdeltError || macroError || dashboardError || !dashboard),
 errors: { gdeltError, macroError, dashboardError },
 }
}
