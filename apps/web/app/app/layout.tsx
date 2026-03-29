import { redirect } from 'next/navigation'

import { getSession } from '@/lib/server/api'

export default async function AppLayout(props: { children: React.ReactNode }) {
  try {
    await getSession()
  } catch {
    redirect('/sign-in')
  }
  return props.children
}
