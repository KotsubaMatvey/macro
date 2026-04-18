import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_URL = (process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL : 'http://localhost:8000').trim().replace(/\/+$/, '')
const DEFAULT_DASHBOARD_TIMEOUT_MS = 15000

function dashboardTimeoutMs() {
 const parsed = Number.parseInt(process.env.API_PROXY_TIMEOUT_MS ? process.env.API_PROXY_TIMEOUT_MS : String(DEFAULT_DASHBOARD_TIMEOUT_MS), 10)
 if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_DASHBOARD_TIMEOUT_MS
 return parsed
}

async function proxy(path: string) {
 const cookieHeader = (await cookies()).toString()
 const controller = new AbortController()
 const timeoutMs = dashboardTimeoutMs()
 const timeout = setTimeout(function () { controller.abort() }, timeoutMs)
 try {
  const response = await fetch(API_URL + path, { cache: 'no-store', headers: { cookie: cookieHeader }, signal: controller.signal })
  const body = await response.text().catch(function (error) { console.error('Dashboard proxy body read failed', path, error); return '' })
  return new NextResponse(body, { status: response.status, headers: { 'content-type': response.headers.get('content-type') ? response.headers.get('content-type') as string : 'application/json', 'cache-control': 'no-store' } })
 } catch (error) {
  if (error instanceof Error && error.name === 'AbortError') {
   console.error('Dashboard proxy timed out', path, timeoutMs)
   return NextResponse.json({ detail: 'Dashboard upstream timeout' }, { status: 504 })
  }
  console.error('Dashboard proxy request failed', path, error)
  return NextResponse.json({ detail: 'Dashboard upstream unavailable' }, { status: 502 })
 } finally {
  clearTimeout(timeout)
 }
}

export async function GET() {
 return proxy('/api/v1/dashboard')
}
