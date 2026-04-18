import { GeoJsonLayer } from '@deck.gl/layers'

import type { RegimeZone } from '../types'

const COLORS: Record<string, [number, number, number, number]> = { 'RISK-ON': [16, 185, 129, 38], NEUTRAL: [245, 158, 11, 31], 'RISK-OFF': [244, 63, 94, 38] }

export function createRegimeLayer(data: any, zones: RegimeZone[], visible: boolean) {
 const regimes = Object.fromEntries(zones.map(function (zone) { return [zone.id, zone.regime] }))
 return new GeoJsonLayer({
 id: 'regime',
 data,
 filled: true,
 stroked: true,
 pickable: false,
 visible,
 opacity: 1,
 getFillColor: function (feature: { properties?: { regionId?: string } }) { const regime = feature.properties?.regionId ? regimes[feature.properties.regionId] : 'NEUTRAL'; return COLORS[regime ? regime : 'NEUTRAL'] },
 getLineColor: [26, 37, 53, 180],
 lineWidthMinPixels: 1,
 })
}