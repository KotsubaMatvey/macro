export type UserRole = "user" | "analyst" | "admin";

export type NavSection = {
  slug: string;
  title: string;
  description: string;
  adminOnly?: boolean;
};

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  onboardingCompleted: boolean;
  emailVerified: boolean;
};

export type DashboardMetric = {
  label: string;
  value: string;
  note: string;
};

export type RegimeComponent = {
  key: string;
  label: string;
  value: number;
};

export type RegimeSnapshot = {
  id: string;
  asOf: string;
  label: string;
  score: number;
  confidence: number;
  trend: string;
  interpretation: string;
  methodology: string;
  components: RegimeComponent[];
};

export type MarketBiasSnapshot = {
  assetId: string;
  symbol: string;
  name: string;
  className: string;
  direction: string;
  score: number;
  confidence: number;
  change1d: number;
  change5d: number;
  rationale: string[];
};

export type EventRelease = {
  id: string;
  family: string;
  title: string;
  slug: string;
  country: string;
  currency: string;
  impact: string;
  category: string;
  scheduledAt: string;
  status: string;
  previous: number | null;
  forecast: number | null;
  actual: number | null;
  surprise: number | null;
  whyItMatters: string;
  relatedAssets: string[];
};

export type EventDetail = EventRelease & {
  historicalReactions: { window: string; avgMovePct: number; consistency: number; narrative: string }[];
  linkedBriefings: Briefing[];
  linkedNews: NewsItem[];
};

export type Briefing = {
  id: string;
  slug: string;
  title: string;
  kind: string;
  publishedAt: string;
  summary: string;
  analystName: string;
  takeaways: string[];
  assetSymbols: string[];
};

export type NewsItem = {
  id: string;
  slug: string;
  title: string;
  source: string;
  publishedAt: string;
  summary: string;
  sentiment: string;
  category: string;
  relatedEventId: string | null;
};

export type ImpactWindow = {
  window: string;
  avgMovePct: number;
  consistency: number;
  narrative: string;
};

export type Watchlist = {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  alertCount: number;
  items: { id: string; symbol: string; itemType: string; note: string }[];
};

export type Alert = {
  id: string;
  name: string;
  triggerType: string;
  deliveryChannel: string;
  status: string;
  threshold: string;
  lastTriggeredAt: string | null;
};

export type CommunityPost = {
  id: string;
  title: string;
  body: string;
  authorName: string;
  authorRole: string;
  likes: number;
  comments: number;
  createdAt: string;
};

export type FeatureFlag = {
  key: string;
  description: string;
  enabled: boolean;
};

export type BillingState = {
  plan: string;
  seatCount: number;
  renewalDate: string;
  providerMode: string;
};

export type AdminSummary = {
  users: number;
  analysts: number;
  scheduledEvents: number;
  activeAlerts: number;
  queuedJobs: number;
};

export type WorkstationPayload = {
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
  adminSummary: AdminSummary | null;
}



