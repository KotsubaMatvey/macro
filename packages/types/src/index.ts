export type UserRole = "user" | "analyst" | "admin";

export type EventImpact = string;
export type EventStatus = string;
export type MarketDirection = string;
export type RegimeTrend = string;

export interface NavChildDestination {
 slug: string;
 title: string;
 description?: string;
}

export interface NavSection {
 slug: string;
 title: string;
 description: string;
 adminOnly?: boolean;
 children?: NavChildDestination[];
}

export interface SessionUser {
 id: string;
 email: string;
 name: string;
 role: UserRole;
 onboardingCompleted: boolean;
 emailVerified: boolean;
}

export interface DashboardMetric {
 label: string;
 value: string;
 note: string;
}

export interface RegimeComponent {
 key: string;
 label: string;
 value: number;
}

export interface RegimeSnapshot {
 id: string;
 asOf: string;
 label: string;
 score: number;
 confidence: number;
 trend: RegimeTrend;
 interpretation: string;
 methodology: string;
 components: RegimeComponent[];
}

export interface MarketBiasSnapshot {
 assetId: string;
 symbol: string;
 name: string;
 className: string;
 direction: MarketDirection;
 score: number;
 confidence: number;
 change1d: number;
 change5d: number;
 rationale: string[];
}

export interface EventRelease {
 id: string;
 family: string;
 title: string;
 slug: string;
 country: string;
 currency: string;
 impact: EventImpact;
 category: string;
 scheduledAt: string;
 status: EventStatus;
 previous?: number;
 forecast?: number;
 actual?: number;
 surprise?: number;
 whyItMatters: string;
 relatedAssets: string[];
}

export interface ImpactWindow {
 window: string;
 avgMovePct: number;
 consistency: number;
 narrative: string;
}

export interface Briefing {
 id: string;
 slug: string;
 title: string;
 kind: string;
 publishedAt: string;
 summary: string;
 analystName: string;
 takeaways: string[];
 assetSymbols: string[];
 relatedEventId?: string;
}

export interface NewsItem {
 id: string;
 slug: string;
 title: string;
 source: string;
 publishedAt: string;
 summary: string;
 sentiment: string;
 category: string;
 relatedEventId?: string;
}

export interface EventDetail extends EventRelease {
 historicalReactions: ImpactWindow[];
 linkedBriefings: Briefing[];
 linkedNews: NewsItem[];
}

export interface WatchlistItem {
 id: string;
 symbol: string;
 itemType: string;
 note: string;
}

export interface Watchlist {
 id: string;
 name: string;
 description: string;
 itemCount: number;
 alertCount: number;
 items: WatchlistItem[];
}

export interface Alert {
 id: string;
 name: string;
 triggerType: string;
 deliveryChannel: string;
 status: string;
 threshold: string;
 lastTriggeredAt?: string;
}

export interface CommunityPost {
 id: string;
 title: string;
 body: string;
 authorName: string;
 authorRole: string;
 likes: number;
 comments: number;
 createdAt: string;
}

export interface FeatureFlag {
 key: string;
 description: string;
 enabled: boolean;
}

export interface BillingState {
 plan: string;
 seatCount: number;
 renewalDate: string;
 providerMode: string;
}

export interface JobRun {
 id: string;
 jobType?: string;
 job_type?: string;
 status: string;
 runAt?: string;
 run_at?: string;
 startedAt?: string;
 started_at?: string;
 finishedAt?: string;
 finished_at?: string;
 errorMessage?: string;
 error_message?: string;
}

export interface AdminSummary {
 users: number;
 analysts: number;
 scheduledEvents: number;
 activeAlerts: number;
 queuedJobs: number;
 latestJobStatus?: string;
}

export interface WorkstationPayload {
 session: SessionUser;
 metrics: DashboardMetric[];
 regime: RegimeSnapshot;
 biases: MarketBiasSnapshot[];
 nextEvents: EventRelease[];
 briefings: Briefing[];
 news: NewsItem[];
 watchlists: Watchlist[];
 alerts: Alert[];
 posts: CommunityPost[];
 featureFlags: FeatureFlag[];
 billing: BillingState;
 adminSummary?: AdminSummary;
}

export type FreshnessState = "fresh" | "aging" | "stale" | "degraded";
export type DataMode = "live" | "demo" | "fallback";

export interface SourceMetadata {
 label: string;
 source: string;
 sourceUrl?: string;
 fetchedAt?: string;
 lastUpdated?: string;
 freshness: FreshnessState;
 mode: DataMode;
 note: string;
}

export interface DashboardScenarioBucket {
 label: string;
 probability: number;
 description: string;
}

export interface DashboardSparkPoint {
 label: string;
 value: number;
}

export interface DashboardAssetView {
 symbol: string;
 title: string;
 subtitle: string;
 sourceSymbol: string;
 price: string;
 change1dPct: number;
 change30dPct: number;
 expectedMove5dPct: number;
 stance: string;
 skew: string;
 confidence: number;
 sampleCount: number;
 regimeContext: string;
 sourceFacts: string[];
 modelFacts: string[];
 scenarioBuckets: DashboardScenarioBucket[];
 sparkline: DashboardSparkPoint[];
 freshness: SourceMetadata;
}

export interface DashboardHero {
 assets: DashboardAssetView[];
 defaultSymbol: string;
 sourceNote: string;
 modelNote: string;
}

export interface DashboardCatalyst {
 title: string;
 status: string;
 scheduledAt?: string;
 countdownLabel: string;
 impact: string;
 country: string;
 currency: string;
 relatedAssets: string[];
 threshold: string;
 sensitivity: string;
 whyItMatters: string;
 context: string[];
 href: string;
 freshness: SourceMetadata;
}

export interface DashboardRegimeBlock {
 label: string;
 score: number;
 delta: number;
 trend: string;
 interpretation: string;
 drivers: string[];
 history: DashboardSparkPoint[];
 freshness: SourceMetadata;
}

export interface DashboardConsensusAsset {
 symbol: string;
 direction: string;
 score: number;
 confidence: number;
 change30dPct: number;
 note: string;
}

export interface DashboardConsensus {
 label: string;
 score: number;
 trend30d: string;
 confidence: number;
 sampleSize: number;
 note: string;
 href: string;
 assets: DashboardConsensusAsset[];
 freshness: SourceMetadata;
}

export interface DashboardTrackRecordItem {
 symbol: string;
 asOf: string;
 stance: string;
 expectedMove5dPct: number;
 realizedMove5dPct: number;
 outcome: string;
 linkedEventTitle?: string;
 linkedEventHref?: string;
}

export interface DashboardTrackRecord {
 status: string;
 evaluationMode: string;
 sampleSize: number;
 hitRate?: number;
 magnitudeErrorPct?: number;
 note: string;
 records: DashboardTrackRecordItem[];
 freshness: SourceMetadata;
}

export interface DashboardLinkedItem {
 title: string;
 subtitle: string;
 href: string;
 mode: DataMode;
}

export interface DashboardLinkedIntelligence {
 briefings: DashboardLinkedItem[];
 news: DashboardLinkedItem[];
 watchlists: DashboardLinkedItem[];
 alerts: DashboardLinkedItem[];
 catalysts: DashboardLinkedItem[];
}

export interface DashboardSessionMarker {
 code: string;
 label: string;
 active: boolean;
}

export interface DashboardProviderStatus {
 name: string;
 status: string;
 detail: string;
 mode: DataMode;
}

export interface DashboardLiquidityInput {
 label: string;
 value: string;
 detail: string;
 tone: string;
}

export interface DashboardUtilityStrip {
 activeSession: string;
 sessions: DashboardSessionMarker[];
 refreshedAt: string;
 providers: DashboardProviderStatus[];
}

export interface DashboardPayload {
 generatedAt: string;
 session: SessionUser;
 hero: DashboardHero;
 keyCatalyst: DashboardCatalyst;
 riskRegime: DashboardRegimeBlock;
 liquidityRegime: DashboardRegimeBlock;
 marketConsensus: DashboardConsensus;
 liquidityInputs: DashboardLiquidityInput[];
 trackRecord: DashboardTrackRecord;
 linkedIntelligence: DashboardLinkedIntelligence;
 utility: DashboardUtilityStrip;
}

