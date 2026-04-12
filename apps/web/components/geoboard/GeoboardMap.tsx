'use client'

import { DeckGL, HeatmapLayer } from 'deck.gl'
import { useDeferredValue, useEffect, useState } from 'react'
import { createBasemapLayers } from './layers/baseLayer'

import { CENTRAL_BANKS, TRADE_ROUTES } from './data'
import { createCentralBankLayers } from './layers/cbLayer'
import { createGeoLayers } from './layers/geoLayer'
import { createMacroLayers } from './layers/macroLayer'
import { createRegimeLayer } from './layers/regimeLayer'
import { createTradeLayers } from './layers/tradeLayer'
import type { GeoboardMode, HoverState, RegimeZone } from './types'

const INITIAL_VIEW = { longitude: 18, latitude: 22, zoom: 1.55, pitch: 0, bearing: 0 }

function layerName(id: string) { if (id.startsWith('cb')) return 'cb'; if (id.startsWith('geo')) return 'geo'; if (id.startsWith('trade')) return 'trade'; if (id.startsWith('macro')) return 'macro'; return null }

export function GeoboardMap(props: { mode: GeoboardMode; gdeltEvents: any[]; macroEvents: any[]; zones: RegimeZone[]; pulseId: string | null; focusTarget: { lat: number; lon: number; zoom: number } | null; onHoverChange: (hover: HoverState | null) => void }) {
 const deferredEvents = useDeferredValue(props.gdeltEvents)
 const [geoData, setGeoData] = useState<any>(null)
 const [viewState, setViewState] = useState(INITIAL_VIEW)
 useEffect(function () { fetch('/geo/countries-110m.json').then(function (response) { if (!response.ok) throw new Error('Geo JSON request failed: ' + String(response.status)); return response.json() }).then(setGeoData).catch(function (error) { console.error('Geo JSON load failed', error); setGeoData(null) }) }, [])
 useEffect(function () { if (props.mode !== 'CENT.BANKS') return; const frame = window.requestAnimationFrame(function () { setViewState({ longitude: 15, latitude: 33, zoom: 1.75, pitch: 0, bearing: 0 }) }); return function () { window.cancelAnimationFrame(frame) } }, [props.mode])
 useEffect(function () { if (!props.focusTarget) return; const frame = window.requestAnimationFrame(function () { setViewState({ longitude: props.focusTarget ? props.focusTarget.lon : INITIAL_VIEW.longitude, latitude: props.focusTarget ? props.focusTarget.lat : INITIAL_VIEW.latitude, zoom: props.focusTarget ? props.focusTarget.zoom : INITIAL_VIEW.zoom, pitch: 0, bearing: 0 }) }); return function () { window.cancelAnimationFrame(frame) } }, [props.focusTarget])
 const baseLayers: any[] = [
 ...createBasemapLayers(),
 geoData ? createRegimeLayer(geoData, props.zones, props.mode === 'STANDARD' || props.mode === 'LIQUIDITY') : null,
 ...createCentralBankLayers(CENTRAL_BANKS, true, props.pulseId ? props.pulseId : undefined),
 ...createGeoLayers(deferredEvents, props.mode !== 'CENT.BANKS', props.pulseId ? props.pulseId : undefined),
 ...createTradeLayers(TRADE_ROUTES, props.mode === 'STANDARD' || props.mode === 'RISK', props.pulseId ? props.pulseId : undefined),
 ...createMacroLayers(props.macroEvents, props.mode === 'STANDARD' || props.mode === 'LIQUIDITY', props.pulseId ? props.pulseId : undefined),
 new HeatmapLayer({ id: 'risk-heat', data: deferredEvents, visible: props.mode === 'RISK', getPosition: function (item: any) { return [item.lon, item.lat] }, getWeight: function (item: any) { return Math.abs(item.tone) }, radiusPixels: 50, colorRange: [[0, 0, 0, 0], [245, 158, 11, 160], [244, 63, 94, 230]] }),
 new HeatmapLayer({ id: 'liq-heat', data: CENTRAL_BANKS, visible: props.mode === 'LIQUIDITY', getPosition: function (item: any) { return [item.lon, item.lat] }, getWeight: function (item: any) { return item.liquidityWeight }, radiusPixels: 55, colorRange: [[0, 0, 0, 0], [34, 211, 238, 120], [16, 185, 129, 205]] }),
 ].filter(Boolean)
 const layers = props.mode === 'CENT.BANKS' ? baseLayers.filter(function (layer: any) { return String(layer.id).startsWith('cb') }) : baseLayers
 return <div className='relative h-full w-full bg-[#060a0f]'><DeckGL style={{ position: 'absolute', inset: '0' }} viewState={viewState} controller layers={layers} onViewStateChange={function (params: any) { setViewState(params.viewState) }} onHover={function (info: any) { if (!info.object || !info.layer) { props.onHoverChange(null); return } const id = layerName(String(info.layer.id)); if (!id) { props.onHoverChange(null); return } props.onHoverChange({ layer: id as HoverState['layer'], x: info.x, y: info.y, object: info.object } as HoverState) }}></DeckGL></div>
}
