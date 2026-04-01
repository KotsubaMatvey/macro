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

const API_URL = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL : "http://localhost:8000"

const getCookieHeader = cache(async function getCookieHeader() {
	const cookieStore = await cookies()
	return cookieStore.toString()
})

const apiFetch = cache(async function apiFetch(path: string, cookieHeader: string) {
	const response = await fetch(API_URL + path, { cache: 'no-store', headers: { cookie: cookieHeader } })
	if (!response.ok) {
		throw new Error('Request failed: ' + path + ' / ' + response.status)
	}
	return response.json()
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
