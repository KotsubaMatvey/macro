'use client'

import type { GeoboardModeState, GeoboardSourceStatus } from './types'

export function GeoboardTicker(props: { items: string[]; modeState: GeoboardModeState; sourceStatus: GeoboardSourceStatus[] }) {
 const tape = props.items.length !== 0 ? props.items.join(' // ') : 'NO GEO FEED AVAILABLE'
 const discovery = props.sourceStatus.filter(function (item) { return item.sourceType === 'discovery' }).length
 const fallback = props.sourceStatus.filter(function (item) { return item.state === 'fallback' || item.state === 'degraded' }).length
 return <div className='grid h-7 grid-cols-[auto_minmax(0,1fr)] border-t border-[#1a2535] bg-[#060a0f] text-[10px] uppercase tracking-[0.1em] text-[#7a9ab8]'><div className='flex items-center gap-2 border-r border-[#1a2535] px-3 text-[#f59e0b]'><span className='geoboard-pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-[#f59e0b]' /><span>GEO FEED</span><span className={props.modeState.fallback ? 'text-[#f43f5e]' : 'text-[#10b981]'}>{props.modeState.fallback ? 'DEGRADED' : 'ONLINE'}</span><span className='text-[#7a9ab8]'>D{discovery}</span><span className='text-[#7a9ab8]'>F{fallback}</span></div><div className='overflow-hidden'><div className='geoboard-ticker-track flex min-w-max items-center gap-8 whitespace-nowrap px-4 py-1'>{Array.from({ length: 2 }).map(function (_, index) { return <span key={index}>{tape}</span> })}</div></div></div>
}
