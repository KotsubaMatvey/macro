import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SignInForm } from '@/components/auth/forms'

const push = vi.fn()
const refresh = vi.fn()
const postJson = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh }), useSearchParams: () => ({ get: () => null }) }))
vi.mock('@/lib/client/api', () => ({ postJson: (...args: unknown[]) => postJson(...args) }))

describe('SignInForm', () => {
  beforeEach(() => {
    push.mockReset()
    refresh.mockReset()
    postJson.mockReset()
  })

  it('renders sign-in defaults', () => {
    render(<SignInForm />)
    expect(screen.getByDisplayValue('demo@northstarmacro.local')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open workstation' })).toBeInTheDocument()
  })

  it('submits credentials and routes to dashboard', async () => {
    postJson.mockResolvedValue({ email: 'demo@northstarmacro.local' })
    render(<SignInForm />)
    fireEvent.click(screen.getByRole('button', { name: 'Open workstation' }))
    await waitFor(() => expect(postJson).toHaveBeenCalledWith('/api/v1/auth/sign-in', { email: 'demo@northstarmacro.local', password: 'demo12345' }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/app/dashboard'))
    expect(refresh).toHaveBeenCalled()
  })
})
