import { createElement as h } from 'react'

import { DataTable, PageShell, Panel } from '@/components/app/chrome'
import { getSession, getWorkstation } from '@/lib/server/api'

export default async function SettingsPage() {
  const user = await getSession()
  const payload = await getWorkstation()
  return h(PageShell, { title: 'Settings', subtitle: 'Account identity, density, and environment preferences.', active: 'settings' }, h(Panel, { title: 'Profile settings' }, h(DataTable, { headers: ['Field', 'Value'], rows: [['Name', user.name], ['Email', user.email], ['Role', user.role], ['Feature flags', String(payload.featureFlags.length)]] })))
}
