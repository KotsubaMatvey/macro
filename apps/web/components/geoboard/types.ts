export type GeoboardMode = 'STANDARD' | 'RISK' | 'LIQUIDITY' | 'CENT.BANKS'

export interface GeoEvent {
 id: string
 title: string
 source: string
 lat: number
 lon: number
 tone: number
 date: string
 url: string
 affectedAssets: string[]
 mode: string
}

export interface CentralBank {
 id: string
 name: string
 lat: number
 lon: number
 rate: string
 nextMeeting: string
 bias: string
 signal: string
 liquidityWeight: number
}

export interface MacroEvent {
 id: string
 name: string
 country: string
 countryCode: string
 lat: number
 lon: number
 date: string
 forecast: number | null
 previous: number | null
 impactLevel: string
 expectedReaction: string
 relatedAssets: string[]
 mode: string
}

export interface TradeRoute {
 id: string
 name: string
 label: string
 path: [number, number][]
 status: string
 volume: string
 riskLevel: string
 impact: string[]
}

export interface RegimeZone {
 id: 'USA' | 'EUROPE' | 'CHINA' | 'EM'
 label: string
 flag: string
 regime: 'RISK-ON' | 'NEUTRAL' | 'RISK-OFF'
 confidence: number
 center: [number, number]
 zoom: number
}

export type HoverState =
 | { layer: 'cb'; x: number; y: number; object: CentralBank }
 | { layer: 'geo'; x: number; y: number; object: GeoEvent }
 | { layer: 'trade'; x: number; y: number; object: TradeRoute }
 | { layer: 'macro'; x: number; y: number; object: MacroEvent }

export interface FeedItem {
 id: string
 type: 'GEO RISK' | 'CENT.BANK' | 'TRADE' | 'MACRO'
 time: string
 title: string
 impactLine: string
 lat: number
 lon: number
 sourceId: string
 sourceLayer: 'cb' | 'geo' | 'trade' | 'macro'
}
