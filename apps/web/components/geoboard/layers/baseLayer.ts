import { GeoJsonLayer, PathLayer, TextLayer } from 'deck.gl'
import countries110m from 'world-atlas/countries-110m.json'
import { feature } from 'topojson-client'

interface GridPath { id: string; path: [number, number][]; emphasis?: boolean }
interface TacticalLabel { text: string; position: [number, number]; size: number; emphasis?: boolean }

const atlas = countries110m as any
const LAND = feature(atlas, atlas.objects.land) as any
const COUNTRIES = feature(atlas, atlas.objects.countries) as any
const LABELS = [
 { text: 'N. AMERICA', position: [-108, 46], size: 14, emphasis: true },
 { text: 'S. AMERICA', position: [-61, -17], size: 14 },
 { text: 'EUROPE', position: [18, 53], size: 13, emphasis: true },
 { text: 'AFRICA', position: [20, 6], size: 13 },
 { text: 'MIDDLE EAST', position: [47, 27], size: 12, emphasis: true },
 { text: 'SOUTH ASIA', position: [79, 21], size: 12 },
 { text: 'EAST ASIA', position: [115, 36], size: 13, emphasis: true },
 { text: 'OCEANIA', position: [134, -24], size: 12 },
 { text: 'ATLANTIC', position: [-33, 12], size: 11 },
 { text: 'INDIAN OCEAN', position: [79, -18], size: 11 },
] as TacticalLabel[]
const GRID_PATHS = buildGridPaths()

function buildGridPaths() {
 const lines = [] as GridPath[]
 for (let lon = -150; lon <= 150; lon += 30) { lines.push({ id: 'lon-' + lon, path: [[lon, -70], [lon, 80]], emphasis: lon === 0 }) }
 for (let lat = -60; lat <= 60; lat += 20) { lines.push({ id: 'lat-' + lat, path: [[-180, lat], [180, lat]], emphasis: lat === 0 }) }
 return lines
}

export function createBasemapLayers() {
 return [
  new GeoJsonLayer({ id: 'basemap-land', data: LAND, pickable: false, stroked: false, filled: true, getFillColor: [10, 16, 24, 225] }),
  new GeoJsonLayer({ id: 'basemap-borders', data: COUNTRIES, pickable: false, stroked: true, filled: false, lineWidthMinPixels: 1, getLineColor: [26, 37, 53, 220] }),
  new PathLayer({ id: 'basemap-grid', data: GRID_PATHS, pickable: false, getPath: function (item: GridPath) { return item.path }, getColor: function (item: GridPath) { return item.emphasis ? [49, 79, 107, 148] : [24, 38, 54, 105] }, widthMinPixels: 1 }),
  new TextLayer({ id: 'basemap-labels', data: LABELS, pickable: false, getPosition: function (item: TacticalLabel) { return item.position }, getText: function (item: TacticalLabel) { return item.text }, getColor: function (item: TacticalLabel) { return item.emphasis ? [200, 216, 232, 168] : [122, 154, 184, 148] }, getSize: function (item: TacticalLabel) { return item.size }, sizeUnits: 'pixels', fontFamily: 'JetBrains Mono, IBM Plex Mono, monospace', getTextAnchor: 'middle', getAlignmentBaseline: 'center' }),
 ]
}
