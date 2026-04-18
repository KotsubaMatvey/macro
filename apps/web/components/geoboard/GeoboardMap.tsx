'use client'

import { useMemo, useState, useEffect } from 'react'

import type { CentralBank, GeoEvent, GeoboardMode, HoverState, MacroEvent, RegimeZone, TradeRoute } from './types'

const WIDTH = 1200
const HEIGHT = 620

function layerName(id: string) {
 if (id.startsWith('cb')) return 'cb'
 if (id.startsWith('geo')) return 'geo'
 if (id.startsWith('trade')) return 'trade'
 if (id.startsWith('macro')) return 'macro'
 return null
}

function modeHint(mode: GeoboardMode) {
 if (mode === 'RISK') return 'Risk concentration mode: geo and chokepoint layers emphasized.'
 if (mode === 'LIQUIDITY') return 'Liquidity mode: central-bank and macro catalyst layers prioritized.'
 if (mode === 'CENT.BANKS') return 'Central-bank mode: policy node network and liquidity signaling.'
 return 'Standard mode: blended macro, geo, trade, and policy context.'
}

function project(lon: number, lat: number) {
 const x = ((lon + 180) / 360) * WIDTH
 const y = ((90 - lat) / 180) * HEIGHT
 return [x, y] as const
}

function polygonPath(coords: number[][]) {
 if (!coords || coords.length === 0) return ''
 return coords.map(function (point, index) {
  const projected = project(point[0], point[1])
  return (index === 0 ? 'M' : 'L') + projected[0].toFixed(2) + ' ' + projected[1].toFixed(2)
 }).join(' ') + ' Z'
}

function featurePath(feature: any) {
 if (!feature || !feature.geometry) return ''
 if (feature.geometry.type === 'Polygon') {
  return feature.geometry.coordinates.map(function (ring: number[][]) { return polygonPath(ring) }).join(' ')
 }
 if (feature.geometry.type === 'MultiPolygon') {
  return feature.geometry.coordinates.map(function (polygon: number[][][]) {
   return polygon.map(function (ring: number[][]) { return polygonPath(ring) }).join(' ')
  }).join(' ')
 }
 return ''
}

function regimeFill(regime: string | undefined) {
 if (regime === 'RISK-ON') return 'rgba(16,185,129,0.22)'
 if (regime === 'RISK-OFF') return 'rgba(244,63,94,0.22)'
 return 'rgba(245,158,11,0.18)'
}

function toneFill(tone: number) {
 if (tone <= -4) return '#f43f5e'
 if (tone < 1) return '#f59e0b'
 return '#10b981'
}

export function GeoboardMap(props: {
 mode: GeoboardMode
 gdeltEvents: GeoEvent[]
 macroEvents: MacroEvent[]
 centralBanks: CentralBank[]
 tradeRoutes: TradeRoute[]
 zones: RegimeZone[]
 pulseId: string | null
 selectedSourceId: string | null
 focusTarget: { lat: number; lon: number; zoom: number } | null
 onHoverChange: (hover: HoverState | null) => void
}) {
 const [geoData, setGeoData] = useState<any>(null)

 useEffect(function () {
  fetch('/geo/countries-110m.json')
   .then(function (response) { if (!response.ok) throw new Error('Geo JSON request failed: ' + String(response.status)); return response.json() })
   .then(setGeoData)
   .catch(function (error) { console.error('Geo JSON load failed', error); setGeoData(null) })
 }, [])

 const visible = useMemo(function () {
  const geo = props.mode !== 'CENT.BANKS' ? props.gdeltEvents : []
  const macro = props.mode === 'STANDARD' || props.mode === 'LIQUIDITY' ? props.macroEvents : []
  const trade = props.mode === 'STANDARD' || props.mode === 'RISK' ? props.tradeRoutes : []
  const zones = props.mode === 'STANDARD' || props.mode === 'LIQUIDITY' ? props.zones : []
  const cb = props.centralBanks
  return { geo, macro, trade, zones, cb }
 }, [props.centralBanks, props.gdeltEvents, props.macroEvents, props.mode, props.tradeRoutes, props.zones])

 const regimeById = useMemo(function () {
  return Object.fromEntries(visible.zones.map(function (zone) { return [zone.id, zone.regime] })) as Record<string, string>
 }, [visible.zones])

 const counts = useMemo(function () {
  return {
   geo: props.gdeltEvents.length,
   macro: props.macroEvents.length,
   cb: props.centralBanks.length,
   trade: props.tradeRoutes.length,
  }
 }, [props.centralBanks.length, props.gdeltEvents.length, props.macroEvents.length, props.tradeRoutes.length])

 const focus = props.focusTarget ? project(props.focusTarget.lon, props.focusTarget.lat) : null

 return <div className='relative h-full w-full bg-[#060a0f]' onMouseLeave={function () { props.onHoverChange(null) }}>
  <div className='pointer-events-none absolute left-3 top-3 z-10 max-w-[380px] rounded border border-[#1a2535] bg-[rgba(6,10,15,0.84)] px-3 py-2 text-[10px] uppercase tracking-[0.1em] text-[#8aa7c4]'>
   <div className='flex flex-wrap items-center gap-1.5'>
    <span className='text-[#c8d8e8]'>{props.mode}</span>
    <span>{'G' + String(counts.geo)}</span>
    <span>{'M' + String(counts.macro)}</span>
    <span>{'CB' + String(counts.cb)}</span>
    <span>{'TR' + String(counts.trade)}</span>
   </div>
   <div className='mt-1 text-[9px] leading-4 text-[#6d8bab]'>{modeHint(props.mode)}</div>
  </div>
  <svg viewBox={'0 0 ' + String(WIDTH) + ' ' + String(HEIGHT)} className='absolute inset-0 h-full w-full'>
   <rect x='0' y='0' width={String(WIDTH)} height={String(HEIGHT)} fill='#060a0f' />
   <g stroke='rgba(24,38,54,0.9)' strokeWidth='1'>
    {Array.from({ length: 11 }).map(function (_, index) {
     const x = (WIDTH / 10) * index
     return <line key={'grid-v-' + String(index)} x1={String(x)} y1='0' x2={String(x)} y2={String(HEIGHT)} />
    })}
    {Array.from({ length: 7 }).map(function (_, index) {
     const y = (HEIGHT / 6) * index
     return <line key={'grid-h-' + String(index)} x1='0' y1={String(y)} x2={String(WIDTH)} y2={String(y)} />
    })}
   </g>
   <g>
    {geoData && Array.isArray(geoData.features) ? geoData.features.map(function (feature: any, index: number) {
     const regionId = feature?.properties?.regionId
     const regime = regionId ? regimeById[String(regionId)] : undefined
     return <path key={'region-' + String(index)} d={featurePath(feature)} fill={regimeFill(regime)} stroke='rgba(34,54,78,0.95)' strokeWidth='1.2' />
    }) : null}
   </g>
   <g fill='none' stroke='#f59e0b' strokeOpacity='0.62' strokeWidth='2'>
    {visible.trade.map(function (route, index) {
     const points = route.path.map(function (point) {
      const projected = project(point[0], point[1])
      return projected[0].toFixed(2) + ',' + projected[1].toFixed(2)
     }).join(' ')
     const selected = route.id === props.selectedSourceId || route.id === props.pulseId
     return <polyline key={'trade-line-' + route.id + '-' + String(index)} points={points} stroke={selected ? '#fcd34d' : '#f59e0b'} strokeWidth={selected ? '3' : '2'} onMouseMove={function (event) { props.onHoverChange({ layer: 'trade', x: event.clientX, y: event.clientY, object: route }) }} />
    })}
   </g>
   <g>
    {visible.geo.map(function (item, index) {
     const projected = project(item.lon, item.lat)
     const selected = item.id === props.selectedSourceId || item.id === props.pulseId
     return <circle key={'geo-dot-' + item.id + '-' + String(index)} cx={String(projected[0])} cy={String(projected[1])} r={selected ? '7' : '5'} fill={toneFill(item.tone)} stroke={selected ? '#ecf4ff' : '#0c121c'} strokeWidth='1.5' onMouseMove={function (event) { props.onHoverChange({ layer: 'geo', x: event.clientX, y: event.clientY, object: item }) }} />
    })}
   </g>
   <g>
    {visible.macro.map(function (item, index) {
     const projected = project(item.lon, item.lat)
     const selected = item.id === props.selectedSourceId || item.id === props.pulseId
     return <rect key={'macro-dot-' + item.id + '-' + String(index)} x={String(projected[0] - (selected ? 6 : 5))} y={String(projected[1] - (selected ? 6 : 5))} width={String(selected ? 12 : 10)} height={String(selected ? 12 : 10)} fill={selected ? '#cab4ff' : '#a78bfa'} stroke={selected ? '#ecf4ff' : '#221237'} strokeWidth='1.2' transform={'rotate(45 ' + String(projected[0]) + ' ' + String(projected[1]) + ')'} onMouseMove={function (event) { props.onHoverChange({ layer: 'macro', x: event.clientX, y: event.clientY, object: item }) }} />
    })}
   </g>
   <g>
    {visible.cb.map(function (item, index) {
     const projected = project(item.lon, item.lat)
     const selected = item.id === props.selectedSourceId || item.id === props.pulseId
     return <circle key={'cb-dot-' + item.id + '-' + String(index)} cx={String(projected[0])} cy={String(projected[1])} r={selected ? '8' : '6'} fill={selected ? '#4be2f5' : '#22d3ee'} stroke={selected ? '#eaf8ff' : '#0d2f38'} strokeWidth='1.5' onMouseMove={function (event) { props.onHoverChange({ layer: 'cb', x: event.clientX, y: event.clientY, object: item }) }} />
    })}
   </g>
   {focus ? <g>
    <circle cx={String(focus[0])} cy={String(focus[1])} r='12' fill='none' stroke='rgba(236,244,255,0.85)' strokeWidth='1.4' />
    <line x1={String(focus[0] - 20)} y1={String(focus[1])} x2={String(focus[0] + 20)} y2={String(focus[1])} stroke='rgba(236,244,255,0.65)' strokeWidth='1' />
    <line x1={String(focus[0])} y1={String(focus[1] - 20)} x2={String(focus[0])} y2={String(focus[1] + 20)} stroke='rgba(236,244,255,0.65)' strokeWidth='1' />
   </g> : null}
  </svg>
 </div>
}