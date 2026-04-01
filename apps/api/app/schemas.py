from typing import Any, Optional
 
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
    publishedAt: str 
    summary: str 
    category: str 
    sentiment: str 
    relatedEventId: Optional[str] = None 
 
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
 
class WorkstationPayload(BaseModel): 
    session: SessionUser 
    metrics: list[DashboardMetric] 
    regime: RegimeSnapshot 
    biases: list[MarketBiasSnapshot] 
    nextEvents: list[EventRelease] 
    briefings: list[BriefingItem] 
    news: list[NewsItem] 
    watchlists: list[dict[str, Any]] 
    alerts: list[dict[str, Any]] 
    posts: list[dict[str, Any]] 
    featureFlags: list[dict[str, Any]] 
    billing: dict[str, Any] 
    adminSummary: Optional[dict[str, Any]] = None 

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
 trackRecord: DashboardTrackRecord
 linkedIntelligence: DashboardLinkedIntelligence
 utility: DashboardUtilityStrip
