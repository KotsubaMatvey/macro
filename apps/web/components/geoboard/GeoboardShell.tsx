'use client'

import { startTransition, useEffect, useMemo, useState } from 'react'

import { GeoboardMap } from './GeoboardMap'
import { GeoboardPopup } from './GeoboardPopup'
import { GeoboardRightPanel } from './GeoboardRightPanel'
import { GeoboardTicker } from './GeoboardTicker'
import { useGeoboardData } from './hooks/useGeoboardData'
import type { FeedItem, GeoboardMode, HoverState, RegimeZone } from './types'

export function GeoboardShell() {
 const [mode, setMode] = useState<GeoboardMode>('STANDARD')
 const { payload, loading, fallback } = useGeoboardData(mode)
 const [hover, setHover] = useState<HoverState | null>(null)
 const [selectedId, setSelectedId] = useState<string | null>(null)
 const [pulseId, setPulseId] = useState<string | null>(null)
 const [focusTarget, setFocusTarget] = useState<{ lat: number; lon: number; zoom: number } | null>(null)

 const visibleFeed = useMemo(function () {
  return payload.feed.filter(function (item) { return item.geoboardModes.includes(mode) || mode === 'STANDARD' })
 }, [payload.feed, mode])

 const rankedFeed = useMemo(function () {
  return visibleFeed.slice().sort(function (left, right) { return right.ranking.rankScore - left.ranking.rankScore })
 }, [visibleFeed])

 const activeFeed = useMemo(function () {
  if (rankedFeed.length === 0) return null
  const selected = selectedId ? rankedFeed.find(function (item) { return item.id === selectedId }) : null
  return selected ? selected : rankedFeed[0]
 }, [rankedFeed, selectedId])

 useEffect(function () {
  if (!pulseId) return
  const timer = window.setTimeout(function () { setPulseId(null) }, 1800)
  return function () { window.clearTimeout(timer) }
 }, [pulseId])

 function focusRegion(zone: RegimeZone) {
  startTransition(function () {
   setFocusTarget({ lon: zone.center[0], lat: zone.center[1], zoom: zone.zoom })
  })
 }

 function focusFeed(item: FeedItem) {
  startTransition(function () {
   setSelectedId(item.id)
   setPulseId(item.sourceId)
   setFocusTarget({ lon: item.lon, lat: item.lat, zoom: item.sourceLayer === 'trade' ? 4.6 : item.sourceLayer === 'cb' ? 4.2 : 3.8 })
  })
 }

 const tickerItems = rankedFeed.slice(0, 10).map(function (item, index) {
  return '#' + String(index + 1) + ' ' + item.title.toUpperCase() + ' // ' + item.impactLine
 })

 const shellFallback = fallback || payload.modeState.fallback
 const liveLayers = payload.sourceStatus.filter(function (item) { return item.state === 'live' }).length
 const degradedLayers = payload.sourceStatus.filter(function (item) { return item.state === 'degraded' || item.state === 'fallback' }).length

 return <section className='geoboard-root grid h-screen grid-rows-[58px_minmax(0,1fr)_28px] bg-[#060a0f] text-[#c8d8e8]'>
  <header className='flex items-center justify-between border-b border-[#1a2535] bg-[#0a1018] px-4'>
   <div>
    <div className='text-[10px] uppercase tracking-[0.1em] text-[#7a9ab8]'>{'// B05 // GEOBOARD'}</div>
    <div className='mt-1 text-[12px] uppercase tracking-[0.12em] text-[#c8d8e8]'>{'GLOBAL MACRO AOR // ' + mode}</div>
   </div>
   <div className='flex flex-wrap items-center gap-1.5'>
    {(['STANDARD', 'RISK', 'LIQUIDITY', 'CENT.BANKS'] as GeoboardMode[]).map(function (item) {
     return <button key={item} type='button' onClick={function () { setMode(item) }} className={'rounded border px-2 py-1 text-[10px] uppercase tracking-[0.1em] transition ' + (mode === item ? 'border-[#22d3ee]/45 bg-[#22d3ee]/10 text-[#b8f3ff]' : 'border-[#1a2535] bg-[#060a0f] text-[#7a9ab8] hover:border-[#2b3c52] hover:text-[#b9d1ea]')}>
      {item}
     </button>
    })}
    <div className={'ml-1 flex items-center gap-2 rounded border px-2 py-1 text-[10px] uppercase tracking-[0.1em] ' + (shellFallback ? 'border-[#f43f5e]/35 text-[#fda4af]' : 'border-[#10b981]/35 text-[#6ee7b7]')}>
     <span className={'inline-block h-1.5 w-1.5 rounded-full ' + (shellFallback ? 'bg-[#f43f5e]' : 'bg-[#10b981] geoboard-pulse-dot')} />
     {shellFallback ? 'DEGRADED' : 'ONLINE'}
    </div>
    <div className='rounded border border-[#1a2535] bg-[#060a0f] px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-[#8aa7c4]'>
     {'L' + String(liveLayers) + ' / D' + String(degradedLayers)}
    </div>
   </div>
  </header>
  <div className='grid min-h-0 xl:grid-cols-[minmax(0,1fr)_340px]'>
   <div className='relative min-h-0'>
    {loading ? <div className='grid h-full place-items-center text-[11px] uppercase tracking-[0.12em] text-[#7a9ab8]'>LOADING GEOBOARD //</div> : null}
    <GeoboardMap mode={mode} gdeltEvents={payload.geoEvents} macroEvents={payload.macroEvents} centralBanks={payload.centralBanks} tradeRoutes={payload.tradeRoutes} zones={payload.regimeZones} pulseId={pulseId} selectedSourceId={activeFeed ? activeFeed.sourceId : null} focusTarget={focusTarget} onHoverChange={setHover} />
    <GeoboardPopup hover={hover} />
   </div>
   <GeoboardRightPanel zones={payload.regimeZones} feed={rankedFeed} selectedId={activeFeed ? activeFeed.id : null} modeState={payload.modeState} sourceStatus={payload.sourceStatus} onRegionSelect={focusRegion} onFeedSelect={focusFeed} />
  </div>
  <GeoboardTicker items={tickerItems} modeState={payload.modeState} sourceStatus={payload.sourceStatus} generatedAt={payload.generatedAt} />
 </section>
}
