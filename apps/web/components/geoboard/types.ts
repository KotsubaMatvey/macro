export type GeoboardMode = 'STANDARD' | 'RISK' | 'LIQUIDITY' | 'CENT.BANKS'

export type GeoboardSourceType = 'official' | 'discovery' | 'derived' | 'static' | 'fallback'
export type GeoboardSourceTier = 'primary' | 'secondary'
export type GeoboardRuntimeMode = 'live' | 'demo' | 'fallback' | 'static' | 'derived'
export type GeoboardFreshness = 'fresh' | 'aging' | 'stale' | 'degraded'

export interface GeoboardSourceMetadata {
 providerKey: string
 label: string
 sourceType: GeoboardSourceType
 sourceTier: GeoboardSourceTier
 mode: GeoboardRuntimeMode
 freshness: GeoboardFreshness
 note: string
 sourceUrl?: string | null
 fetchedAt?: string | null
 lastUpdated?: string | null
}

export interface GeoboardRankingMetadata {
 rankScore: number
 urgencyScore: number
 importanceScore: number
 confidenceScore: number
 marketRelevanceScore: number
 deskRelevanceScore: number
 recencyScore: number
 sourceQualityScore: number
 watchlistOverlapScore: number
 catalystProximityScore: number
 regionSignificanceScore: number
 regimeRelevanceScore: number
 componentScores: Record<string, number>
 rationale: string[]
}

export interface GeoboardEvaluation {
 surface: string
 signalType: string
 signalRef: string
 sampleSize: number
 coverage?: number
 directionAccuracy?: number
 magnitudeError?: number
 falsePositiveRate?: number
 calibrationQuality?: number
 rankingUsefulness?: number
 sourceQualityAlignment?: number
 mode: string
 note: string
}

export interface GeoboardIntelligence {
 source: string
 sourceType: string
 sourceUrl?: string | null
 sourceTier: string
 mode: string
 freshness: GeoboardFreshness
 importance: number
 urgency: number
 confidence: number
 marketRelevance: number
 deskRelevance: number
 rankScore: number
 scoreRationale: string[]
 scoreComponents: Record<string, number>
 linkedAssets?: string[]
 linkedEvents?: string[]
 linkedRegions?: string[]
 linkedNews?: string[]
 linkedReports?: string[]
 linkedReactions?: string[]
 derivedFrom?: string[]
 fallbackReason?: string
 evaluation: GeoboardEvaluation
}

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
 classification: string
 regionCode: string
 regionGroup: string
 countryCode: string
 country: string
 locationPrecision: string
 linkedEventId?: string | null
 linkedEventSlug?: string | null
 relatedNewsClusterIds: string[]
 relatedNewsIds: string[]
 whyItMatters: string
 geoboardModes: GeoboardMode[]
 sourceMeta: GeoboardSourceMetadata
 ranking: GeoboardRankingMetadata
 intelligence?: GeoboardIntelligence
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
 family: string
 category: string
 regionCode: string
 regionGroup: string
 linkedEventId?: string | null
 linkedEventSlug?: string | null
 linkedReactionPath?: string | null
 linkedCalendarPath?: string | null
 linkedBiasPath?: string | null
 linkedReportsPath?: string | null
 linkedNewsPath?: string | null
 horizonTag: 'today' | 'next_24h' | 'next_7d' | 'later'
 hoursToEvent: number | null
 whyItMatters: string
 geoboardModes: GeoboardMode[]
 relatedNewsClusterIds: string[]
 relatedNewsIds: string[]
 sourceMeta: GeoboardSourceMetadata
 ranking: GeoboardRankingMetadata
 intelligence?: GeoboardIntelligence
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
 country: string
 countryCode: string
 regionCode: string
 regionGroup: string
 linkedEventId?: string | null
 linkedEventSlug?: string | null
 linkedEventPath?: string | null
 linkedNewsPath?: string | null
 linkedReactionPath?: string | null
 linkedBiasPath?: string | null
 relatedAssets: string[]
 relatedNewsClusterIds: string[]
 whyItMatters: string
 geoboardModes: GeoboardMode[]
 sourceMeta: GeoboardSourceMetadata
 ranking: GeoboardRankingMetadata
 intelligence?: GeoboardIntelligence
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
 lat: number
 lon: number
 regionCode: string
 regionGroup: string
 linkedGeoEventIds: string[]
 relatedNewsClusterIds: string[]
 linkedNewsPath?: string | null
 linkedAlertsPath?: string | null
 whyItMatters: string
 geoboardModes: GeoboardMode[]
 sourceMeta: GeoboardSourceMetadata
 ranking: GeoboardRankingMetadata
 intelligence?: GeoboardIntelligence
}

export interface RegimeZone {
 id: 'USA' | 'EUROPE' | 'CHINA' | 'EM'
 label: string
 flag: string
 regime: 'RISK-ON' | 'NEUTRAL' | 'RISK-OFF'
 confidence: number
 center: [number, number]
 zoom: number
 sourceMeta: GeoboardSourceMetadata
 relatedAssets: string[]
 whyItMatters: string
 geoboardModes: GeoboardMode[]
}

export type GeoboardFeedType = 'GEO_RISK' | 'MACRO_CATALYST' | 'CENTRAL_BANK' | 'TRADE_ROUTE' | 'REGIME_CONTEXT'

export interface FeedItem {
 id: string
 feedType: GeoboardFeedType
 title: string
 subtitle: string
 time: string
 impactLine: string
 whyItMatters: string
 lat: number
 lon: number
 sourceId: string
 sourceLayer: 'geo' | 'macro' | 'cb' | 'trade' | 'regime'
 regionCode: string
 regionGroup: string
 linkedEventId?: string | null
 linkedEventSlug?: string | null
 relatedNewsClusterIds: string[]
 relatedNewsIds: string[]
 linkedAssetSymbols: string[]
 linkedAssets?: string[]
 linkedEvents?: string[]
 linkedRegions?: string[]
 linkedNews?: string[]
 linkedReports?: string[]
 linkedReactions?: string[]
 derivedFrom?: string[]
 fallbackReason?: string
 tags: string[]
 geoboardModes: GeoboardMode[]
 links: {
  event?: string | null
  calendar?: string | null
  reactions?: string | null
  bias?: string | null
  reports?: string | null
  news?: string | null
  watchlists?: string | null
  alerts?: string | null
  source?: string | null
 }
 sourceMeta: GeoboardSourceMetadata
 ranking: GeoboardRankingMetadata
 intelligence?: GeoboardIntelligence
}

export interface GeoboardSourceStatus {
 layer: 'geo' | 'macro' | 'cb' | 'trade' | 'regime' | 'feed'
 state: 'live' | 'degraded' | 'fallback' | 'static' | 'derived' | 'demo'
 sourceType: GeoboardSourceType
 mode: GeoboardRuntimeMode
 detail: string
}

export interface GeoboardModeState {
 activeMode: GeoboardMode
 availableModes: GeoboardMode[]
 fallback: boolean
 sourceHonesty: string
}

export interface GeoboardPayload {
 generatedAt: string
 modeState: GeoboardModeState
 sourceStatus: GeoboardSourceStatus[]
 geoEvents: GeoEvent[]
 macroEvents: MacroEvent[]
 centralBanks: CentralBank[]
 tradeRoutes: TradeRoute[]
 regimeZones: RegimeZone[]
 feed: FeedItem[]
 evaluation?: GeoboardEvaluation
 summary: Record<string, number>
}

export type HoverState =
 | { layer: 'cb'; x: number; y: number; object: CentralBank }
 | { layer: 'geo'; x: number; y: number; object: GeoEvent }
 | { layer: 'trade'; x: number; y: number; object: TradeRoute }
 | { layer: 'macro'; x: number; y: number; object: MacroEvent }



