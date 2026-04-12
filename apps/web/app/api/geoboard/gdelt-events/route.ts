import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_URL = (process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL : 'http://localhost:8000').trim().replace(/\/+$/, '')

export async function GET() {
 const cookieHeader = (await cookies()).toString()
 try {
  const response = await fetch(API_URL + '/api/geoboard/gdelt-events', { cache: 'no-store', headers: { cookie: cookieHeader } })
  const body = await response.text().catch(function (error) { console.error('GDELT proxy body read failed', error); return '' })
  return new NextResponse(body, { status: response.status, headers: { 'content-type': response.headers.get('content-type') ? response.headers.get('content-type') as string : 'application/json' } })
 } catch (error) {
  console.error('GDELT proxy request failed', error)
  return NextResponse.json({ detail: 'GDELT upstream unavailable' }, { status: 502 })
 }
}
