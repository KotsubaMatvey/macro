import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(function () { return { getSession: vi.fn() } })
vi.mock('@/lib/server/api', function () { return { getSession: api.getSession } })

import { PageShell } from '@/components/app/chrome'

describe('PageShell role-aware nav', function () {
 it('hides Admin section for non-admin users', async function () {
  api.getSession.mockResolvedValue({ id: 'user-demo', email: 'demo@macroaccess.local', name: 'Demo', role: 'user', onboardingCompleted: true, emailVerified: true })
  const view = await PageShell({ title: 'Dashboard', subtitle: 'sub', active: 'dashboard', children: null })
  render(view)
  expect(screen.queryByRole('link', { name: /Admin/ })).not.toBeInTheDocument()
 })

 it('shows Admin section for admin users', async function () {
  api.getSession.mockResolvedValue({ id: 'user-admin', email: 'admin@macroaccess.local', name: 'Admin', role: 'admin', onboardingCompleted: true, emailVerified: true })
  const view = await PageShell({ title: 'Admin', subtitle: 'sub', active: 'admin', children: null })
  render(view)
  expect(screen.getByRole('link', { name: /Admin/ })).toBeInTheDocument()
 })

 it('shows the active section submenu inline with an active child state', async function () {
  api.getSession.mockResolvedValue({ id: 'user-demo', email: 'demo@macroaccess.local', name: 'Demo', role: 'user', onboardingCompleted: true, emailVerified: true })
  const view = await PageShell({ title: 'Event Explorer', subtitle: 'sub', active: 'event-explorer', children: null })
  render(view)
  expect(screen.getByRole('link', { name: /Event Explorer/ })).toHaveAttribute('aria-current', 'page')
  expect(screen.getByRole('link', { name: /Market News/ })).toBeInTheDocument()
  expect(screen.queryByRole('link', { name:/^Admin$/ })).not.toBeInTheDocument()
 })

 it('renders the compact bottom utility search and mode context', async function () {
  api.getSession.mockResolvedValue({ id: 'user-demo', email: 'demo@macroaccess.local', name: 'Demo', role: 'user', onboardingCompleted: true, emailVerified: true })
  const view = await PageShell({ title: 'Dashboard', subtitle: 'sub', active: 'dashboard', children: null })
  render(view)
  expect(screen.getByPlaceholderText('Search events')).toBeInTheDocument()
  expect(screen.getByText('Macro Access')).toBeInTheDocument()
  expect(screen.getAllByText('mixed').length).toBeGreaterThan(0)
 })
})

