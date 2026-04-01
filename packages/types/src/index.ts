export type UserRole = string;

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
