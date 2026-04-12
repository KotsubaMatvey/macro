import { cache } from "react"
import { cookies } from "next/headers"
import type {
 AdminSummary,
 Briefing,
 DashboardPayload,
 EventDetail,
 EventRelease,
 FeatureFlag,
 JobRun,
 NewsItem,
 SessionUser,
 WorkstationPayload,
} from "@macroaccess/types"

const API_URL = (process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL : "http://localhost:8000").trim().replace(/\/+$/, "")

const getCookieHeader = cache(async function getCookieHeader() {
	const cookieStore = await cookies()
	return cookieStore.toString()
})

const apiFetch = cache(async function apiFetch(path: string, cookieHeader: string) {
	try {
		const response = await fetch(API_URL + path, { cache: 'no-store', headers: { cookie: cookieHeader } })
		if (!response.ok) {
			console.error('Request failed', path, response.status)
			throw new Error('Request failed: ' + path + ' / ' + response.status)
		}
		try {
			return await response.json()
		} catch (error) {
			console.error('Response JSON parse failed', path, error)
			throw new Error('Invalid JSON response: ' + path)
		}
	} catch (error) {
		console.error('API fetch failed', path, error)
		throw error
	}
})

async function load(path: string) {
	return apiFetch(path, await getCookieHeader())
}

export const getSession = cache(async function getSession() {
	const payload = await load('/api/v1/auth/session')
	return payload as SessionUser
})

export const getWorkstation = cache(async function getWorkstation(refresh = false) {
	const payload = await load('/api/v1/workstation' + (refresh ? '?refresh=true' : ''))
	return payload as WorkstationPayload
})

export const getDashboard = cache(async function getDashboard(refresh = false) {
	const payload = await load('/api/v1/dashboard' + (refresh ? '?refresh=true' : ''))
	return payload as DashboardPayload
})

export const getEvents = cache(async function getEvents(search = "") {
	const payload = await load('/api/v1/events?search=' + encodeURIComponent(search))
	return payload as EventRelease[]
})

export const getEventDetail = cache(async function getEventDetail(id: string) {
	const payload = await load('/api/v1/events/' + id)
	return payload as EventDetail
})

export const getBriefings = cache(async function getBriefings() {
	const payload = await load('/api/v1/briefings')
	return payload as Briefing[]
})

export const getNews = cache(async function getNews() {
	const payload = await load('/api/v1/news')
	return payload as NewsItem[]
})

export const getAdminSummary = cache(async function getAdminSummary() {
	const payload = await load('/api/v1/admin/summary')
	return payload as AdminSummary
})

export const getAdminJobs = cache(async function getAdminJobs() {
	const payload = await load('/api/v1/admin/jobs')
	return payload as JobRun[]
})

export const getAdminFlags = cache(async function getAdminFlags() {
	const payload = await load('/api/v1/admin/feature-flags')
	return payload as FeatureFlag[]
})
 
export const getMarketBiasInsights = cache(async function getMarketBiasInsights() { 
 const payload = await load('/api/v1/market-bias/insights') 
 return payload as import('@macroaccess/types').MarketBiasInsights 
}) 
 
export const getReactions = cache(async function getReactions(family = '', asset = 'SPX', country = '', currency = '') { 
 const params = new URLSearchParams() 
 if (family) params.set('family', family) 
 if (asset) params.set('asset', asset) 
 if (country) params.set('country', country) 
 if (currency) params.set('currency', currency) 
 const payload = await load('/api/v1/reactions?' + params.toString()) 
 return payload as import('@macroaccess/types').ReactionsPayload 
}) 
 
export const getTrackRecord = cache(async function getTrackRecord() { 
 const payload = await load('/api/v1/track-record') 
 return payload as import('@macroaccess/types').TrackRecordPayload 
}) 
 
export const getReports = cache(async function getReports(limit = 12) { 
 const payload = await load('/api/v1/reports?limit=' + String(limit)) 
 return payload as import('@macroaccess/types').WeeklyReport[] 
})
