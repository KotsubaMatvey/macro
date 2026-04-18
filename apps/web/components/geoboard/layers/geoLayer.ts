import { ScatterplotLayer } from '@deck.gl/layers'

import type { GeoEvent } from '../types'

function toneColor(tone: number): [number, number, number, number] {
 if (tone <= -4) return [244, 63, 94, 235]
 if (tone < 1) return [245, 158, 11, 220]
 return [16, 185, 129, 220]
}

export function createGeoLayers(data: GeoEvent[], visible: boolean, pulseId?: string, selectedId?: string) {
 const glow = new ScatterplotLayer<GeoEvent>({
  id: 'geo-glow',
  data,
  visible,
  pickable: false,
  getPosition: function (item) { return [item.lon, item.lat] },
  getRadius: function (item) {
   if (item.id === pulseId) return 820000
   if (item.id === selectedId) return 650000
   return 500000
  },
  getFillColor: function (item) {
   const color = toneColor(item.tone)
   const alpha = item.id === selectedId || item.id === pulseId ? 80 : 52
   return [color[0], color[1], color[2], alpha]
  },
  radiusMinPixels: 12,
 })
 const dots = new ScatterplotLayer<GeoEvent>({
  id: 'geo',
  data,
  visible,
  pickable: true,
  stroked: true,
  getPosition: function (item) { return [item.lon, item.lat] },
  getRadius: function (item) {
   if (item.id === pulseId) return 280000
   if (item.id === selectedId) return 220000
   return 155000
  },
  getFillColor: function (item) {
   const color = toneColor(item.tone)
   if (item.id === selectedId || item.id === pulseId) return [color[0], color[1], color[2], 255]
   return color
  },
  getLineColor: function (item) {
   if (item.id === selectedId || item.id === pulseId) return [236, 244, 255, 235]
   return [12, 18, 28, 220]
  },
  lineWidthMinPixels: 1,
  radiusMinPixels: 4,
  radiusMaxPixels: 15,
 })
 return [glow, dots]
}