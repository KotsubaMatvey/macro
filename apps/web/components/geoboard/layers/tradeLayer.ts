import { IconLayer, PathLayer, TextLayer } from 'deck.gl'

import type { TradeRoute } from '../types'

export function createTradeLayers(data: TradeRoute[], visible: boolean, pulseId?: string, selectedId?: string) {
 const markers = data.map(function (route) {
  const mid = route.path[Math.floor(route.path.length / 2)]
  return { ...route, lon: mid[0], lat: mid[1] }
 })

 const pathLayer = new PathLayer<TradeRoute>({
  id: 'trade',
  data,
  visible,
  pickable: true,
  getPath: function (item) { return item.path },
  getColor: function (item) {
   if (item.id === selectedId || item.id === pulseId) return [252, 211, 107, 190]
   return [245, 158, 11, 128]
  },
  widthMinPixels: 1,
  widthMaxPixels: 5,
 })

 const iconLayer = new IconLayer<{ id: string; lon: number; lat: number }>({
  id: 'trade-icons',
  data: markers,
  visible,
  pickable: true,
  getPosition: function (item) { return [item.lon, item.lat] },
  getSize: function (item) {
   if (item.id === pulseId) return 36
   if (item.id === selectedId) return 30
   return 24
  },
  sizeUnits: 'pixels',
  getIcon: function () {
   return { url: '/icons/geoboard-chokepoint.svg', width: 32, height: 32, anchorY: 16 }
  },
 })

 const textLayer = new TextLayer<{ id: string; label: string; lon: number; lat: number }>({
  id: 'trade-labels',
  data: markers,
  visible,
  pickable: false,
  getPosition: function (item) { return [item.lon, item.lat + 1.5] },
  getText: function (item) { return item.label },
  getColor: function (item) {
   if (item.id === selectedId || item.id === pulseId) return [255, 224, 162, 245]
   return [245, 190, 84, 230]
  },
  getSize: 12,
  sizeMinPixels: 10,
  getTextAnchor: 'middle',
  getAlignmentBaseline: 'bottom',
 })

 return [pathLayer, iconLayer, textLayer]
}
