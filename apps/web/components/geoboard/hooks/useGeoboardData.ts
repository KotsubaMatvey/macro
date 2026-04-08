'use client'

import useSWR from 'swr'
import type { DashboardPayload } from '@macroaccess/types'

import { deriveRegimeZones, FALLBACK_GEO_EVENTS, FALLBACK_MACRO_EVENTS } from '../data'
import type { GeoEvent, MacroEvent } from '../types'

const fetcher = async function fetcher<T>(url: string): Promise<T> {
 const response = await fetch(url, { credentials: 'include' })
 if (!response.ok) throw new Error('Request failed: ' + url)
 return response.json() as Promise<T>
}

export function useGeoboardData() {
 const { data: gdeltEvents, error: gdeltError, isLoading: gdeltLoading } = useSWR<GeoEvent[]>('/api/geoboard/gdelt-events', fetcher, { refreshInterval: 300000 })
 const { data: macroEvents, error: macroError, isLoading: macroLoading } = useSWR<MacroEvent[]>('/api/geoboard/macro-events', fetcher, { refreshInterval: 60000 })
 const { data: dashboard, error: dashboardError, isLoading: dashboardLoading } = useSWR<DashboardPayload>('/api/dashboard', fetcher, { refreshInterval: 120000 })

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
