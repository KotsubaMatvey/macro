import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { postJson } from '@/lib/client/api'

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
})
