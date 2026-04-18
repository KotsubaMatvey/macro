import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const cookiesMock = vi.hoisted(function () {
 return vi.fn(async function () {
  return {
   toString: function (): string {
    return 'session=abc'
   },
  }
 })
})

vi.mock('next/headers', function () {
 return {
  cookies: cookiesMock,
 }
})

import { GET as dashboardGET } from '@/app/api/dashboard/route'
import { GET as v1GET } from '@/app/api/v1/[...path]/route'

describe('API proxy routes', function () {
 const originalFetch = global.fetch

 beforeEach(function () {
  global.fetch = vi.fn() as typeof fetch
  delete process.env.API_PROXY_TIMEOUT_MS
 })

 afterEach(function () {
  global.fetch = originalFetch
  vi.restoreAllMocks()
 })

 it('forwards v1 requests with encoded path segments and query params', async function () {
  ;(global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
   new Response(JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
   }),
  )

  const response = await v1GET(
   new Request('http://localhost/api/v1/events/us cpi?mode=wire', {
    method: 'GET',
    headers: {
     cookie: 'session=abc',
     'user-agent': 'vitest',
     accept: 'application/json',
    },
   }) as any,
   { params: Promise.resolve({ path: ['events', 'us cpi'] }) } as any,
  )

  expect(response.status).toBe(200)
  await expect(response.json()).resolves.toEqual({ status: 'ok' })
  expect(global.fetch).toHaveBeenCalledTimes(1)
  const [url, init] = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [URL, RequestInit]
  expect(String(url)).toBe('http://localhost:8000/api/v1/events/us%20cpi?mode=wire')
  expect(init.method).toBe('GET')
  const headers = init.headers as Headers
  expect(headers.get('cookie')).toBe('session=abc')
  expect(headers.get('accept')).toBe('application/json')
 })

 it('returns v1 timeout responses as 504', async function () {
  ;(global.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
   Object.assign(new Error('aborted'), { name: 'AbortError' }),
  )

  const response = await v1GET(
   new Request('http://localhost/api/v1/news', { method: 'GET' }) as any,
   { params: Promise.resolve({ path: ['news'] }) } as any,
  )

  expect(response.status).toBe(504)
  await expect(response.json()).resolves.toEqual({ detail: 'API upstream timeout' })
 })

 it('returns dashboard timeout responses as 504', async function () {
  ;(global.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
   Object.assign(new Error('aborted'), { name: 'AbortError' }),
  )

  const response = await dashboardGET()
  expect(response.status).toBe(504)
  await expect(response.json()).resolves.toEqual({ detail: 'Dashboard upstream timeout' })
  expect(cookiesMock).toHaveBeenCalled()
 })
})
