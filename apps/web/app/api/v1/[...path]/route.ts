import type { NextRequest } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function getPath(context: any) {
 const value = await context.params
 return value.path.join('/')
}

async function forward(request: NextRequest, context: any) {
 const upstreamUrl = new URL('/api/v1/' + await getPath(context), API_URL)
 upstreamUrl.search = new URL(request.url).search

 const headers = new Headers()
 const contentType = request.headers.get('content-type')
 const cookie = request.headers.get('cookie')
 const userAgent = request.headers.get('user-agent')

 if (contentType) headers.set('content-type', contentType)
 if (cookie) headers.set('cookie', cookie)
 if (userAgent) headers.set('user-agent', userAgent)

 const upstream = await fetch(upstreamUrl, {
 method: request.method,
 headers,
 body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text(),
 cache: 'no-store',
 redirect: 'manual',
 })

 const responseHeaders = new Headers()
 const responseType = upstream.headers.get('content-type')
 const location = upstream.headers.get('location')
 const setCookieHeaders = (upstream.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.()
 const setCookie = upstream.headers.get('set-cookie')

 if (responseType) responseHeaders.set('content-type', responseType)
 if (location) responseHeaders.set('location', location)
 if (setCookieHeaders && setCookieHeaders.length) {
 for (const value of setCookieHeaders) responseHeaders.append('set-cookie', value)
 } else if (setCookie) {
 responseHeaders.set('set-cookie', setCookie)
 }

 return new Response(await upstream.arrayBuffer(), { status: upstream.status, headers: responseHeaders })
}

export async function GET(request: NextRequest, context: any) {
 return forward(request, context)
}

export async function POST(request: NextRequest, context: any) {
 return forward(request, context)
}

export async function PUT(request: NextRequest, context: any) {
 return forward(request, context)
}

export async function PATCH(request: NextRequest, context: any) {
 return forward(request, context)
}

export async function DELETE(request: NextRequest, context: any) {
 return forward(request, context)
}
