import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { deleteJson, getJson, patchJson, postJson } from '@/lib/client/api'

describe('postJson', () => {
 const originalFetch = global.fetch

 beforeEach(() => {
 global.fetch = vi.fn() as typeof fetch
 })

 afterEach(() => {
 global.fetch = originalFetch
 vi.restoreAllMocks()
 })

 it('posts to the same-origin api path so auth cookies stay on the web origin', async () => {
 ;(global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
 ok: true,
 json: vi.fn().mockResolvedValue({ status: 'ok' }),
 })

 await postJson('/api/v1/auth/sign-in', { email: 'demo@macroaccess.local', password: 'demo12345' })

 expect(global.fetch).toHaveBeenCalledWith(
 '/api/v1/auth/sign-in',
 expect.objectContaining({
 method: 'POST',
 credentials: 'include',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ email: 'demo@macroaccess.local', password: 'demo12345' }),
 }),
 )
 })

 it('falls back to NEXT_PUBLIC_API_URL when same-origin api route returns 404', async () => {
  ;(global.fetch as unknown as ReturnType<typeof vi.fn>)
   .mockResolvedValueOnce({ ok: false, status: 404, json: vi.fn().mockResolvedValue({ detail: 'Not found' }), url: '/api/v1/workspaces' })
   .mockResolvedValueOnce({ ok: true, status: 200, json: vi.fn().mockResolvedValue([{ id: 'workspace-1' }]), url: 'http://localhost:8000/api/v1/workspaces' })

  const payload = await getJson('/api/v1/workspaces')
  expect(Array.isArray(payload)).toBe(true)
  expect(global.fetch).toHaveBeenNthCalledWith(2, 'http://localhost:8000/api/v1/workspaces', expect.objectContaining({ method: 'GET', credentials: 'include' }))
 })

 it('uses PATCH and DELETE methods for mutation helpers', async () => {
  ;(global.fetch as unknown as ReturnType<typeof vi.fn>)
   .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ id: 'workspace-1' }) })
   .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ status: 'ok' }) })

  await patchJson('/api/v1/workspaces/workspace-1', { name: 'Desk v2' })
  await deleteJson('/api/v1/workspaces/workspace-1')

  expect(global.fetch).toHaveBeenNthCalledWith(
   1,
   '/api/v1/workspaces/workspace-1',
   expect.objectContaining({ method: 'PATCH', credentials: 'include', body: JSON.stringify({ name: 'Desk v2' }) }),
  )
  expect(global.fetch).toHaveBeenNthCalledWith(
   2,
   '/api/v1/workspaces/workspace-1',
   expect.objectContaining({ method: 'DELETE', credentials: 'include' }),
  )
 })
})
