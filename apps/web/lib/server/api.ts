import { cache } from "react"
import { cookies } from "next/headers"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

const getCookieHeader = cache(async function getCookieHeader() {
 const cookieStore = await cookies()
 return cookieStore.toString()
})

const apiFetch = cache(async function apiFetch(path: string, cookieHeader: string) {
 const response = await fetch(API_URL + path, { cache: "no-store", headers: { cookie: cookieHeader } })
 if (!response.ok) {
 throw new Error("Request failed: " + path + " / " + response.status)
 }
 return response.json()
})

async function load(path: string) {
 return apiFetch(path, await getCookieHeader())
}

export const getSession = cache(async function getSession() {
 return load("/api/v1/auth/session")
})

export const getWorkstation = cache(async function getWorkstation(refresh = false) {
 return load("/api/v1/workstation" + (refresh ? "?refresh=true" : ""))
})

export const getEvents = cache(async function getEvents(search = "") {
 return load("/api/v1/events?search=" + encodeURIComponent(search))
})

export const getEventDetail = cache(async function getEventDetail(id: string) {
 return load("/api/v1/events/" + id)
})

export const getBriefings = cache(async function getBriefings() {
 return load("/api/v1/briefings")
})

export const getNews = cache(async function getNews() {
 return load("/api/v1/news")
})

export const getAdminSummary = cache(async function getAdminSummary() {
 return load("/api/v1/admin/summary")
})

export const getAdminJobs = cache(async function getAdminJobs() {
 return load("/api/v1/admin/jobs")
})

export const getAdminFlags = cache(async function getAdminFlags() {
 return load("/api/v1/admin/feature-flags")
})
