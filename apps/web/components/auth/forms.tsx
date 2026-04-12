'use client'
import Link from 'next/link'
import { createElement as h, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { Panel } from '@/components/app/panel'
import { postJson } from '@/lib/client/api'
import { surfaces } from '@macroaccess/ui'

function field(label: string, value: string, setValue: (value: string) => void, type = 'text') {
  return h('label', { className: 'grid gap-2 text-sm text-slate-300' }, [h('span', { key: 'label' }, label), h('input', { key: 'input', type, value, onChange: function (event: any) { setValue(event.target.value) }, className: surfaces.input })])
}

function authShell(title: string, children: any, footer: any = null) {
  return h('main', { className: 'flex min-h-screen items-center justify-center bg-[var(--bg)] px-6 py-8' }, h(Panel, { title, className: 'w-full max-w-md' }, [children, footer]))
}

export function SignInForm() {
  const router = useRouter()
  const [email, setEmail] = useState('demo@macroaccess.local')
  const [password, setPassword] = useState('demo12345')
  const [error, setError] = useState('')
  async function submit() {
    try {
      setError('')
      await postJson('/api/v1/auth/sign-in', { email, password })
      router.push('/app/dashboard')
      router.refresh()
    } catch (exc: any) {
      setError(exc.message)
    }
  }
  return authShell('Sign in', h('div', { className: 'grid gap-4' }, [field('Email', email, setEmail), field('Password', password, setPassword, 'password'), error ? h('div', { key: 'error', className: 'text-sm text-rose-300' }, error) : null, h('button', { key: 'button', onClick: submit, className: surfaces.button }, 'Open workstation')]), h('div', { className: 'mt-4 flex justify-between text-sm text-slate-500' }, [h(Link, { key: 'signup', href: '/sign-up' }, 'Create account'), h(Link, { key: 'reset', href: '/reset-password' }, 'Reset password')]))
}

export function SignUpForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  async function submit() {
    try {
      setError('')
      const result = await postJson('/api/v1/auth/sign-up', { name, email, password })
      setMessage(result.token ? 'Verification token: ' + result.token : result.detail ?? '')
      router.push('/verify-email' + (result.token ? '?token=' + encodeURIComponent(result.token) : ''))
    } catch (exc: any) {
      setError(exc.message)
    }
  }
  return authShell('Create account', h('div', { className: 'grid gap-4' }, [field('Name', name, setName), field('Email', email, setEmail), field('Password', password, setPassword, 'password'), message ? h('div', { key: 'message', className: 'text-sm text-emerald-300' }, message) : null, error ? h('div', { key: 'error', className: 'text-sm text-rose-300' }, error) : null, h('button', { key: 'button', onClick: submit, className: surfaces.button }, 'Create account')]), h('div', { className: 'mt-4 text-sm text-slate-500' }, h(Link, { href: '/sign-in' }, 'Back to sign in')))
}

export function VerifyEmailForm() {
  const params = useSearchParams()
  const router = useRouter()
  const [token, setToken] = useState(params.get('token') ?? '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  async function submit() {
    try {
      setError('')
      const result = await postJson('/api/v1/auth/verify-email', { token })
      setMessage(result.detail ?? '')
      router.push('/sign-in')
    } catch (exc: any) {
      setError(exc.message)
    }
  }
  return authShell('Verify email', h('div', { className: 'grid gap-4' }, [field('Verification token', token, setToken), message ? h('div', { key: 'message', className: 'text-sm text-emerald-300' }, message) : null, error ? h('div', { key: 'error', className: 'text-sm text-rose-300' }, error) : null, h('button', { key: 'button', onClick: submit, className: surfaces.button }, 'Verify')]))
}

export function ResetPasswordForm() {
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [token, setToken] = useState(params.get('token') ?? '')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  async function requestReset() {
    try {
      const result = await postJson('/api/v1/auth/request-password-reset', { email })
      setToken(result.token ?? '')
      setMessage(result.token ? 'Reset token: ' + result.token : result.detail ?? '')
    } catch (exc: any) {
      setError(exc.message)
    }
  }
  async function completeReset() {
    try {
      const result = await postJson('/api/v1/auth/reset-password', { token, password })
      setMessage(result.detail ?? '')
    } catch (exc: any) {
      setError(exc.message)
    }
  }
  return authShell('Reset password', h('div', { className: 'grid gap-4' }, [field('Email', email, setEmail), h('button', { key: 'request', onClick: requestReset, className: surfaces.subtleButton }, 'Request reset token'), field('Token', token, setToken), field('New password', password, setPassword, 'password'), message ? h('div', { key: 'message', className: 'text-sm text-emerald-300' }, message) : null, error ? h('div', { key: 'error', className: 'text-sm text-rose-300' }, error) : null, h('button', { key: 'complete', onClick: completeReset, className: surfaces.button }, 'Update password')]))
}

export function OnboardingForm() {
  const router = useRouter()
  const [desk, setDesk] = useState('macro')
  const [timezone, setTimezone] = useState('Europe/Moscow')
  const [region, setRegion] = useState('Global')
  const [density, setDensity] = useState('dense')
  const [bio, setBio] = useState('')
  const [error, setError] = useState('')
  async function submit() {
    try {
      await postJson('/api/v1/onboarding', { desk, timezone, region, density, bio })
      router.push('/app/dashboard')
      router.refresh()
    } catch (exc: any) {
      setError(exc.message)
    }
  }
  return authShell('Onboarding', h('div', { className: 'grid gap-4' }, [field('Desk', desk, setDesk), field('Timezone', timezone, setTimezone), field('Region', region, setRegion), field('Density', density, setDensity), field('Bio', bio, setBio), error ? h('div', { key: 'error', className: 'text-sm text-rose-300' }, error) : null, h('button', { key: 'button', onClick: submit, className: surfaces.button }, 'Save preferences')]))
}

