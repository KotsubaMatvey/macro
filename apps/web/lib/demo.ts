export type AppSection = {
  slug: string;
  title: string;
  description: string;
};

export type RegimeSnapshot = {
  label: string;
  score: number;
  confidence: number;
  trend: string;
  interpretation: string;
  components: Array<{ key: string; value: number }>;
};

export type AssetBias = {
  asset: string;
  state: string;
  score: number;
  dayChange: number;
  weekChange: number;
  confidence: number;
  sources: string[];
};

export type EventItem = {
  id: string;
  family: string;
  title: string;
  country: string;
  currency: string;
  impact: "High" | "Medium" | "Low";
  category: string;
  scheduledAt: string;
  forecast: number | null;
  previous: number | null;
  actual: number | null;
  surprise: number | null;
  status: "Upcoming" | "Live" | "Released" | "Revised";
  whyItMatters: string;
  assets: string[];
};

export type BriefingItem = {
  id: string;
  type: string;
  title: string;
  summary: string;
  timestamp: string;
  takeaways: string[];
  assets: string[];
  tags: string[];
  author: string;
};

export type NewsItem = {
  id: string;
  title: string;
  source: string;
  summary: string;
  category: string;
  sentiment: string;
  region: string;
  assets: string[];
  relatedEventId: string | null;
};

export type OptionFlowItem = {
  id: string;
  symbol: string;
  side: string;
  premium: string;
  strike: string;
  expiry: string;
  sentiment: string;
};

export type WatchlistItem = {
  id: string;
  name: string;
  items: string[];
  alerts: number;
};

export type AlertItem = {
  id: string;
  label: string;
  channel: string;
  status: string;
};

export type CommunityPost = {
  id: string;
  author: string;
  role: string;
  title: string;
  body: string;
  likes: number;
  comments: number;
};

export const brand = "Northstar Macro";

export const marketingPages = [
  { slug: "features", title: "Features", body: "Regime analysis, macro calendar, impact studies, charts, briefings, watchlists, alerts, options flow, and community in one workstation." },
  { slug: "pricing", title: "Pricing", body: "Free, Pro, and Team plans with server-side gates and a fake billing provider in demo mode." },
  { slug: "compare", title: "Compare", body: "Dense operator workflows, transparent methodology, and realistic demo data instead of a signal black box." },
  { slug: "about", title: "About", body: "Northstar Macro is built for macro traders, discretionary cross-asset desks, and crypto traders running a macro overlay." },
  { slug: "changelog", title: "Changelog", body: "This scaffold ships with marketing pages, an authenticated app shell, calendar, regime monitor, market bias, briefings, news, impact lab, watchlists, alerts, community, billing, and admin views." },
  { slug: "contact", title: "Contact", body: "Use the contact page for enterprise access, feedback, and provider partnerships." },
  { slug: "terms", title: "Terms", body: "The platform provides research tooling and workflow software subject to service terms." },
  { slug: "privacy", title: "Privacy", body: "Privacy controls cover sessions, preferences, telemetry, and notification data." },
  { slug: "disclaimer", title: "Disclaimer", body: "Northstar Macro does not provide personalized investment advice." },
  { slug: "cookie-policy", title: "Cookie Policy", body: "Cookies support sessions, saved preferences, and product analytics." },
];

export const sections: AppSection[] = [
  { slug: "dashboard", title: "Dashboard", description: "Workstation home with current macro state." },
  { slug: "market-bias", title: "Market Bias", description: "Directional bias with source transparency." },
  { slug: "regime-monitor", title: "Regime Monitor", description: "Rules-based macro regime model." },
  { slug: "macro-calendar", title: "Macro Calendar", description: "Global event calendar with surprise data." },
  { slug: "advanced-charts", title: "Advanced Charts", description: "Multi-asset event-aware charts." },
  { slug: "briefings", title: "Briefings", description: "Morning, evening, and event intelligence." },
  { slug: "news", title: "News", description: "Macro-linked news and summaries." },
  { slug: "impact-lab", title: "Impact Lab", description: "Historical event reaction studies." },
  { slug: "event-explorer", title: "Event Explorer", description: "Searchable event families and patterns." },
  { slug: "options-flow", title: "Options Flow", description: "Unusual options activity." },
  { slug: "watchlists", title: "Watchlists", description: "Saved assets, events, and alerts." },
  { slug: "alerts", title: "Alerts", description: "Event reminders and regime shifts." },
  { slug: "community", title: "Community", description: "Professional macro discussion." },
  { slug: "settings", title: "Settings", description: "Profile, timezone, density, and preferences." },
  { slug: "billing", title: "Billing", description: "Plan and subscription controls." },
  { slug: "admin", title: "Admin", description: "Operational control plane." },
];

export const regime: RegimeSnapshot = {
  label: "Expansionary",
  score: 0.42,
  confidence: 0.74,
  trend: "Improving",
  interpretation:
    "Growth remains resilient, inflation is cooling unevenly, and liquidity is modestly supportive. The setup is constructive but highly event-sensitive.",
  components: [
    { key: "growth", value: 0.6 },
    { key: "inflation", value: -0.1 },
    { key: "liquidity", value: 0.3 },
    { key: "rates", value: -0.2 },
    { key: "volatility", value: 0.1 },
    { key: "usd", value: -0.05 },
  ],
};

export const biases: AssetBias[] = [
  { asset: "SPX", state: "Bullish", score: 68, dayChange: 4, weekChange: 9, confidence: 0.7, sources: ["soft landing", "liquidity", "breadth"] },
  { asset: "DXY", state: "Neutral", score: 51, dayChange: -1, weekChange: -3, confidence: 0.58, sources: ["rates", "growth divergence"] },
  { asset: "BTC", state: "Bullish", score: 63, dayChange: 5, weekChange: 12, confidence: 0.65, sources: ["liquidity beta", "ETF flows"] },
  { asset: "XAU", state: "Bearish", score: 41, dayChange: -3, weekChange: -7, confidence: 0.61, sources: ["real yields", "usd impulse"] },
];

export const events: EventItem[] = [
  {
    id: "us-cpi-mar",
    family: "CPI",
    title: "US CPI YoY",
    country: "United States",
    currency: "USD",
    impact: "High",
    category: "Inflation",
    scheduledAt: "2026-04-10T12:30:00Z",
    forecast: 2.9,
    previous: 3.1,
    actual: 2.8,
    surprise: -3.4,
    status: "Released",
    whyItMatters:
      "Inflation surprise reprices the front end, the USD, and duration-sensitive risk. It also anchors the regime model and market bias recalculation.",
    assets: ["SPX", "DXY", "XAU", "BTC"],
  },
  {
    id: "ecb-rate-apr",
    family: "Rate Decision",
    title: "ECB Main Refinancing Rate",
    country: "Euro Area",
    currency: "EUR",
    impact: "High",
    category: "Rates",
    scheduledAt: "2026-04-11T11:15:00Z",
    forecast: 3.5,
    previous: 3.5,
    actual: null,
    surprise: null,
    status: "Upcoming",
    whyItMatters:
      "Rates guidance reprices EUR crosses, regional equities, and global funding conditions.",
    assets: ["EURUSD", "DAX", "BTP"],
  },
  {
    id: "nfp-apr",
    family: "Payrolls",
    title: "US Nonfarm Payrolls",
    country: "United States",
    currency: "USD",
    impact: "High",
    category: "Growth",
    scheduledAt: "2026-04-03T12:30:00Z",
    forecast: 182,
    previous: 210,
    actual: 195,
    surprise: 7.1,
    status: "Released",
    whyItMatters:
      "Payrolls drive the growth leg of the regime framework and can rotate the tape between cyclical risk and duration.",
    assets: ["SPX", "US2Y", "DXY", "BTC"],
  },
];

export const briefings: BriefingItem[] = [
  {
    id: "morning-briefing-1",
    type: "Morning Briefing",
    title: "Disinflation holds, but rates remain two-way",
    summary:
      "US data is soft enough to steady the duration bid, but not weak enough to break cyclical risk.",
    timestamp: "2026-03-26T05:45:00Z",
    takeaways: [
      "SPX leadership remains broad enough to keep the tape constructive.",
      "Gold is vulnerable if real yields re-accelerate after CPI.",
      "BTC still trades as high-beta liquidity.",
    ],
    assets: ["SPX", "US10Y", "BTC", "XAU"],
    tags: ["morning", "rates", "inflation"],
    author: "Mara Levin",
  },
  {
    id: "post-cpi-briefing",
    type: "Post-Event Briefing",
    title: "Cooler CPI extends the soft-landing trade",
    summary:
      "Front-end yields eased, the USD lost its bid, and duration-sensitive risk regained momentum after CPI printed below forecast.",
    timestamp: "2026-04-10T13:20:00Z",
    takeaways: [
      "EURUSD tends to outperform on below-consensus CPI prints.",
      "The equity impulse is strongest when services inflation also cools.",
      "Gold responds best when real yields break trend.",
    ],
    assets: ["SPX", "EURUSD", "XAU"],
    tags: ["cpi", "post-event"],
    author: "Mara Levin",
  },
];

export const news: NewsItem[] = [
  {
    id: "fed-tone-news",
    title: "Fed speakers lean patient as inflation normalizes",
    source: "Northstar Wire",
    summary:
      "Officials continue to argue for data dependence while labor conditions remain firm.",
    category: "Central Banks",
    sentiment: "Neutral",
    region: "US",
    assets: ["DXY", "US2Y", "SPX"],
    relatedEventId: "us-cpi-mar",
  },
  {
    id: "china-credit-news",
    title: "China credit pulse improves modestly in March release",
    source: "Northstar Wire",
    summary:
      "Incremental stabilization supports industrial metals and EM cyclicals, but the impulse remains narrow.",
    category: "Growth",
    sentiment: "Bullish",
    region: "Asia",
    assets: ["COPPER", "AUDUSD", "HSI"],
    relatedEventId: null,
  },
];

export const optionsFlow: OptionFlowItem[] = [
  { id: "spx-calls", symbol: "SPX", side: "Call Sweep", premium: "$4.2M", strike: "5850", expiry: "2026-04-17", sentiment: "Bullish" },
  { id: "qqq-puts", symbol: "QQQ", side: "Put Sweep", premium: "$2.1M", strike: "468", expiry: "2026-04-03", sentiment: "Bearish" },
  { id: "btc-call-block", symbol: "BTC", side: "Call Block", premium: "$1.4M", strike: "92k", expiry: "2026-05-29", sentiment: "Bullish" },
];

export const watchlists: WatchlistItem[] = [
  { id: "rates-desk", name: "Rates Desk", items: ["US2Y", "US10Y", "DXY", "XAU"], alerts: 4 },
  { id: "crypto-macro", name: "Crypto + Macro", items: ["BTC", "ETH", "DXY", "CPI"], alerts: 3 },
];

export const alerts: AlertItem[] = [
  { id: "cpi-reminder", label: "US CPI release reminder", channel: "In-app", status: "Scheduled" },
  { id: "btc-threshold", label: "BTC above 90k", channel: "Email", status: "Triggered" },
  { id: "regime-shift", label: "Regime confidence below 0.60", channel: "In-app", status: "Active" },
];

export const posts: CommunityPost[] = [
  {
    id: "thread-1",
    author: "Elena Park",
    role: "Analyst",
    title: "Why the next CPI matters more for rates than equities",
    body:
      "The market is already long the soft-landing path. The bigger swing factor is whether front-end pricing can compress further.",
    likes: 38,
    comments: 11,
  },
  {
    id: "thread-2",
    author: "Ibrahim Shah",
    role: "Trader",
    title: "Tracking USD liquidity spillover into BTC beta",
    body:
      "Crypto still reacts most cleanly when USD and real-yield pressure both ease into the event window.",
    likes: 24,
    comments: 6,
  },
];

export const impactWindows = [
  { window: "5m", avg: 0.18, consistency: 0.64 },
  { window: "1h", avg: 0.36, consistency: 0.69 },
  { window: "4h", avg: 0.52, consistency: 0.71 },
  { window: "24h", avg: 0.88, consistency: 0.73 },
  { window: "3d", avg: 1.24, consistency: 0.67 },
];
