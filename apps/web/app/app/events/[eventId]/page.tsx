/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { createElement as h } from 'react'
import { notFound } from 'next/navigation'

import { DataTable, EventLink, KeyValueList, PageShell, Panel } from '@/components/app/chrome'
import { getEventDetail, getEvents, getWorkstation } from '@/lib/server/api'

function verdict(event: any) {
  if (event.actual == null) return 'Pending'
  if (event.forecast == null) return 'Pending'
  const delta = event.actual - event.forecast
  if (delta > 0.2) return 'Beat'
  if (delta < -0.2) return 'Miss'
  return 'Inline'
}

export default async function EventDetailPage(props: any) {
  const params = await props.params
  let event: any

  try {
    event = await getEventDetail(params.eventId)
  } catch {
    notFound()
  }

  const events = await getEvents()
  const payload = await getWorkstation()
  const archive = events.filter(function (item: any) {
    if (item.id === event.id) return false
    return item.family === event.family
  }).slice(0, 6)
  const relatedBiases = payload.biases.filter(function (item: any) {
    return event.relatedAssets.includes(item.symbol)
  })
  const relatedEvents = events.filter(function (item: any) {
    if (item.id === event.id) return false
    if (item.country === event.country) return true
    return item.currency === event.currency
  }).slice(0, 6)
  const narrative = event.historicalReactions.length ? event.historicalReactions[0].narrative : event.whyItMatters
  const briefingRows = event.linkedBriefings.map(function (item: any) {
    return [item.title, item.analystName, item.kind, item.summary]
  })
  const newsRows = event.linkedNews.map(function (item: any) {
    return [item.title, item.source, item.category, item.sentiment]
  })
  const biasRows = relatedBiases.map(function (item: any) {
    return [item.symbol, item.direction, item.score.toFixed(0), Math.round(item.confidence * 100) + ' pct', item.rationale.join(', ')]
  })
  const archivePanel = archive.length ? h('div', { className: 'grid gap-3' }, archive.map(function (item: any) {
    return h(EventLink, { key: item.id, eventId: item.id, slug: item.slug, title: item.title, meta: item.status + ' / ' + item.scheduledAt.slice(0, 10) })
  })) : h('div', { className: 'text-sm text-slate-500' }, 'No earlier releases in this family yet.')
  const relatedPanel = relatedEvents.length ? h('div', { className: 'grid gap-3' }, relatedEvents.map(function (item: any) {
    return h(EventLink, { key: item.id, eventId: item.id, slug: item.slug, title: item.title, meta: item.country + ' / ' + item.impact + ' / ' + item.status })
  })) : h('div', { className: 'text-sm text-slate-500' }, 'No related catalysts loaded.')
  return h(PageShell, { title: event.title, subtitle: event.whyItMatters, active: 'macro-calendar' }, h('div', { className: 'grid gap-5 xl:grid-cols-2' }, [
    h('div', { key: 'main', className: 'space-y-5' }, [
      h(Panel, { key: 'profile', title: 'Release profile' }, h(DataTable, { headers: ['Previous', 'Forecast', 'Actual', 'Surprise', 'Verdict'], rows: [[String(event.previous ?? '-'), String(event.forecast ?? '-'), String(event.actual ?? '-'), String(event.surprise ?? '-'), verdict(event)]] })),
      h(Panel, { key: 'analysis', title: 'AI analysis' }, h('div', { className: 'space-y-3 text-sm text-slate-300' }, [
        h('div', { key: 'headline', className: 'text-lg font-medium text-white' }, 'Narrative summary'),
        h('p', { key: 'narrative', className: 'leading-7' }, narrative + '. ' + payload.regime.interpretation),
        h('div', { key: 'why', className: 'rounded-xl border border-white/8 p-4 text-slate-400' }, 'Why it matters: ' + event.whyItMatters),
      ])),
      h(Panel, { key: 'reactions', title: 'Historical reactions' }, h(DataTable, { headers: ['Window', 'Average move', 'Consistency', 'Narrative'], rows: event.historicalReactions.map(function (item: any) {
        return [item.window, String(item.avgMovePct) + ' pct', String(Math.round(item.consistency * 100)) + ' pct', item.narrative]
      }) })),
      h(Panel, { key: 'briefings', title: 'Source archive' }, h(DataTable, { headers: ['Title', 'Analyst', 'Kind', 'Summary'], rows: briefingRows.length ? briefingRows : [['No archive', '-', '-', 'No linked briefings yet.']] })),
      h(Panel, { key: 'news', title: 'Related news' }, h(DataTable, { headers: ['Headline', 'Source', 'Category', 'Sentiment'], rows: newsRows.length ? newsRows : [['No linked news', '-', '-', '-']] })),
    ]),
    h('div', { key: 'side', className: 'space-y-5' }, [
      h(Panel, { key: 'meta', title: 'Event context' }, h(KeyValueList, { items: [
        { label: 'Family', value: event.family },
        { label: 'Country', value: event.country },
        { label: 'Currency', value: event.currency },
        { label: 'Impact', value: event.impact, tone: event.impact },
        { label: 'Category', value: event.category },
        { label: 'Status', value: event.status, tone: event.status },
        { label: 'Scheduled', value: event.scheduledAt },
        { label: 'Assets', value: event.relatedAssets.join(', ') },
      ] })),
      h(Panel, { key: 'archive', title: 'Archive selector' }, archivePanel),
      h(Panel, { key: 'bias', title: 'Bias context' }, h(DataTable, { headers: ['Asset', 'Direction', 'Score', 'Confidence', 'Themes'], rows: biasRows.length ? biasRows : [['No related assets', '-', '-', '-', '-']] })),
      h(Panel, { key: 'related', title: 'Related catalysts' }, relatedPanel),
    ]),
  ]))
}
