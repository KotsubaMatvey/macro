from typing import Any

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
    relatedEventId: str | None = None

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
    previous: float | None = None
    forecast: float | None = None
    actual: float | None = None
    surprise: float | None = None
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
    note: str = ""

class WatchlistInput(BaseModel):
    name: str
    description: str = ""

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
    detail: str | None = None
    token: str | None = None

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
    adminSummary: dict[str, Any] | None = None




