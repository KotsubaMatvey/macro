'use client'

import { DeckGL, HeatmapLayer } from 'deck.gl'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'

import { createBasemapLayers } from './layers/baseLayer'
import { createCentralBankLayers } from './layers/cbLayer'
import { createGeoLayers } from './layers/geoLayer'
import { createMacroLayers } from './layers/macroLayer'
import { createRegimeLayer } from './layers/regimeLayer'
import { createTradeLayers } from './layers/tradeLayer'
import type { CentralBank, GeoEvent, GeoboardMode, HoverState, MacroEvent, RegimeZone, TradeRoute } from './types'

const INITIAL_VIEW = { longitude: 18, latitude: 22, zoom: 1.55, pitch: 0, bearing: 0 }

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
 const deferredEvents = useDeferredValue(props.gdeltEvents)
 const [geoData, setGeoData] = useState<any>(null)
 const [viewState, setViewState] = useState(INITIAL_VIEW)

 useEffect(function () {
  fetch('/geo/countries-110m.json')
   .then(function (response) { if (!response.ok) throw new Error('Geo JSON request failed: ' + String(response.status)); return response.json() })
   .then(setGeoData)
   .catch(function (error) { console.error('Geo JSON load failed', error); setGeoData(null) })
 }, [])

 useEffect(function () {
  if (props.mode !== 'CENT.BANKS') return
  const frame = window.requestAnimationFrame(function () { setViewState({ longitude: 15, latitude: 33, zoom: 1.75, pitch: 0, bearing: 0 }) })
  return function () { window.cancelAnimationFrame(frame) }
 }, [props.mode])

 useEffect(function () {
  if (!props.focusTarget) return
  const frame = window.requestAnimationFrame(function () {
   setViewState({ longitude: props.focusTarget ? props.focusTarget.lon : INITIAL_VIEW.longitude, latitude: props.focusTarget ? props.focusTarget.lat : INITIAL_VIEW.latitude, zoom: props.focusTarget ? props.focusTarget.zoom : INITIAL_VIEW.zoom, pitch: 0, bearing: 0 })
  })
  return function () { window.cancelAnimationFrame(frame) }
 }, [props.focusTarget])

 const baseLayers: any[] = [
  ...createBasemapLayers(),
  geoData ? createRegimeLayer(geoData, props.zones, props.mode === 'STANDARD' || props.mode === 'LIQUIDITY') : null,
  ...createCentralBankLayers(props.centralBanks, true, props.pulseId ? props.pulseId : undefined, props.selectedSourceId ? props.selectedSourceId : undefined),
  ...createGeoLayers(deferredEvents, props.mode !== 'CENT.BANKS', props.pulseId ? props.pulseId : undefined, props.selectedSourceId ? props.selectedSourceId : undefined),
  ...createTradeLayers(props.tradeRoutes, props.mode === 'STANDARD' || props.mode === 'RISK', props.pulseId ? props.pulseId : undefined, props.selectedSourceId ? props.selectedSourceId : undefined),
  ...createMacroLayers(props.macroEvents, props.mode === 'STANDARD' || props.mode === 'LIQUIDITY', props.pulseId ? props.pulseId : undefined, props.selectedSourceId ? props.selectedSourceId : undefined),
  new HeatmapLayer({ id: 'risk-heat', data: deferredEvents, visible: props.mode === 'RISK', getPosition: function (item: GeoEvent) { return [item.lon, item.lat] }, getWeight: function (item: GeoEvent) { return Math.abs(item.tone) }, radiusPixels: 50, colorRange: [[0, 0, 0, 0], [245, 158, 11, 155], [244, 63, 94, 225]] }),
  new HeatmapLayer({ id: 'liq-heat', data: props.centralBanks, visible: props.mode === 'LIQUIDITY', getPosition: function (item: CentralBank) { return [item.lon, item.lat] }, getWeight: function (item: CentralBank) { return item.liquidityWeight }, radiusPixels: 55, colorRange: [[0, 0, 0, 0], [34, 211, 238, 118], [16, 185, 129, 198]] }),
 ].filter(Boolean)

 const layers = props.mode === 'CENT.BANKS' ? baseLayers.filter(function (layer: any) { return String(layer.id).startsWith('cb') || String(layer.id) === 'basemap-land' || String(layer.id) === 'basemap-borders' || String(layer.id) === 'basemap-grid' || String(layer.id) === 'basemap-labels' }) : baseLayers

 const counts = useMemo(function () {
  return {
   geo: props.gdeltEvents.length,
   macro: props.macroEvents.length,
   cb: props.centralBanks.length,
   trade: props.tradeRoutes.length,
  }
 }, [props.centralBanks.length, props.gdeltEvents.length, props.macroEvents.length, props.tradeRoutes.length])

 return <div className='relative h-full w-full bg-[#060a0f]'>
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
  <DeckGL style={{ position: 'absolute', inset: '0' }} viewState={viewState} controller layers={layers} onViewStateChange={function (params: any) { setViewState(params.viewState) }} onHover={function (info: any) { if (!info.object || !info.layer) { props.onHoverChange(null); return } const id = layerName(String(info.layer.id)); if (!id) { props.onHoverChange(null); return } props.onHoverChange({ layer: id as HoverState['layer'], x: info.x, y: info.y, object: info.object } as HoverState) }}></DeckGL>
 </div>
}
