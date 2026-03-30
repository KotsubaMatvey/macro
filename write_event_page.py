from pathlib import Path 
path = Path(r'E:\macro\apps\web\app\app\events\[eventId]\page.tsx') 
lines = [ 
\"import { createElement as h } from 'react'\", 
\"import { notFound } from 'next/navigation'\", 
\"\", 
\"import { DataTable, KeyValueList, PageShell, Panel } from '@/components/app/chrome'\", 
\"import { getEventDetail } from '@/lib/server/api'\", 
\"\", 
\"export default async function EventDetailPage(props: { params: Promise<{ eventId: string }> }) {\", 
\"  const params = await props.params\", 
\"  let event: any\", 
\"  try {\", 
\"    event = await getEventDetail(params.eventId)\", 
\"  } catch {\", 
\"    notFound()\", 
\"  }\", 
\"  return h(PageShell, { title: event.title, subtitle: event.whyItMatters, active: 'macro-calendar' }, h('div', { className: 'grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_360px]' }, [\", 
\"    h('div', { key: 'main', className: 'space-y-5' }, [\", 
\"      h(Panel, { key: 'profile', title: 'Release profile' }, h(DataTable, { headers: ['Previous', 'Forecast', 'Actual', 'Surprise'], rows: [[String(event.previous ?? '-'), String(event.forecast ?? '-'), String(event.actual ?? '-'), String(event.surprise ?? '-')]] })),\", 
\"      h(Panel, { key: 'reactions', title: 'Historical reactions' }, h(DataTable, { headers: ['Window', 'Average move', 'Consistency', 'Narrative'], rows: event.historicalReactions.map(function (item: any) { return [item.window, String(item.avgMovePct) + '%', String(Math.round(item.consistency * 100)) + '%', item.narrative] }) })),\", 
\"      h(Panel, { key: 'briefings', title: 'Linked briefings' }, h('div', { className: 'grid gap-3 text-sm text-slate-300' }, event.linkedBriefings.length ? event.linkedBriefings.map(function (item: any) { return h('div', { key: item.id, className: 'rounded-xl border border-white/8 p-4' }, [h('div', { key: 'title', className: 'font-medium text-white' }, item.title), h('div', { key: 'meta', className: 'mt-1 text-xs uppercase tracking-[0.14em] text-slate-500' }, item.kind + ' / ' + item.analystName), h('p', { key: 'summary', className: 'mt-3' }, item.summary)]) }) : h('div', { className: 'text-slate-500' }, 'No linked briefings yet.'))),\", 
\"      h(Panel, { key: 'news', title: 'Linked news' }, h('div', { className: 'grid gap-3 text-sm text-slate-300' }, event.linkedNews.length ? event.linkedNews.map(function (item: any) { return h('div', { key: item.id, className: 'rounded-xl border border-white/8 p-4' }, [h('div', { key: 'title', className: 'font-medium text-white' }, item.title), h('div', { key: 'meta', className: 'mt-1 text-xs uppercase tracking-[0.14em] text-slate-500' }, item.source + ' / ' + item.sentiment), h('p', { key: 'summary', className: 'mt-3' }, item.summary)]) }) : h('div', { className: 'text-slate-500' }, 'No linked news yet.'))),\", 
\"    ]),\", 
\"    h(Panel, { key: 'meta', title: 'Event context', className: 'h-fit' }, h(KeyValueList, { items: [{ label: 'Family', value: event.family }, { label: 'Country', value: event.country }, { label: 'Currency', value: event.currency }, { label: 'Impact', value: event.impact, tone: event.impact }, { label: 'Category', value: event.category }, { label: 'Status', value: event.status, tone: event.status }, { label: 'Scheduled', value: event.scheduledAt }, { label: 'Assets', value: event.relatedAssets.join(', ') }] })),\", 
\"  ]))\", 
\"}\", 
\"]\" 
path.write_text('\n'.join(lines) + '\n', encoding='utf-8') 
