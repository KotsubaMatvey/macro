import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_URL = (process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL : 'http://localhost:8000').trim().replace(/\/+$/, '')

export async function GET(request: Request) {
 const cookieHeader = (await cookies()).toString()
 const { searchParams } = new URL(request.url)
 const mode = searchParams.get('mode')
 const suffix = mode ? '?mode=' + encodeURIComponent(mode) : ''
 try {
  const response = await fetch(API_URL + '/api/geoboard/feed' + suffix, { cache: 'no-store', headers: { cookie: cookieHeader } })
  const body = await response.text().catch(function (error) { console.error('Geoboard feed proxy body read failed', error); return '' })
  return new NextResponse(body, { status: response.status, headers: { 'content-type': response.headers.get('content-type') ? response.headers.get('content-type') as string : 'application/json' } })
 } catch (error) {
  console.error('Geoboard feed proxy request failed', error)
  return NextResponse.json({ detail: 'Geoboard feed upstream unavailable' }, { status: 502 })
 }
}
