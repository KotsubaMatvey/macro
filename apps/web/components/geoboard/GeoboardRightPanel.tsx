'use client'

import type { FeedItem, RegimeZone } from './types'

function badgeTone(value: string) {
 if (value === 'RISK-ON') return 'border-[#10b981]/35 bg-[#10b981]/12 text-[#72f3bb]'
 if (value === 'RISK-OFF') return 'border-[#f43f5e]/35 bg-[#f43f5e]/12 text-[#ff98ab]'
 return 'border-[#f59e0b]/35 bg-[#f59e0b]/12 text-[#ffd48b]'
}

export function GeoboardRightPanel(props: { zones: RegimeZone[]; feed: FeedItem[]; selectedId: string | null; fallback: boolean; onRegionSelect: (zone: RegimeZone) => void; onFeedSelect: (item: FeedItem) => void }) {
 return <aside className='flex h-full flex-col border-l border-[#1a2535] bg-[#0a1018] text-[#c8d8e8]'><div className='h-40 border-b border-[#1a2535] p-3'><div className='mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.1em] text-[#7a9ab8]'><span>Regional Regimes</span>{props.fallback ? <span className='text-[#f43f5e]'>FALLBACK DATA</span> : null}</div><div className='grid grid-cols-2 gap-2'>{props.zones.map(function (zone) { return <button key={zone.id} type='button' onClick={function () { props.onRegionSelect(zone) }} className='border border-[#1a2535] bg-[#060a0f] p-2 text-left transition hover:border-[#2b3c52]'><div className='flex items-center justify-between gap-2'><span className='text-[14px]'>{zone.flag}</span><span className={'border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] ' + badgeTone(zone.regime)}>{zone.regime}</span></div><div className='mt-2 text-[11px] uppercase tracking-[0.12em]'>{zone.label}</div><div className='mt-1 text-[10px] text-[#7a9ab8]'>CONF {zone.confidence}%</div></button> })}</div></div><div className='flex min-h-0 flex-1 flex-col p-3'><div className='mb-3 text-[10px] uppercase tracking-[0.1em] text-[#7a9ab8]'>Geo // Macro Feed</div><div className='min-h-0 flex-1 space-y-2 overflow-y-auto pr-1'>{props.feed.map(function (item) { return <button key={item.id} type='button' onClick={function () { props.onFeedSelect(item) }} className={'block w-full border p-2 text-left transition ' + (props.selectedId === item.id ? 'border-[#22d3ee]/45 bg-[#22d3ee]/8' : 'border-[#1a2535] bg-[#060a0f] hover:border-[#2b3c52]')}><div className='flex items-center justify-between gap-2 text-[9px] uppercase tracking-[0.1em] text-[#7a9ab8]'><span>{item.type}</span><span>{item.time.slice(5, 16)} UTC</span></div><div className='mt-2 text-[11px] uppercase tracking-[0.08em] text-[#c8d8e8]'>{item.title}</div><div className='mt-1 text-[10px] text-[#3a5a78]'>{item.impactLine}</div></button> })}</div></div></aside>
}
