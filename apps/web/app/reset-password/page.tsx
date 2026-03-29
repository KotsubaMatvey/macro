import { Suspense, createElement as h } from 'react'
import { ResetPasswordForm } from '@/components/auth/forms'

export default function Page() {
  return h(Suspense, { fallback: null }, h(ResetPasswordForm))
}
