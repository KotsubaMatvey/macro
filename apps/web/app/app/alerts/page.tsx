/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { createElement as h } from 'react'

import { DataTable, MetricGrid, PageShell, Panel } from '@/components/app/chrome'
import { getWorkstation } from '@/lib/server/api'

export default async function AlertsPage() {
  const payload = await getWorkstation()
  const active = payload.alerts.filter(function (item: any) { return item.status === 'Active' }).length
  const triggered = payload.alerts.filter(function (item: any) { return item.status === 'Triggered' }).length
  const scheduled = payload.alerts.filter(function (item: any) { return item.status === 'Scheduled' }).length
  const metrics = [
    { label: 'Total alerts', value: String(payload.alerts.length), note: 'Alert rules available for this account' },
    { label: 'Active', value: String(active), note: 'Rules currently waiting for the trigger condition' },
    { label: 'Triggered', value: String(triggered), note: 'Alerts already fired in the recent tape' },
    { label: 'Scheduled', value: String(scheduled), note: 'Rules parked ahead of the catalyst window' },
  ]
  const rows = payload.alerts.map(function (item: any) {
    return [item.name, item.triggerType, item.deliveryChannel, item.status, String(item.threshold ?? '-'), item.lastTriggeredAt ? item.lastTriggeredAt : '-']
  })
  const summaryRows = [
    ['Event reminders', String(payload.alerts.filter(function (item: any) { return item.triggerType === 'event_reminder' }).length), 'Best for pre-event workflow and catalyst tracking'],
    ['Other rules', String(payload.alerts.filter(function (item: any) { return item.triggerType !== 'event_reminder' }).length), 'Reserved for provider-ready threshold logic'],
    ['Delivery', String(Array.from(new Set(payload.alerts.map(function (item: any) { return item.deliveryChannel }))).length), 'Channels currently configured in demo mode'],
  ]
  return h(PageShell, { title: 'Alerts', subtitle: 'Event reminders, threshold logic, and regime change monitoring.', active: 'alerts' }, h('div', { className: 'space-y-5' }, [
    h(MetricGrid, { key: 'metrics', items: metrics }),
    h('div', { key: 'grid', className: 'grid gap-5 xl:grid-cols-2' }, [
      h(Panel, { key: 'alerts', title: 'Alert center' }, h(DataTable, { headers: ['Alert', 'Trigger', 'Channel', 'Status', 'Threshold', 'Last trigger'], rows: rows.length ? rows : [['No alerts', '-', '-', '-', '-', '-']] })),
      h(Panel, { key: 'summary', title: 'Alert mix' }, h(DataTable, { headers: ['Bucket', 'Count', 'Use case'], rows: summaryRows })),
    ]),
  ]))
}
