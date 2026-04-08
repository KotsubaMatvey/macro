import { ScatterplotLayer, TextLayer } from 'deck.gl'

import type { MacroEvent } from '../types'

function label(item: MacroEvent) { return item.name.toUpperCase() + ' // ' + item.date.slice(5, 10) }

export function createMacroLayers(data: MacroEvent[], visible: boolean, pulseId?: string) {
 const dots = new ScatterplotLayer<MacroEvent>({ id: 'macro', data, visible, pickable: true, getPosition: function (item) { return [item.lon, item.lat] }, getRadius: function (item) { return item.id === pulseId ? 260000 : 180000 }, getFillColor: [167, 139, 250, 255], radiusMinPixels: 5, radiusMaxPixels: 16 })
 const labels = new TextLayer<MacroEvent>({ id: 'macro-labels', data, visible, pickable: false, getPosition: function (item) { return [item.lon, item.lat + 2] }, getText: label, getColor: [191, 174, 255, 255], getSize: 12, sizeMinPixels: 10, sizeMaxPixels: 13, getTextAnchor: 'middle', getAlignmentBaseline: 'bottom' })
 return [dots, labels]
}
