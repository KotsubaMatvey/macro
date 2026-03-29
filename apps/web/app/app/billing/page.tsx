import { createElement as h } from 'react'

import { DataTable, PageShell, Panel } from '@/components/app/chrome'
import { getWorkstation } from '@/lib/server/api'

export default async function BillingPage() {
  const payload = await getWorkstation()
  return h(PageShell, { title: 'Billing', subtitle: 'Demo billing state with provider ready contract boundaries.', active: 'billing' }, h(Panel, { title: 'Subscription state' }, h(DataTable, { headers: ['Field', 'Value'], rows: [['Plan', payload.billing.plan], ['Seats', String(payload.billing.seatCount)], ['Renewal', payload.billing.renewalDate], ['Provider', payload.billing.providerMode]] })))
}
