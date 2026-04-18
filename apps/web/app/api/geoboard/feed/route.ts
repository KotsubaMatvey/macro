import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_URL = (process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL : 'http://localhost:8000').trim().replace(/\/+$/, '')
const DEFAULT_FEED_TIMEOUT_MS = 15000

function feedTimeoutMs() {
 const parsed = Number.parseInt(process.env.GEOBOARD_FEED_TIMEOUT_MS ? process.env.GEOBOARD_FEED_TIMEOUT_MS : String(DEFAULT_FEED_TIMEOUT_MS), 10)
 if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_FEED_TIMEOUT_MS
 return parsed
}

export async function GET(request: Request) {
 const cookieHeader = (await cookies()).toString()
 const { searchParams } = new URL(request.url)
 const mode = searchParams.get('mode')
 const suffix = mode ? '?mode=' + encodeURIComponent(mode) : ''
 const timeoutMs = feedTimeoutMs()
 const controller = new AbortController()
 const timeout = setTimeout(function () { controller.abort() }, timeoutMs)
 try {
  const response = await fetch(API_URL + '/api/geoboard/feed' + suffix, { cache: 'no-store', headers: { cookie: cookieHeader }, signal: controller.signal })
  const body = await response.text().catch(function (error) { console.error('Geoboard feed proxy body read failed', error); return '' })
  return new NextResponse(body, { status: response.status, headers: { 'content-type': response.headers.get('content-type') ? response.headers.get('content-type') as string : 'application/json' } })
 } catch (error) {
  if (error instanceof Error && error.name === 'AbortError') {
   console.error('Geoboard feed proxy timed out', timeoutMs)
   return NextResponse.json({ detail: 'Geoboard feed upstream timeout' }, { status: 504 })
  }
  console.error('Geoboard feed proxy request failed', error)
  return NextResponse.json({ detail: 'Geoboard feed upstream unavailable' }, { status: 502 })
 } finally {
  clearTimeout(timeout)
 }
}
