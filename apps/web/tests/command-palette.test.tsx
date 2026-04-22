import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(function () {
 return { getJson: vi.fn() }
})

const navigation = vi.hoisted(function () {
 return { push: vi.fn(), pathname: '/app/events/event-cpi-mar' }
})

vi.mock('@/lib/client/api', function () {
 return { getJson: api.getJson }
})

vi.mock('next/navigation', function () {
 return {
  useRouter: function () {
   return { push: navigation.push }
  },
  usePathname: function () {
   return navigation.pathname
  },
 }
})

import { CommandPalette } from '@/components/app/command-palette'

describe('CommandPalette', function () {
 it('opens via keyboard, loads dynamic commands, and routes on enter', async function () {
  api.getJson.mockImplementation(async function (path: string) {
   if (path === '/api/v1/events') return [{ id: 'event-cpi-mar', title: 'US CPI March', impact: 'High' }]
   if (path === '/api/geoboard/feed?mode=STANDARD') return { feed: [{ id: 'feed-1', title: 'Hormuz risk', linkedEventId: 'event-cpi-mar' }] }
   if (path === '/api/v1/news?mode=macro&limit=1') return { items: [{ id: 'news-1', title: 'Fed headline' }] }
   if (path === '/api/v1/workspaces') return [{ id: 'workspace-1', name: 'Macro Desk', activeRoute: '/app/dashboard' }]
   return {}
  })

  render(<CommandPalette />)
  fireEvent.keyDown(window, { key: 'k', ctrlKey: true })

  expect(screen.getByRole('dialog')).toBeInTheDocument()
  expect(screen.getByText('Open Dashboard')).toBeInTheDocument()

  await waitFor(function () {
   expect(screen.getByText('Open Latest High-Impact Event')).toBeInTheDocument()
   expect(screen.getByText('Open Relationship Map for Current Event')).toBeInTheDocument()
  })

  const input = screen.getByPlaceholderText('Type a command, module, workspace, event, provider...')
  fireEvent.change(input, { target: { value: 'high-impact' } })
  fireEvent.keyDown(input, { key: 'Enter' })

  expect(navigation.push).toHaveBeenCalledWith('/app/events/event-cpi-mar')
 }, 15000)
})
