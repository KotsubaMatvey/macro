from typing import Optional
 
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
    mode: str = "fallback"
    freshness: str = "degraded"
    clusterId: Optional[str] = None
    clusterCount: int = 1
    canonical: bool = True
    whyItMatters: str = ""
    relatedEventId: Optional[str] = None
    relatedEventSlug: Optional[str] = None
    relatedDashboardAsset: Optional[str] = None
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




