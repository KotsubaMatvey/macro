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

export function GeoboardPopup(props: { hover: HoverState | null }) {
 if (!props.hover) return null
 const baseClass = 'pointer-events-none fixed z-[1000] min-w-[280px] max-w-[340px] rounded border border-[#1a2535] bg-[rgba(6,10,15,0.95)] px-3 py-2 text-[11px] text-[#c8d8e8] backdrop-blur-xl'
 const style = { left: props.hover.x + 16, top: props.hover.y + 16 }

 if (props.hover.layer === 'cb') {
  const item = props.hover.object
  return <div className={baseClass} style={style}>
   <div className='text-[11px] font-semibold uppercase tracking-[0.12em] text-[#22d3ee]'>{item.name}</div>
   <div className='mt-1 text-[10px] uppercase tracking-[0.08em] text-[#7a9ab8]'>{sourceLine(item.sourceMeta.sourceType, item.sourceMeta.mode, item.sourceMeta.freshness)}</div>
   <div className='mt-2 grid gap-1'>
    {line('RATE', item.rate)}
    {line('NEXT', item.nextMeeting)}
    {line('BIAS', clip(item.bias, 34))}
    {line('SIGNAL', clip(item.signal, 34))}
    {line('CONF', String(Math.round(item.ranking.confidenceScore * 100)) + '%')}
   </div>
  </div>
 }

 if (props.hover.layer === 'geo') {
  const item = props.hover.object
  return <div className={baseClass} style={style}>
   <div className='text-[11px] font-semibold uppercase tracking-[0.12em] text-[#f43f5e]'>{clip(item.title, 66)}</div>
   <div className='mt-1 text-[10px] uppercase tracking-[0.08em] text-[#7a9ab8]'>{item.classification + ' // ' + sourceLine(item.sourceMeta.sourceType, item.sourceMeta.mode, item.sourceMeta.freshness)}</div>
   <div className='mt-2 grid gap-1'>
    {line('TONE', item.tone.toFixed(1))}
    {line('DATE', item.date.slice(0, 16) + ' UTC')}
    {line('REGION', item.regionGroup)}
    {line('ASSETS', clip(item.affectedAssets.join(' / '), 46))}
    {line('CONF', String(Math.round(item.ranking.confidenceScore * 100)) + '%')}
   </div>
  </div>
 }

 if (props.hover.layer === 'trade') {
  const item = props.hover.object
  return <div className={baseClass} style={style}>
   <div className='text-[11px] font-semibold uppercase tracking-[0.12em] text-[#f59e0b]'>{item.name}</div>
   <div className='mt-1 text-[10px] uppercase tracking-[0.08em] text-[#7a9ab8]'>{sourceLine(item.sourceMeta.sourceType, item.sourceMeta.mode, item.sourceMeta.freshness)}</div>
   <div className='mt-2 grid gap-1'>
    {line('STATUS', clip(item.status, 32))}
    {line('VOLUME', item.volume)}
    {line('RISK', item.riskLevel)}
    {line('IMPACT', clip(item.impact.join(' / '), 44))}
    {line('LINKED GEO', String(item.linkedGeoEventIds.length))}
   </div>
  </div>
 }

 const item = props.hover.object
 return <div className={baseClass} style={style}>
  <div className='text-[11px] font-semibold uppercase tracking-[0.12em] text-[#a78bfa]'>{clip(item.name, 64)}</div>
  <div className='mt-1 text-[10px] uppercase tracking-[0.08em] text-[#7a9ab8]'>{item.country + ' // ' + sourceLine(item.sourceMeta.sourceType, item.sourceMeta.mode, item.sourceMeta.freshness)}</div>
  <div className='mt-2 grid gap-1'>
   {line('DATE', item.date.slice(0, 16) + ' UTC')}
   {line('FORECAST', item.forecast === null ? '--' : String(item.forecast))}
   {line('PREVIOUS', item.previous === null ? '--' : String(item.previous))}
   {line('HORIZON', item.horizonTag.replace('_', ' '))}
   {line('REACTION', clip(item.expectedReaction, 44))}
  </div>
 </div>
}
