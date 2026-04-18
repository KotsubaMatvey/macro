'use client'

import type { HoverState } from './types'

function line(label: string, value: string) {
 return <div className='flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.1em] text-[#7a9ab8]'><span>{label}</span><span className='text-right text-[#c8d8e8]'>{value}</span></div>
}

function sourceLine(type: string, mode: string, freshness?: string) {
 const postfix = freshness ? ' / ' + freshness : ''
 return (type + ' / ' + mode + postfix).toUpperCase()
}

function clip(value: string, limit = 48) {
 if (value.length <= limit) return value
 return value.slice(0, limit - 3) + '...'
}

function asText(value: unknown, fallback = '--') {
 if (value === null || value === undefined) return fallback
 const text = String(value).trim()
 return text ? text : fallback
}

function asDate(value: unknown) {
 const parsed = new Date(String(value))
 if (Number.isNaN(parsed.getTime())) return '--'
 return parsed.toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
}

export function GeoboardPopup(props: { hover: HoverState | null }) {
 if (!props.hover) return null
 const baseClass = 'pointer-events-none fixed z-[1000] min-w-[280px] max-w-[340px] rounded border border-[#1a2535] bg-[rgba(6,10,15,0.95)] px-3 py-2 text-[11px] text-[#c8d8e8] backdrop-blur-xl'
 const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1440
 const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 900
 const style = { left: Math.max(8, Math.min(viewportWidth - 360, props.hover.x + 16)), top: Math.max(8, Math.min(viewportHeight - 220, props.hover.y + 16)) }

 if (props.hover.layer === 'cb') {
  const item = props.hover.object
  return <div className={baseClass} style={style}>
   <div className='text-[11px] font-semibold uppercase tracking-[0.12em] text-[#22d3ee]'>{asText(item.name)}</div>
   <div className='mt-1 text-[10px] uppercase tracking-[0.08em] text-[#7a9ab8]'>{sourceLine(asText(item.sourceMeta.sourceType), asText(item.sourceMeta.mode), item.sourceMeta.freshness)}</div>
   <div className='mt-2 grid gap-1'>
    {line('RATE', asText(item.rate))}
    {line('NEXT', asText(item.nextMeeting))}
    {line('BIAS', clip(asText(item.bias), 34))}
    {line('SIGNAL', clip(asText(item.signal), 34))}
    {line('CONF', String(Math.round((item.ranking?.confidenceScore ? item.ranking.confidenceScore : 0) * 100)) + '%')}
   </div>
  </div>
 }

 if (props.hover.layer === 'geo') {
  const item = props.hover.object
  return <div className={baseClass} style={style}>
   <div className='text-[11px] font-semibold uppercase tracking-[0.12em] text-[#f43f5e]'>{clip(asText(item.title), 66)}</div>
   <div className='mt-1 text-[10px] uppercase tracking-[0.08em] text-[#7a9ab8]'>{asText(item.classification) + ' // ' + sourceLine(asText(item.sourceMeta.sourceType), asText(item.sourceMeta.mode), item.sourceMeta.freshness)}</div>
   <div className='mt-2 grid gap-1'>
    {line('TONE', Number.isFinite(item.tone) ? item.tone.toFixed(1) : '--')}
    {line('DATE', asDate(item.date))}
    {line('REGION', asText(item.regionGroup))}
    {line('ASSETS', clip(Array.isArray(item.affectedAssets) ? item.affectedAssets.join(' / ') : '--', 46))}
    {line('CONF', String(Math.round((item.ranking?.confidenceScore ? item.ranking.confidenceScore : 0) * 100)) + '%')}
   </div>
  </div>
 }

 if (props.hover.layer === 'trade') {
  const item = props.hover.object
  return <div className={baseClass} style={style}>
   <div className='text-[11px] font-semibold uppercase tracking-[0.12em] text-[#f59e0b]'>{asText(item.name)}</div>
   <div className='mt-1 text-[10px] uppercase tracking-[0.08em] text-[#7a9ab8]'>{sourceLine(asText(item.sourceMeta.sourceType), asText(item.sourceMeta.mode), item.sourceMeta.freshness)}</div>
   <div className='mt-2 grid gap-1'>
    {line('STATUS', clip(asText(item.status), 32))}
    {line('VOLUME', asText(item.volume))}
    {line('RISK', asText(item.riskLevel))}
    {line('IMPACT', clip(Array.isArray(item.impact) ? item.impact.join(' / ') : '--', 44))}
    {line('LINKED GEO', String(Array.isArray(item.linkedGeoEventIds) ? item.linkedGeoEventIds.length : 0))}
   </div>
  </div>
 }

 const item = props.hover.object
 return <div className={baseClass} style={style}>
  <div className='text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a78bfa]'>{clip(asText(item.name), 64)}</div>
  <div className='mt-1 text-[10px] uppercase tracking-[0.08em] text-[#7a9ab8]'>{asText(item.country) + ' // ' + sourceLine(asText(item.sourceMeta.sourceType), asText(item.sourceMeta.mode), item.sourceMeta.freshness)}</div>
  <div className='mt-2 grid gap-1'>
   {line('DATE', asDate(item.date))}
   {line('FORECAST', item.forecast === null ? '--' : String(item.forecast))}
   {line('PREVIOUS', item.previous === null ? '--' : String(item.previous))}
   {line('HORIZON', asText(item.horizonTag).replace('_', ' '))}
   {line('REACTION', clip(asText(item.expectedReaction), 44))}
  </div>
 </div>
}
