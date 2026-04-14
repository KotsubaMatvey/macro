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
 icon?: string;
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
 freshness?: SourceMetadata;
 providerEventId?: string;
 importanceScore?: number;
 urgencyScore?: number;
 confidenceScore?: number;
 marketRelevanceScore?: number;
 deskRelevanceScore?: number;
 rankingScore?: number;
 linkedAssets?: string[];
 linkedEvents?: string[];
 linkedRegions?: string[];
 linkedNews?: Array<string | NewsItem>;
 linkedReports?: string[];
 linkedReactions?: string[];
 derivedFrom?: string[];
 fallbackReason?: string;
 evaluation?: IntelligenceEvaluation;
 intelligence?: IntelligenceContract;
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
 headline?: string;
 source: string;
 sourceType?: "official" | "discovery" | "seeded";
 sourceTier?: "primary" | "secondary";
 sourceUrl?: string;
 publishedAt: string;
 summary: string;
 topic?: string;
 sentiment: string;
 category: string;
 region?: string;
 country?: string;
 currency?: string;
 eventFamily?: string;
 affectedAssets?: string[];
 assetSymbols?: string[];
 importanceScore?: number;
 urgencyScore?: number;
 confidenceScore?: number;
 marketRelevanceScore?: number;
 deskRelevanceScore?: number;
 rankingScore?: number;
 mode?: DataMode;
 freshness?: FreshnessState;
 clusterId?: string;
 clusterCount?: number;
 canonical?: boolean;
 whyItMatters?: string;
 relatedEventId?: string;
 relatedEventSlug?: string;
 relatedDashboardAsset?: string;
 providerKey?: string;
 providerMeta?: Record<string, unknown>;
 watchOverlap?: number;
 linkedAssets?: string[];
 linkedEvents?: string[];
 linkedRegions?: string[];
 linkedNews?: Array<string | NewsItem>;
 linkedReports?: string[];
 linkedReactions?: string[];
 derivedFrom?: string[];
 fallbackReason?: string;
 evaluation?: IntelligenceEvaluation;
 intelligence?: IntelligenceContract;
 sourceMeta?: SourceMetadata;
 links?: {
  event?: string | null;
  calendar?: string | null;
  reactions?: string | null;
  bias?: string | null;
  reports?: string | null;
  news?: string | null;
  source?: string | null;
 };
}

export interface NewsSourceStatus {
 providerKey: string;
 sourceType: "official" | "discovery" | "seeded";
 status: "live" | "degraded" | "fallback";
 mode: DataMode;
 detail: string;
}

export interface NewsFeedSummary {
 total: number;
 official: number;
 discovery: number;
 linkedEvents: number;
 watchlistHits: number;
 clusters: number;
}

export interface NewsFeedAvailable {
 modes: Array<"wire" | "macro" | "watchlist">;
 sourceTypes: Array<"official" | "discovery" | "seeded">;
 categories: string[];
 regions: string[];
 topics: string[];
 currencies: string[];
 assets: string[];
}

export interface NewsFeedPayload {
 mode: "wire" | "macro" | "watchlist";
 modeLabel: string;
 shellMode: DataMode | "mixed";
 freshness: FreshnessState;
 sourceMeta: SourceMetadata;
 evaluation?: IntelligenceEvaluation;
 items: NewsItem[];
 rails: {
  topNow: NewsItem[];
  centralBanks: NewsItem[];
  calendarLinked: NewsItem[];
  watchlistNews: NewsItem[];
  highUrgency: NewsItem[];
  sourceStatus: NewsSourceStatus[];
 };
 summary: NewsFeedSummary;
 filters: {
  search: string;
  sourceType: string;
  region: string;
  topic: string;
  category: string;
  currency: string;
  asset: string;
  eventFamily: string;
  officialOnly: boolean;
  watchlistOnly: boolean;
  minUrgency: number;
 };
 available: NewsFeedAvailable;
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

export interface IntelligenceEvaluation {
 surface: string;
 signalType: string;
 signalRef: string;
 sampleSize: number;
 coverage?: number;
 directionAccuracy?: number;
 magnitudeError?: number;
 falsePositiveRate?: number;
 calibrationQuality?: number;
 rankingUsefulness?: number;
 sourceQualityAlignment?: number;
 mode: string;
 note: string;
}

export interface IntelligenceContract {
 source: string;
 sourceType: string;
 sourceUrl?: string | null;
 sourceTier: string;
 mode: string;
 freshness: string;
 importance: number;
 urgency: number;
 confidence: number;
 marketRelevance: number;
 deskRelevance: number;
 rankScore: number;
 scoreRationale: string[];
 scoreComponents: Record<string, number>;
 linkedAssets: string[];
 linkedEvents: string[];
 linkedRegions: string[];
 linkedNews: string[];
 linkedReports: string[];
 linkedReactions: string[];
 derivedFrom: string[];
 fallbackReason: string;
 evaluation: IntelligenceEvaluation;
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
 importanceScore?: number;
 urgencyScore?: number;
 confidenceScore?: number;
 marketRelevanceScore?: number;
 deskRelevanceScore?: number;
 rankingScore?: number;
 linkedAssets?: string[];
 linkedEvents?: string[];
 linkedRegions?: string[];
 linkedNews?: Array<string | NewsItem>;
 linkedReports?: string[];
 linkedReactions?: string[];
 derivedFrom?: string[];
 fallbackReason?: string;
 evaluation?: IntelligenceEvaluation;
 intelligence?: IntelligenceContract;
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

 
export interface BiasFactor { 
 key: string; 
 label: string; 
 score: number; 
 direction: string; 
 strength: number; 
 confidence: number; 
 detail: string; 
 note: string; 
 source: SourceMetadata; 
} 
 
export interface BiasAssetInfluence { 
 symbol: string; 
 name: string; 
 direction: string; 
 score: number; 
 confidence: number; 
 change1d: number; 
 change30d: number; 
 note: string; 
 freshness: SourceMetadata; 
} 
 
export interface MarketBiasInsights { 
 summary: { label: string; score: number; confidence: number; note: string; freshness: SourceMetadata }; 
 factors: BiasFactor[]; 
 assets: BiasAssetInfluence[]; 
 providerStatus: { live: number; degraded: number; detail: { [key: string]: string } };
}

export interface ReactionWindowStat { 
 window: string; 
 sampleSize: number; 
 meanMovePct: number; 
 medianMovePct: number; 
 positiveHitRate: number; 
 negativeHitRate: number; 
} 
 
export interface ReactionRecord { 
 eventId: string; 
 title: string; 
 family: string; 
 scheduledAt: string; 
 country: string; 
 currency: string; 
 href: string; 
 windows: { [key: string]: number }; 
} 
 
export interface ReactionsPayload { 
 filters: { family: string; asset: string; country: string; currency: string }; 
 familyOptions: string[]; 
 assetOptions: string[]; 
 summary: { sampleSize: number; directionDistribution: { positive: number; negative: number; flat: number }; windowStats: ReactionWindowStat[]; note: string; freshness: SourceMetadata }; 
 records: ReactionRecord[]; 
 calendar: { mode: DataMode; freshness: FreshnessState; note: string }; 
} 
 
export interface TrackRecordByAsset { asset: string; sampleSize: number; hitRate: number; magnitudeErrorPct: number } 
export interface TrackRecordBySignal { signalType: string; sampleSize: number; hitRate?: number } 
export interface TrackRecordByRegime { regime: string; sampleSize: number; hitRate: number } 
export interface TrackRecordRecord { symbol: string; asOf: string; stance: string; expectedMove5dPct: number; realizedMove5dPct: number; outcome: string; signalType: string; family?: string; href?: string; regime?: string } 
export interface TrackRecordPayload { mode: 'replay'; label: string; sampleSize: number; hitRate?: number; magnitudeErrorPct?: number; bySignalType: TrackRecordBySignal[]; byAsset: TrackRecordByAsset[]; byEventFamily: { family: string; sampleSize: number; hitRate: number }[]; byRegime?: TrackRecordByRegime[]; recentRecords: TrackRecordRecord[]; note: string; freshness: SourceMetadata } 
 
export interface WeeklyReport { id: string; slug: string; title: string; status: string; mode: DataMode | 'deterministic' | 'replay'; weekStart: string; weekEnd: string; summary: string; body: { [key: string]: unknown }; sourceMeta: SourceMetadata[]; createdAt: string }







