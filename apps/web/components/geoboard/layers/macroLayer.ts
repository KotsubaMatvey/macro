import { ScatterplotLayer, TextLayer } from 'deck.gl'

import type { MacroEvent } from '../types'

function label(item: MacroEvent) { return item.name.toUpperCase() + ' // ' + item.date.slice(5, 10) }

export function createMacroLayers(data: MacroEvent[], visible: boolean, pulseId?: string, selectedId?: string) {
 const dots = new ScatterplotLayer<MacroEvent>({
  id: 'macro',
  data,
  visible,
  pickable: true,
  stroked: true,
  getPosition: function (item) { return [item.lon, item.lat] },
  getRadius: function (item) {
   if (item.id === pulseId) return 290000
   if (item.id === selectedId) return 230000
   return 180000
  },
  getFillColor: function (item) {
   if (item.id === selectedId || item.id === pulseId) return [186, 164, 255, 255]
   return [167, 139, 250, 235]
  },
  getLineColor: function (item) {
   if (item.id === selectedId || item.id === pulseId) return [236, 244, 255, 220]
   return [28, 18, 50, 210]
  },
  lineWidthMinPixels: 1,
  radiusMinPixels: 5,
  radiusMaxPixels: 16,
 })
 const labels = new TextLayer<MacroEvent>({
  id: 'macro-labels',
  data,
  visible,
  pickable: false,
  getPosition: function (item) { return [item.lon, item.lat + 2] },
  getText: label,
  getColor: function (item) {
   if (item.id === selectedId || item.id === pulseId) return [225, 216, 255, 245]
   return [191, 174, 255, 228]
  },
  getSize: 12,
  sizeMinPixels: 10,
  sizeMaxPixels: 13,
  getTextAnchor: 'middle',
  getAlignmentBaseline: 'bottom',
 })
 return [dots, labels]
}
