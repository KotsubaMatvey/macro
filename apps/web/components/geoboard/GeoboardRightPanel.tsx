'use client'

import type { FeedItem, GeoboardModeState, GeoboardSourceStatus, RegimeZone } from './types'

function badgeTone(value: string) {
 if (value === 'RISK-ON') return 'border-[#10b981]/35 bg-[#10b981]/12 text-[#72f3bb]'
 if (value === 'RISK-OFF') return 'border-[#f43f5e]/35 bg-[#f43f5e]/12 text-[#ff98ab]'
 return 'border-[#f59e0b]/35 bg-[#f59e0b]/12 text-[#ffd48b]'
}

function sourceTone(type: string) {
 if (type === 'official') return 'text-[#72f3bb]'
 if (type === 'discovery') return 'text-[#93c5fd]'
 if (type === 'derived') return 'text-[#a5b4fc]'
 if (type === 'static') return 'text-[#fcd34d]'
 if (type === 'fallback') return 'text-[#fda4af]'
 return 'text-[#7aa4ca]'
}

function badgeLabel(status: GeoboardSourceStatus) {
 return status.layer.toUpperCase() + ' // ' + status.state.toUpperCase()
}

function formatMode(modeState: GeoboardModeState) {
 return modeState.fallback ? 'DEGRADED' : 'ONLINE'
}

function safeHref(value: unknown) {
 if (typeof value !== 'string') return null
 if (value.startsWith('/app/')) return value
 if (value.startsWith('https://') || value.startsWith('http://')) return value
 return null
}

function quickLinks(item: FeedItem) {
 const links = [['EVT', item.links.event], ['CAL', item.links.calendar], ['NEWS', item.links.news], ['REACT', item.links.reactions], ['BIAS', item.links.bias], ['RPT', item.links.reports], ['WATCH', item.links.watchlists], ['ALRT', item.links.alerts], ['SRC', item.links.source]] as const
 return links.map(function (entry) { return [entry[0], safeHref(entry[1])] as const }).filter(function (entry) { return Boolean(entry[1]) })
}

export function GeoboardRightPanel(props: { zones: RegimeZone[]; feed: FeedItem[]; selectedId: string | null; modeState: GeoboardModeState; sourceStatus: GeoboardSourceStatus[]; onRegionSelect: (zone: RegimeZone) => void; onFeedSelect: (item: FeedItem) => void }) {
 const rankedFeed = props.feed.slice().sort(function (a, b) { return b.ranking.rankScore - a.ranking.rankScore }).slice(0, 24)
 const liveSources = props.sourceStatus.filter(function (status) { return status.state === 'live' }).length
 const degradedSources = props.sourceStatus.filter(function (status) { return status.state === 'degraded' || status.state === 'fallback' }).length
 return <aside className='flex h-full flex-col border-l border-[#1a2535] bg-[#0a1018] text-[#c8d8e8]'>
  <div className='border-b border-[#1a2535] p-3'>
   <div className='mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.1em] text-[#7a9ab8]'>
    <span>Regional Regimes</span>
    <span className={props.modeState.fallback ? 'text-[#f43f5e]' : 'text-[#10b981]'}>{formatMode(props.modeState)}</span>
   </div>
   <div className='grid grid-cols-2 gap-2'>
    {props.zones.map(function (zone, zoneIndex) {
     return <button key={zone.id + '-' + String(zoneIndex)} type='button' onClick={function () { props.onRegionSelect(zone) }} className='rounded border border-[#1a2535] bg-[#060a0f] p-2 text-left transition hover:border-[#2b3c52] hover:bg-[#0b131d]'>
      <div className='flex items-center justify-between gap-2'>
       <span className='text-[10px] uppercase tracking-[0.12em]'>{zone.flag}</span>
       <span className={'rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] ' + badgeTone(zone.regime)}>{zone.regime}</span>
      </div>
      <div className='mt-1 text-[11px] uppercase tracking-[0.12em]'>{zone.label}</div>
      <div className='mt-1 text-[10px] text-[#7a9ab8]'>{'CONF ' + String(zone.confidence) + '%'}</div>
     </button>
    })}
   </div>
  </div>
  <div className='border-b border-[#1a2535] px-3 py-2'>
   <div className='mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.1em] text-[#7a9ab8]'>
    <span>Source Integrity</span>
    <span className='text-[9px]'>{'L' + String(liveSources) + ' / D' + String(degradedSources)}</span>
   </div>
   <div className='mb-2 text-[9px] leading-4 text-[#587898]'>{props.modeState.sourceHonesty}</div>
   <div className='grid grid-cols-2 gap-1'>
    {props.sourceStatus.slice(0, 6).map(function (status, statusIndex) {
     return <div key={status.layer + '-' + status.state + '-' + String(statusIndex)} className='rounded border border-[#1a2535] bg-[#060a0f] px-1.5 py-1 text-[9px] uppercase tracking-[0.08em]'>
      <div className='text-[#7a9ab8]'>{badgeLabel(status)}</div>
      <div className={sourceTone(status.sourceType)}>{status.sourceType + ' / ' + status.mode}</div>
      <div className='mt-0.5 line-clamp-2 text-[8px] normal-case tracking-normal text-[#587898]'>{status.detail}</div>
     </div>
    })}
   </div>
  </div>
  <div className='flex min-h-0 flex-1 flex-col p-3'>
   <div className='mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.1em] text-[#7a9ab8]'>
    <span>Geo // Macro Ranked Feed</span>
    <span>{String(rankedFeed.length)}</span>
   </div>
   <div className='min-h-0 flex-1 space-y-2 overflow-y-auto pr-1'>
   {rankedFeed.map(function (item, index) {
     const links = quickLinks(item)
     const selected = props.selectedId === item.id
     return <div key={item.id + '-' + String(index)} className={'rounded border p-2 transition ' + (selected ? 'border-[#22d3ee]/45 bg-[#22d3ee]/8 shadow-[inset_2px_0_0_rgba(34,211,238,0.7)]' : 'border-[#1a2535] bg-[#060a0f] hover:border-[#2b3c52] hover:bg-[#0b131d]')}>
      <button type='button' onClick={function () { props.onFeedSelect(item) }} className='block w-full text-left'>
       <div className='flex items-center justify-between gap-2 text-[9px] uppercase tracking-[0.1em] text-[#7a9ab8]'>
        <span>{'#' + String(index + 1) + ' ' + item.feedType.replace('_', ' ')}</span>
        <span>{Math.round(item.ranking.rankScore * 100)}</span>
       </div>
       <div className='mt-1 flex flex-wrap gap-1.5'>
        <span className='rounded border border-[#2b3f58] px-1 py-0.5 text-[8px] uppercase tracking-[0.08em] text-[#8eb6d9]'>{'urg ' + Math.round(item.ranking.urgencyScore * 100)}</span>
        <span className='rounded border border-[#2b3f58] px-1 py-0.5 text-[8px] uppercase tracking-[0.08em] text-[#8eb6d9]'>{'conf ' + Math.round(item.ranking.confidenceScore * 100)}</span>
        <span className='rounded border border-[#2b3f58] px-1 py-0.5 text-[8px] uppercase tracking-[0.08em] text-[#8eb6d9]'>{item.sourceMeta.sourceType + ' / ' + item.sourceMeta.mode}</span>
       </div>
       <div className='mt-2 text-[11px] uppercase tracking-[0.08em] text-[#d4e3f3]'>{item.title}</div>
       <div className='mt-1 text-[10px] text-[#8aa7c4]'>{item.impactLine}</div>
       <div className='mt-1 text-[10px] text-[#5d7f9f]'>{item.subtitle}</div>
      </button>
     {links.length !== 0 ? <div className='mt-2 flex flex-wrap gap-1'>
       {links.map(function (entry, linkIndex) {
        return <a key={item.id + '-' + entry[0] + '-' + String(linkIndex)} href={entry[1] as string} className='rounded border border-[#1f3147] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em] text-[#8ec5f7] hover:border-[#2f4f73]'>
         {entry[0]}
        </a>
       })}
      </div> : null}
     </div>
    })}
    {rankedFeed.length === 0 ? <div className='rounded border border-[#1a2535] bg-[#060a0f] p-2 text-[10px] uppercase tracking-[0.1em] text-[#7a9ab8]'>No ranked rows for this mode. Switch mode or review source status.</div> : null}
   </div>
  </div>
 </aside>
}
