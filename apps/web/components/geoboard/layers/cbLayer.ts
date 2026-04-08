import { ScatterplotLayer, TextLayer } from 'deck.gl'

import type { CentralBank } from '../types'

export function createCentralBankLayers(data: CentralBank[], visible: boolean, pulseId?: string) {
 const dots = new ScatterplotLayer<CentralBank>({ id: 'cb', data, visible, pickable: true, getPosition: function (item) { return [item.lon, item.lat] }, getRadius: function (item) { return item.id === pulseId ? 320000 : 220000 }, getFillColor: [34, 211, 238, 255], radiusMinPixels: 5, radiusMaxPixels: 18 })
 const labels = new TextLayer<CentralBank>({ id: 'cb-labels', data, visible, pickable: false, getPosition: function (item) { return [item.lon, item.lat + 2.4] }, getText: function (item) { return item.name }, getColor: [130, 226, 245, 255], getSize: 13, sizeMinPixels: 10, sizeMaxPixels: 14, getTextAnchor: 'middle', getAlignmentBaseline: 'bottom' })
 return [dots, labels]
}
