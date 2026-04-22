from typing import Literal, Optional
 
from pydantic import BaseModel, Field 
 
class SignUpRequest(BaseModel): 
    email: str 
    password: str = Field(min_length=8, max_length=128) 
    name: str = Field(min_length=2, max_length=80) 
 
class SignInRequest(BaseModel): 
    email: str 
    password: str 
 
class ResetRequest(BaseModel): 
    email: str 
 
class ResetCompleteRequest(BaseModel): 
    token: str 
    password: str = Field(min_length=8, max_length=128) 
 
class VerifyEmailRequest(BaseModel): 
    token: str 
 
class OnboardingRequest(BaseModel): 
    desk: str 
    timezone: str 
    region: str 
    density: str 
    bio: str = ""
 
class SessionUser(BaseModel): 
    id: str 
    email: str 
    name: str 
    role: str 
    onboardingCompleted: bool 
    emailVerified: bool 
 
class DashboardMetric(BaseModel): 
    label: str 
    value: str 
    note: str
 
class RegimeComponent(BaseModel): 
    key: str 
    label: str 
    value: float 
 
class RegimeSnapshot(BaseModel): 
    id: str 
    asOf: str 
    label: str 
    score: float 
    confidence: float 
    trend: str 
    interpretation: str 
    methodology: str 
    components: list[RegimeComponent] 
 
class MarketBiasSnapshot(BaseModel): 
    assetId: str 
    symbol: str 
    name: str 
    className: str 
    direction: str 
    score: float 
    confidence: float 
    change1d: float 
    change5d: float 
    rationale: list[str] 
 
class BriefingItem(BaseModel): 
    id: str 
    slug: str 
    title: str 
    kind: str 
    publishedAt: str 
    summary: str 
    analystName: str 
    takeaways: list[str] 
    assetSymbols: list[str]
 

class IntelligenceEvaluation(BaseModel):
 surface: str = ''
 signalType: str = ''
 signalRef: str = ''
 sampleSize: int = 0
 coverage: Optional[float] = None
 directionAccuracy: Optional[float] = None
 magnitudeError: Optional[float] = None
 falsePositiveRate: Optional[float] = None
 calibrationQuality: Optional[float] = None
 rankingUsefulness: Optional[float] = None
 sourceQualityAlignment: Optional[float] = None
 outcomeCoverage: Optional[float] = None
 outcomeSampleSize: Optional[int] = None
 realizationHorizon: str = ''
 outcomeGrounded: Optional[bool] = None
 snapshotRef: str = ''
 mode: str = 'replay'
 note: str = ''


class IntelligenceContract(BaseModel):
 source: str = ''
 sourceType: str = 'discovery'
 sourceUrl: Optional[str] = None
 sourceTier: str = 'secondary'
 mode: str = 'fallback'
 freshness: str = 'degraded'
 importance: float = 0
 urgency: float = 0
 confidence: float = 0
 marketRelevance: float = 0
 deskRelevance: float = 0
 rankScore: float = 0
 scoreRationale: list[str] = Field(default_factory=list)
 scoreComponents: dict = Field(default_factory=dict)
 linkedAssets: list[str] = Field(default_factory=list)
 linkedEvents: list[str] = Field(default_factory=list)
 linkedRegions: list[str] = Field(default_factory=list)
 linkedNews: list[str] = Field(default_factory=list)
 linkedReports: list[str] = Field(default_factory=list)
 linkedReactions: list[str] = Field(default_factory=list)
 derivedFrom: list[str] = Field(default_factory=list)
 fallbackReason: str = ''
 evaluation: IntelligenceEvaluation = Field(default_factory=IntelligenceEvaluation)
class NewsItem(BaseModel):
    id: str
    slug: str
    title: str
    source: str
    sourceType: str = "discovery"
    sourceTier: str = "secondary"
    sourceUrl: Optional[str] = None
    publishedAt: str
    summary: str
    topic: str = "Macro"
    category: str
    sentiment: str = "Neutral"
    region: str = "Global"
    country: str = "Global"
    currency: str = ""
    eventFamily: str = ""
    affectedAssets: list[str] = Field(default_factory=list)
    importanceScore: float = 0
    urgencyScore: float = 0
    confidenceScore: float = 0
    marketRelevanceScore: float = 0
    deskRelevanceScore: float = 0
    rankingScore: float = 0
    mode: str = "fallback"
    freshness: str = "degraded"
    clusterId: Optional[str] = None
    clusterCount: int = 1
    canonical: bool = True
    whyItMatters: str = ""
    relatedEventId: Optional[str] = None
    relatedEventSlug: Optional[str] = None
    relatedDashboardAsset: Optional[str] = None
    linkedAssets: list[str] = Field(default_factory=list)
    linkedEvents: list[str] = Field(default_factory=list)
    linkedRegions: list[str] = Field(default_factory=list)
    linkedNews: list[str] = Field(default_factory=list)
    linkedReports: list[str] = Field(default_factory=list)
    linkedReactions: list[str] = Field(default_factory=list)
    derivedFrom: list[str] = Field(default_factory=list)
    fallbackReason: str = ""
    evaluation: Optional[IntelligenceEvaluation] = None
    intelligence: Optional[IntelligenceContract] = None
    providerMeta: dict = Field(default_factory=dict)

class NewsSourceStatus(BaseModel):
    providerKey: str
    sourceType: str
    status: str
    mode: str
    detail: str

class NewsFeedSummary(BaseModel):
    total: int
    official: int
    discovery: int
    linkedEvents: int
    watchlistHits: int
    clusters: int

class NewsFeedAvailable(BaseModel):
    modes: list[str]
    sourceTypes: list[str]
    categories: list[str]
    regions: list[str]
    topics: list[str]
    currencies: list[str]
    assets: list[str]

class NewsFeedPayload(BaseModel):
    mode: str
    modeLabel: str
    shellMode: str
    freshness: str
    sourceMeta: dict
    evaluation: Optional[IntelligenceEvaluation] = None
    items: list[NewsItem]
    rails: dict
    summary: NewsFeedSummary
    filters: dict
    available: NewsFeedAvailable

class EventRelease(BaseModel): 
    id: str 
    family: str 
    title: str 
    slug: str 
    country: str 
    currency: str 
    impact: str 
    category: str 
    scheduledAt: str 
    status: str 
    previous: Optional[float] = None 
    forecast: Optional[float] = None 
    actual: Optional[float] = None 
    surprise: Optional[float] = None 
    whyItMatters: str 
    relatedAssets: list[str] 
    importanceScore: float = 0
    urgencyScore: float = 0
    confidenceScore: float = 0
    marketRelevanceScore: float = 0
    deskRelevanceScore: float = 0
    rankingScore: float = 0
    linkedAssets: list[str] = Field(default_factory=list)
    linkedEvents: list[str] = Field(default_factory=list)
    linkedRegions: list[str] = Field(default_factory=list)
    linkedNews: list[str] = Field(default_factory=list)
    linkedReports: list[str] = Field(default_factory=list)
    linkedReactions: list[str] = Field(default_factory=list)
    derivedFrom: list[str] = Field(default_factory=list)
    fallbackReason: str = ''
    evaluation: Optional[IntelligenceEvaluation] = None
    intelligence: Optional[IntelligenceContract] = None
 
class ImpactWindow(BaseModel): 
    window: str 
    avgMovePct: float 
    consistency: float 
    narrative: str 
 
class EventDetail(EventRelease): 
    historicalReactions: list[ImpactWindow] 
    linkedBriefings: list[BriefingItem] 
    linkedNews: list[NewsItem] 
 
class WatchlistItemInput(BaseModel): 
    symbol: str 
    itemType: str 
    note: str = ''
 
class WatchlistInput(BaseModel): 
    name: str 
    description: str = '' 
 
class AlertInput(BaseModel): 
    name: str 
    triggerType: str 
    targetRef: str 
    thresholdValue: str 
    deliveryChannel: str 
 
class CommunityPostInput(BaseModel): 
    title: str 
    body: str 
 
class CommentInput(BaseModel): 
    body: str 
 
class SimpleResponse(BaseModel): 
    status: str 
    detail: Optional[str] = None 
    token: Optional[str] = None 
 
class WatchlistEntry(BaseModel): 
    id: str 
    name: str 
    description: str 
    itemCount: int 
    alertCount: int 
    items: list[WatchlistItemInput] 

class AlertSummary(BaseModel): 
    id: str 
    name: str 
    triggerType: str 
    deliveryChannel: str 
    status: str 
    threshold: str 
    lastTriggeredAt: Optional[str] = None 

class CommunityPostSummary(BaseModel): 
    id: str 
    title: str 
    body: str 
    authorName: str 
    authorRole: str 
    likes: int 
    comments: int 
    createdAt: str 

class FeatureFlagState(BaseModel): 
    key: str 
    description: str 
    enabled: bool 

class BillingSummary(BaseModel): 
    plan: str 
    seatCount: int 
    renewalDate: str 
    providerMode: str 

class AdminSummaryPayload(BaseModel): 
    users: int 
    analysts: int 
    scheduledEvents: int 
    activeAlerts: int 
    queuedJobs: int 

class WorkstationPayload(BaseModel): 
    session: SessionUser 
    metrics: list[DashboardMetric] 
    regime: RegimeSnapshot 
    biases: list[MarketBiasSnapshot] 
    nextEvents: list[EventRelease] 
    briefings: list[BriefingItem] 
    news: list[NewsItem] 
    watchlists: list[WatchlistEntry] 
    alerts: list[AlertSummary] 
    posts: list[CommunityPostSummary] 
    featureFlags: list[FeatureFlagState] 
    billing: BillingSummary 
    adminSummary: Optional[AdminSummaryPayload] = None 

class SourceMetadata(BaseModel):
 label: str
 source: str
 sourceUrl: Optional[str] = None
 fetchedAt: Optional[str] = None
 lastUpdated: Optional[str] = None
 freshness: str
 mode: str
 note: str

class DashboardScenarioBucket(BaseModel):
 label: str
 probability: float
 description: str

class DashboardSparkPoint(BaseModel):
 label: str
 value: float

class DashboardAssetView(BaseModel):
 symbol: str
 title: str
 subtitle: str
 sourceSymbol: str
 price: str
 change1dPct: float
 change30dPct: float
 expectedMove5dPct: float
 stance: str
 skew: str
 confidence: float
 sampleCount: int
 regimeContext: str
 sourceFacts: list[str]
 modelFacts: list[str]
 scenarioBuckets: list[DashboardScenarioBucket]
 sparkline: list[DashboardSparkPoint]
 freshness: SourceMetadata

class DashboardHero(BaseModel):
 assets: list[DashboardAssetView]
 defaultSymbol: str
 sourceNote: str
 modelNote: str

class DashboardCatalyst(BaseModel):
 title: str
 status: str
 scheduledAt: Optional[str] = None
 countdownLabel: str
 impact: str
 country: str
 currency: str
 relatedAssets: list[str]
 threshold: str
 sensitivity: str
 whyItMatters: str
 context: list[str]
 href: str
 freshness: SourceMetadata
 importanceScore: float = 0
 urgencyScore: float = 0
 confidenceScore: float = 0
 marketRelevanceScore: float = 0
 deskRelevanceScore: float = 0
 rankingScore: float = 0
 linkedAssets: list[str] = Field(default_factory=list)
 linkedEvents: list[str] = Field(default_factory=list)
 linkedRegions: list[str] = Field(default_factory=list)
 linkedNews: list[str] = Field(default_factory=list)
 linkedReports: list[str] = Field(default_factory=list)
 linkedReactions: list[str] = Field(default_factory=list)
 derivedFrom: list[str] = Field(default_factory=list)
 fallbackReason: str = ''
 evaluation: Optional[IntelligenceEvaluation] = None
 intelligence: Optional[IntelligenceContract] = None

class DashboardRegimeBlock(BaseModel):
 label: str
 score: float
 delta: float
 trend: str
 interpretation: str
 drivers: list[str]
 history: list[DashboardSparkPoint]
 freshness: SourceMetadata

class DashboardConsensusAsset(BaseModel):
 symbol: str
 direction: str
 score: float
 confidence: float
 change30dPct: float
 note: str

class DashboardConsensus(BaseModel):
 label: str
 score: float
 trend30d: str
 confidence: float
 sampleSize: int
 note: str
 href: str
 assets: list[DashboardConsensusAsset]
 freshness: SourceMetadata

class DashboardTrackRecordItem(BaseModel):
 symbol: str
 asOf: str
 stance: str
 expectedMove5dPct: float
 realizedMove5dPct: float
 outcome: str
 linkedEventTitle: Optional[str] = None
 linkedEventHref: Optional[str] = None

class DashboardTrackRecord(BaseModel):
 status: str
 evaluationMode: str
 sampleSize: int
 hitRate: Optional[float] = None
 magnitudeErrorPct: Optional[float] = None
 note: str
 records: list[DashboardTrackRecordItem]
 freshness: SourceMetadata

class DashboardLinkedItem(BaseModel):
 title: str
 subtitle: str
 href: str
 mode: str

class DashboardLinkedIntelligence(BaseModel):
 briefings: list[DashboardLinkedItem]
 news: list[DashboardLinkedItem]
 watchlists: list[DashboardLinkedItem]
 alerts: list[DashboardLinkedItem]
 catalysts: list[DashboardLinkedItem]

class DashboardSessionMarker(BaseModel):
 code: str
 label: str
 active: bool

class DashboardProviderStatus(BaseModel):
 name: str
 status: str
 detail: str
 mode: str

class DashboardLiquidityInput(BaseModel):
 label: str
 value: str
 detail: str
 tone: str

class DashboardUtilityStrip(BaseModel):
 activeSession: str
 sessions: list[DashboardSessionMarker]
 refreshedAt: str
 providers: list[DashboardProviderStatus]

class DashboardPayload(BaseModel):
 generatedAt: str
 session: SessionUser
 hero: DashboardHero
 keyCatalyst: DashboardCatalyst
 riskRegime: DashboardRegimeBlock
 liquidityRegime: DashboardRegimeBlock
 marketConsensus: DashboardConsensus
 liquidityInputs: list[DashboardLiquidityInput]
 trackRecord: DashboardTrackRecord
 linkedIntelligence: DashboardLinkedIntelligence
 utility: DashboardUtilityStrip



class GeoboardSourceMetadata(BaseModel):
 providerKey: str
 label: str
 sourceType: Literal['official', 'discovery', 'derived', 'static', 'fallback']
 sourceTier: Literal['primary', 'secondary']
 mode: Literal['live', 'demo', 'fallback', 'static', 'derived']
 freshness: Literal['fresh', 'aging', 'stale', 'degraded']
 note: str
 sourceUrl: Optional[str] = None
 fetchedAt: Optional[str] = None
 lastUpdated: Optional[str] = None


class GeoboardRankingMetadata(BaseModel):
 rankScore: float
 urgencyScore: float
 importanceScore: float
 confidenceScore: float
 marketRelevanceScore: float = 0
 deskRelevanceScore: float = 0
 recencyScore: float
 sourceQualityScore: float
 watchlistOverlapScore: float
 catalystProximityScore: float
 regionSignificanceScore: float
 regimeRelevanceScore: float
 componentScores: dict = Field(default_factory=dict)
 rationale: list[str] = Field(default_factory=list)


class GeoboardGeoEvent(BaseModel):
 id: str
 title: str
 source: str
 lat: float
 lon: float
 tone: float
 date: str
 url: str
 affectedAssets: list[str]
 mode: str
 classification: str = 'Geopolitical risk'
 regionCode: str = 'US'
 regionGroup: str = 'North America'
 countryCode: str = 'US'
 country: str = 'United States'
 locationPrecision: str = 'country'
 linkedEventId: Optional[str] = None
 linkedEventSlug: Optional[str] = None
 relatedNewsClusterIds: list[str] = Field(default_factory=list)
 relatedNewsIds: list[str] = Field(default_factory=list)
 whyItMatters: str = ''
 geoboardModes: list[str] = Field(default_factory=lambda: ['STANDARD', 'RISK'])
 sourceMeta: GeoboardSourceMetadata
 ranking: GeoboardRankingMetadata


class GeoboardMacroEvent(BaseModel):
 id: str
 name: str
 country: str
 countryCode: str
 lat: float
 lon: float
 date: str
 forecast: Optional[float] = None
 previous: Optional[float] = None
 impactLevel: str
 expectedReaction: str
 relatedAssets: list[str]
 mode: str
 family: str = ''
 category: str = 'Macro'
 regionCode: str = 'US'
 regionGroup: str = 'North America'
 linkedEventId: Optional[str] = None
 linkedEventSlug: Optional[str] = None
 linkedReactionPath: Optional[str] = None
 linkedCalendarPath: Optional[str] = None
 linkedBiasPath: Optional[str] = None
 linkedReportsPath: Optional[str] = None
 linkedNewsPath: Optional[str] = None
 horizonTag: Literal['today', 'next_24h', 'next_7d', 'later'] = 'later'
 hoursToEvent: Optional[float] = None
 whyItMatters: str = ''
 geoboardModes: list[str] = Field(default_factory=lambda: ['STANDARD', 'LIQUIDITY'])
 sourceMeta: GeoboardSourceMetadata
 ranking: GeoboardRankingMetadata


class GeoboardCentralBankNode(BaseModel):
 id: str
 name: str
 lat: float
 lon: float
 rate: str
 nextMeeting: str
 bias: str
 signal: str
 liquidityWeight: int
 country: str
 countryCode: str
 regionCode: str
 regionGroup: str
 linkedEventId: Optional[str] = None
 linkedEventSlug: Optional[str] = None
 linkedEventPath: Optional[str] = None
 linkedNewsPath: Optional[str] = None
 linkedReactionPath: Optional[str] = None
 linkedBiasPath: Optional[str] = None
 relatedAssets: list[str] = Field(default_factory=list)
 relatedNewsClusterIds: list[str] = Field(default_factory=list)
 whyItMatters: str = ''
 geoboardModes: list[str] = Field(default_factory=lambda: ['STANDARD', 'LIQUIDITY', 'CENT.BANKS'])
 sourceMeta: GeoboardSourceMetadata
 ranking: GeoboardRankingMetadata


class GeoboardTradeRoute(BaseModel):
 id: str
 name: str
 label: str
 path: list[list[float]]
 status: str
 volume: str
 riskLevel: str
 impact: list[str]
 lat: float
 lon: float
 regionCode: str
 regionGroup: str
 linkedGeoEventIds: list[str] = Field(default_factory=list)
 linkedNewsClusterIds: list[str] = Field(default_factory=list)
 linkedNewsPath: Optional[str] = None
 linkedAlertsPath: Optional[str] = None
 whyItMatters: str = ''
 geoboardModes: list[str] = Field(default_factory=lambda: ['STANDARD', 'RISK'])
 sourceMeta: GeoboardSourceMetadata
 ranking: GeoboardRankingMetadata


class GeoboardRegimeZone(BaseModel):
 id: str
 label: str
 flag: str
 regime: Literal['RISK-ON', 'NEUTRAL', 'RISK-OFF']
 confidence: int
 center: list[float]
 zoom: float
 sourceMeta: GeoboardSourceMetadata
 relatedAssets: list[str] = Field(default_factory=list)
 whyItMatters: str = ''
 geoboardModes: list[str] = Field(default_factory=lambda: ['STANDARD', 'LIQUIDITY'])


class GeoboardFeedItem(BaseModel):
 id: str
 feedType: Literal['GEO_RISK', 'MACRO_CATALYST', 'CENTRAL_BANK', 'TRADE_ROUTE', 'REGIME_CONTEXT']
 title: str
 subtitle: str
 time: str
 impactLine: str
 whyItMatters: str
 lat: float
 lon: float
 sourceId: str
 sourceLayer: Literal['geo', 'macro', 'cb', 'trade', 'regime']
 regionCode: str
 regionGroup: str
 linkedEventId: Optional[str] = None
 linkedEventSlug: Optional[str] = None
 relatedNewsClusterIds: list[str] = Field(default_factory=list)
 relatedNewsIds: list[str] = Field(default_factory=list)
 linkedAssetSymbols: list[str] = Field(default_factory=list)
 linkedAssets: list[str] = Field(default_factory=list)
 linkedEvents: list[str] = Field(default_factory=list)
 linkedRegions: list[str] = Field(default_factory=list)
 linkedNews: list[str] = Field(default_factory=list)
 linkedReports: list[str] = Field(default_factory=list)
 linkedReactions: list[str] = Field(default_factory=list)
 derivedFrom: list[str] = Field(default_factory=list)
 fallbackReason: str = ''
 tags: list[str] = Field(default_factory=list)
 geoboardModes: list[str] = Field(default_factory=list)
 links: dict = Field(default_factory=dict)
 sourceMeta: GeoboardSourceMetadata
 ranking: GeoboardRankingMetadata
 intelligence: Optional[IntelligenceContract] = None


class GeoboardSourceStatus(BaseModel):
 layer: Literal['geo', 'macro', 'cb', 'trade', 'regime', 'feed']
 state: Literal['live', 'degraded', 'fallback', 'static', 'derived', 'demo']
 sourceType: Literal['official', 'discovery', 'derived', 'static', 'fallback']
 mode: Literal['live', 'demo', 'fallback', 'static', 'derived']
 detail: str


class GeoboardModeState(BaseModel):
 activeMode: Literal['STANDARD', 'RISK', 'LIQUIDITY', 'CENT.BANKS']
 availableModes: list[Literal['STANDARD', 'RISK', 'LIQUIDITY', 'CENT.BANKS']]
 fallback: bool
 sourceHonesty: str


class GeoboardPayload(BaseModel):
 generatedAt: str
 modeState: GeoboardModeState
 sourceStatus: list[GeoboardSourceStatus]
 geoEvents: list[GeoboardGeoEvent]
 macroEvents: list[GeoboardMacroEvent]
 centralBanks: list[GeoboardCentralBankNode]
 tradeRoutes: list[GeoboardTradeRoute]
 regimeZones: list[GeoboardRegimeZone]
 feed: list[GeoboardFeedItem]
 evaluation: Optional[IntelligenceEvaluation] = None
 summary: dict


class ProviderStatusItem(BaseModel):
 providerKey: str
 label: str
 domainKey: str
 sourceType: str
 sourceTier: str
 mode: str
 freshness: str
 state: str
 note: str
 lastRefresh: Optional[str] = None
 lastUpdated: Optional[str] = None
 routeHint: str = "/app/dashboard"
 diagnosticsPath: Optional[str] = None
 affectedSurfaces: list[str] = Field(default_factory=list)
 meta: dict = Field(default_factory=dict)


class ProviderDomainBlock(BaseModel):
 key: str
 label: str
 description: str
 counts: dict = Field(default_factory=dict)
 items: list[ProviderStatusItem] = Field(default_factory=list)


class ProviderControlPlanePayload(BaseModel):
 generatedAt: str
 summary: dict = Field(default_factory=dict)
 domains: list[ProviderDomainBlock] = Field(default_factory=list)


class GraphSeedEntity(BaseModel):
 id: str
 entityType: str
 refId: str
 title: str
 mode: str
 freshness: str
 routeHint: str


class GraphNode(BaseModel):
 id: str
 entityType: str
 refId: str
 title: str
 source: str
 sourceType: str
 sourceTier: str
 sourceUrl: Optional[str] = None
 mode: str
 freshness: str
 confidenceScore: float = 0
 metadata: dict = Field(default_factory=dict)
 routeHint: str
 surfaceHint: str
 scores: Optional[dict] = None


class GraphEdge(BaseModel):
 id: str
 fromId: str
 toId: str
 linkType: str
 confidenceScore: float = 0
 rationale: str = ""


class GraphNeighborhoodPayload(BaseModel):
 generatedAt: str
 root: dict
 nodes: list[GraphNode] = Field(default_factory=list)
 edges: list[GraphEdge] = Field(default_factory=list)
 summary: dict = Field(default_factory=dict)
 filters: dict = Field(default_factory=dict)
 seedEntities: list[GraphSeedEntity] = Field(default_factory=list)


class WorkspaceEntry(BaseModel):
 id: str
 name: str
 presetKey: Optional[str] = None
 isPreset: bool = False
 moduleKeys: list[str] = Field(default_factory=list)
 filters: dict = Field(default_factory=dict)
 layout: dict = Field(default_factory=dict)
 routes: list[str] = Field(default_factory=list)
 activeRoute: str = "/app/dashboard"
 createdAt: str
 updatedAt: str
 lastUsedAt: str


class WorkspaceInput(BaseModel):
 name: str
 moduleKeys: list[str] = Field(default_factory=list)
 filters: dict = Field(default_factory=dict)
 layout: dict = Field(default_factory=dict)
 routes: list[str] = Field(default_factory=list)
 activeRoute: str = "/app/dashboard"


class WorkspaceUpdateInput(BaseModel):
 name: Optional[str] = None
 moduleKeys: Optional[list[str]] = None
 filters: Optional[dict] = None
 layout: Optional[dict] = None
 routes: Optional[list[str]] = None
 activeRoute: Optional[str] = None








