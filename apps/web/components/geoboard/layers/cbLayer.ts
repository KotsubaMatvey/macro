import { ScatterplotLayer, TextLayer } from '@deck.gl/layers'

import type { CentralBank } from '../types'

export function createCentralBankLayers(data: CentralBank[], visible: boolean, pulseId?: string, selectedId?: string) {
 const dots = new ScatterplotLayer<CentralBank>({
  id: 'cb',
  data,
  visible,
  pickable: true,
  stroked: true,
  getPosition: function (item) { return [item.lon, item.lat] },
  getRadius: function (item) {
   if (item.id === pulseId) return 340000
   if (item.id === selectedId) return 280000
   return 220000
  },
  getFillColor: function (item) {
   if (item.id === selectedId || item.id === pulseId) return [75, 226, 245, 255]
   return [34, 211, 238, 240]
  },
  getLineColor: function (item) {
   if (item.id === selectedId || item.id === pulseId) return [234, 248, 255, 235]
   return [15, 47, 56, 215]
  },
  lineWidthMinPixels: 1,
  radiusMinPixels: 5,
  radiusMaxPixels: 18,
 })
 const labels = new TextLayer<CentralBank>({
  id: 'cb-labels',
  data,
  visible,
  pickable: false,
  getPosition: function (item) { return [item.lon, item.lat + 2.4] },
  getText: function (item) { return item.name },
  getColor: function (item) {
   if (item.id === selectedId || item.id === pulseId) return [219, 246, 255, 240]
   return [130, 226, 245, 232]
  },
  getSize: 13,
  sizeMinPixels: 10,
  sizeMaxPixels: 14,
  getTextAnchor: 'middle',
  getAlignmentBaseline: 'bottom',
 })
 return [dots, labels]
}