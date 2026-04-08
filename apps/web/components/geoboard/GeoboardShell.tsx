'use client'

import { startTransition, useEffect, useState } from 'react'

import { CENTRAL_BANKS, TRADE_ROUTES } from './data'
import { useGeoboardData } from './hooks/useGeoboardData'
import { GeoboardMap } from './GeoboardMap'
import { GeoboardPopup } from './GeoboardPopup'
import { GeoboardRightPanel } from './GeoboardRightPanel'
import { GeoboardTicker } from './GeoboardTicker'
import type { FeedItem, GeoboardMode, HoverState, RegimeZone } from './types'

function itemTime(value: string) { return value ? value : '2026-04-08T00:00:00+00:00' }

export function GeoboardShell() {
 const { gdeltEvents, macroEvents, regimeZones, loading, fallback } = useGeoboardData()
 const [mode, setMode] = useState<GeoboardMode>('STANDARD')
 const [hover, setHover] = useState<HoverState | null>(null)
 const [selectedId, setSelectedId] = useState<string | null>(null)
 const [pulseId, setPulseId] = useState<string | null>(null)
 const [focusTarget, setFocusTarget] = useState<{ lat: number; lon: number; zoom: number } | null>(null)
 useEffect(function () { if (!pulseId) return; const timer = window.setTimeout(function () { setPulseId(null) }, 1800); return function () { window.clearTimeout(timer) } }, [pulseId])
 const feed = gdeltEvents.slice(0, 8).map(function (item) { return { id: 'geo-' + item.id, type: 'GEO RISK', time: itemTime(item.date), title: item.title, impactLine: item.affectedAssets.join(' / '), lat: item.lat, lon: item.lon, sourceId: item.id, sourceLayer: 'geo' } }).concat(macroEvents.slice(0, 6).map(function (item) { return { id: 'macro-' + item.id, type: 'MACRO', time: itemTime(item.date), title: item.name.toUpperCase(), impactLine: item.relatedAssets.join(' / '), lat: item.lat, lon: item.lon, sourceId: item.id, sourceLayer: 'macro' } })).concat(CENTRAL_BANKS.slice(0, 4).map(function (item) { return { id: 'cb-' + item.id, type: 'CENT.BANK', time: item.nextMeeting + 'T00:00', title: item.name + ' // ' + item.bias, impactLine: item.signal, lat: item.lat, lon: item.lon, sourceId: item.id, sourceLayer: 'cb' } })).concat(TRADE_ROUTES.slice(0, 3).map(function (item) { const mid = item.path[Math.floor(item.path.length / 2)]; return { id: 'trade-' + item.id, type: 'TRADE', time: '2026-04-08T00:00', title: item.name, impactLine: item.impact.join(' / '), lat: mid[1], lon: mid[0], sourceId: item.id, sourceLayer: 'trade' } })) as FeedItem[]
 const tickerItems = gdeltEvents.slice(0, 5).map(function (item) { return item.title.toUpperCase() + ' // ' + item.affectedAssets.join(' / ') }).concat(macroEvents.slice(0, 4).map(function (item) { return item.name.toUpperCase() + ' ' + item.date.slice(5, 10) + ' // ' + item.relatedAssets.join(' / ') })).concat(TRADE_ROUTES.map(function (item) { return item.label + ' // ' + item.status }))
 function focusRegion(zone: RegimeZone) { startTransition(function () { setSelectedId(zone.id); setFocusTarget({ lon: zone.center[0], lat: zone.center[1], zoom: zone.zoom }) }) }
 function focusFeed(item: FeedItem) { startTransition(function () { setSelectedId(item.id); setPulseId(item.sourceId); setFocusTarget({ lon: item.lon, lat: item.lat, zoom: item.sourceLayer === 'trade' ? 4.6 : item.sourceLayer === 'cb' ? 4.2 : 3.8 }) }) }
 return <section className='geoboard-root grid h-screen grid-rows-[52px_minmax(0,1fr)_28px] bg-[#060a0f] text-[#c8d8e8]'><header className='flex items-center justify-between border-b border-[#1a2535] bg-[#0a1018] px-4'><div><div className='text-[10px] uppercase tracking-[0.1em] text-[#7a9ab8]'>{'// B05 // GEOBOARD'}</div><div className='mt-1 text-[12px] uppercase tracking-[0.12em] text-[#c8d8e8]'>{'GLOBAL MACRO AOR // ' + mode}</div></div><div className='flex items-center gap-2'>{(['STANDARD', 'RISK', 'LIQUIDITY', 'CENT.BANKS'] as GeoboardMode[]).map(function (item) { return <button key={item} type='button' onClick={function () { setMode(item) }} className={'border px-2 py-1 text-[10px] uppercase tracking-[0.1em] ' + (mode === item ? 'border-[#22d3ee]/45 bg-[#22d3ee]/10 text-[#b8f3ff]' : 'border-[#1a2535] bg-[#060a0f] text-[#7a9ab8]')}>{item}</button> })}<div className={'ml-2 flex items-center gap-2 border px-2 py-1 text-[10px] uppercase tracking-[0.1em] ' + (fallback ? 'border-[#f43f5e]/35 text-[#fda4af]' : 'border-[#10b981]/35 text-[#6ee7b7]')}><span className={'inline-block h-1.5 w-1.5 rounded-full ' + (fallback ? 'bg-[#f43f5e]' : 'bg-[#10b981] geoboard-pulse-dot')} />{fallback ? 'FALLBACK DATA' : 'ONLINE'}</div></div></header><div className='grid min-h-0 xl:grid-cols-[minmax(0,1fr)_280px]'><div className='relative min-h-0'>{loading ? <div className='grid h-full place-items-center text-[11px] uppercase tracking-[0.12em] text-[#7a9ab8]'>LOADING GEOBOARD //</div> : null}<GeoboardMap mode={mode} gdeltEvents={gdeltEvents} macroEvents={macroEvents} zones={regimeZones} pulseId={pulseId} focusTarget={focusTarget} onHoverChange={setHover} /><GeoboardPopup hover={hover} /></div><GeoboardRightPanel zones={regimeZones} feed={feed} selectedId={selectedId} fallback={fallback} onRegionSelect={focusRegion} onFeedSelect={focusFeed} /></div><GeoboardTicker items={tickerItems} fallback={fallback} /></section>
}
