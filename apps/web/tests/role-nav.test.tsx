import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const getSession = vi.fn()
vi.mock('@/lib/server/api', () => ({ getSession }))

import { PageShell } from '@/components/app/chrome'

describe('PageShell role-aware nav', () => {
  it('hides Admin section for non-admin users', async () => {
    getSession.mockResolvedValue({ id: 'user-demo', email: 'demo@northstarmacro.local', name: 'Demo', role: 'user', onboardingCompleted: true, emailVerified: true })
    const view = await PageShell({ title: 'Dashboard', subtitle: 'sub', active: 'dashboard', children: null })
    render(view)
    expect(screen.queryByText('Admin')).not.toBeInTheDocument()
  })

  it('shows Admin section for admin users', async () => {
    getSession.mockResolvedValue({ id: 'user-admin', email: 'admin@northstarmacro.local', name: 'Admin', role: 'admin', onboardingCompleted: true, emailVerified: true })
    const view = await PageShell({ title: 'Admin', subtitle: 'sub', active: 'admin', children: null })
    render(view)
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })
})
