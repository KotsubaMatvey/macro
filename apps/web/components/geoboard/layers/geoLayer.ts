import { ScatterplotLayer } from 'deck.gl'

import type { GeoEvent } from '../types'

function toneColor(tone: number): [number, number, number, number] {
 if (tone <= -4) return [244, 63, 94, 235]
 if (tone < 1) return [245, 158, 11, 220]
 return [16, 185, 129, 220]
}

export function createGeoLayers(data: GeoEvent[], visible: boolean, pulseId?: string) {
 const glow = new ScatterplotLayer<GeoEvent>({ id: 'geo-glow', data, visible, pickable: false, getPosition: function (item) { return [item.lon, item.lat] }, getRadius: function (item) { return item.id === pulseId ? 780000 : 520000 }, getFillColor: function (item) { const color = toneColor(item.tone); return [color[0], color[1], color[2], 56] }, radiusMinPixels: 12 })
 const dots = new ScatterplotLayer<GeoEvent>({ id: 'geo', data, visible, pickable: true, getPosition: function (item) { return [item.lon, item.lat] }, getRadius: function (item) { return item.id === pulseId ? 260000 : 160000 }, getFillColor: function (item) { return toneColor(item.tone) }, radiusMinPixels: 4, radiusMaxPixels: 14 })
 return [glow, dots]
}
