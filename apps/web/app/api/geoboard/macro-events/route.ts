import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_URL = (process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL : 'http://localhost:8000').trim().replace(/\/+$/, '')
const DEFAULT_TIMEOUT_MS = 15000

function timeoutMs() {
 const parsed = Number.parseInt(process.env.GEOBOARD_FEED_TIMEOUT_MS ? process.env.GEOBOARD_FEED_TIMEOUT_MS : String(DEFAULT_TIMEOUT_MS), 10)
 if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TIMEOUT_MS
 return parsed
}

export async function GET() {
 const cookieHeader = (await cookies()).toString()
 const timeoutValue = timeoutMs()
 const controller = new AbortController()
 const timeout = setTimeout(function () { controller.abort() }, timeoutValue)
 try {
  const response = await fetch(API_URL + '/api/geoboard/macro-events', { cache: 'no-store', headers: { cookie: cookieHeader }, signal: controller.signal })
  const body = await response.text().catch(function (error) { console.error('Macro proxy body read failed', error); return '' })
  return new NextResponse(body, { status: response.status, headers: { 'content-type': response.headers.get('content-type') ? response.headers.get('content-type') as string : 'application/json' } })
 } catch (error) {
  if (error instanceof Error && error.name === 'AbortError') {
   console.error('Macro proxy timed out', timeoutValue)
   return NextResponse.json({ detail: 'Macro events upstream timeout' }, { status: 504 })
  }
  console.error('Macro proxy request failed', error)
  return NextResponse.json({ detail: 'Macro events upstream unavailable' }, { status: 502 })
 } finally {
  clearTimeout(timeout)
 }
}
