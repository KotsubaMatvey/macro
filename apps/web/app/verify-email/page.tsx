import { Suspense, createElement as h } from 'react'
import { VerifyEmailForm } from '@/components/auth/forms'

export default function Page() {
  return h(Suspense, { fallback: null }, h(VerifyEmailForm))
}
