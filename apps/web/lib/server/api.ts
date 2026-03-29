import { cookies } from 'next/headers'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function apiFetch(path: string) {
  const cookieStore = await cookies()
  const response = await fetch(API_URL + path, { cache: 'no-store', headers: { cookie: cookieStore.toString() } })
  if (!response.ok) throw new Error('Request failed: ' + path)
  return response.json()
}

export async function getSession() { return apiFetch('/api/v1/auth/session') }
export async function getWorkstation() { return apiFetch('/api/v1/workstation') }
export async function getEvents(search = '') { return apiFetch('/api/v1/events?search=' + encodeURIComponent(search)) }
export async function getEventDetail(id: string) { return apiFetch('/api/v1/events/' + id) }
export async function getBriefings() { return apiFetch('/api/v1/briefings') }
export async function getNews() { return apiFetch('/api/v1/news') }
