import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const API_URL = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL : 'http://localhost:8000'

async function proxy(path: string) {
 const cookieHeader = (await cookies()).toString()
 const response = await fetch(API_URL + path, { cache: 'no-store', headers: { cookie: cookieHeader } })
 const body = await response.text()
 return new NextResponse(body, { status: response.status, headers: { 'content-type': response.headers.get('content-type') ? response.headers.get('content-type') as string : 'application/json' } })
}

export async function GET() {
 return proxy('/api/v1/dashboard')
}
