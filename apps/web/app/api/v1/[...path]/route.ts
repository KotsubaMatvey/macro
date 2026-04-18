import type { NextRequest } from 'next/server'

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').trim().replace(/\/+$/, '')
const DEFAULT_PROXY_TIMEOUT_MS = 15000

function proxyTimeoutMs() {
 const parsed = Number.parseInt(process.env.API_PROXY_TIMEOUT_MS ?? String(DEFAULT_PROXY_TIMEOUT_MS), 10)
 if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_PROXY_TIMEOUT_MS
 return parsed
}

type RouteContext = {
 params: Promise<{ path: string[] }>
}

async function getPath(context: RouteContext) {
 const value = await context.params
 return value.path.map(function (segment) { return encodeURIComponent(segment) }).join('/')
}

async function forward(request: NextRequest, context: RouteContext) {
 const upstreamUrl = new URL('/api/v1/' + await getPath(context), API_URL)
 upstreamUrl.search = new URL(request.url).search

 const headers = new Headers()
 const contentType = request.headers.get('content-type')
 const cookie = request.headers.get('cookie')
 const userAgent = request.headers.get('user-agent')
 const accept = request.headers.get('accept')

 if (contentType) headers.set('content-type', contentType)
 if (cookie) headers.set('cookie', cookie)
 if (userAgent) headers.set('user-agent', userAgent)
 if (accept) headers.set('accept', accept)

 const controller = new AbortController()
 const timeoutMs = proxyTimeoutMs()
 const timeout = setTimeout(function () { controller.abort() }, timeoutMs)

 try {
  const upstream = await fetch(upstreamUrl, {
   method: request.method,
   headers,
   body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text(),
   cache: 'no-store',
   redirect: 'manual',
   signal: controller.signal,
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
  responseHeaders.set('cache-control', 'no-store')

  let payload: ArrayBuffer
  try {
   payload = await upstream.arrayBuffer()
  } catch (error) {
  console.error('API v1 proxy body read failed', upstreamUrl.toString(), error)
   return Response.json({ detail: "API upstream response unreadable" }, { status: 502 })
  }
  return new Response(payload, { status: upstream.status, headers: responseHeaders })
 } catch (error: unknown) {
  if (error instanceof Error && error.name === 'AbortError') {
   console.error('API v1 proxy timed out', upstreamUrl.toString(), timeoutMs)
   return Response.json({ detail: "API upstream timeout" }, { status: 504 })
  }
  console.error('API v1 proxy request failed', upstreamUrl.toString(), error)
  return Response.json({ detail: "API upstream unavailable" }, { status: 502 })
 } finally {
  clearTimeout(timeout)
 }
}

export async function GET(request: NextRequest, context: RouteContext) {
 return forward(request, context)
}

export async function POST(request: NextRequest, context: RouteContext) {
 return forward(request, context)
}

export async function PUT(request: NextRequest, context: RouteContext) {
 return forward(request, context)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
 return forward(request, context)
}

export async function DELETE(request: NextRequest, context: RouteContext) {
 return forward(request, context)
}

export async function HEAD(request: NextRequest, context: RouteContext) {
 return forward(request, context)
}

export async function OPTIONS(request: NextRequest, context: RouteContext) {
 return forward(request, context)
}
