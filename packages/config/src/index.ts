import type { NavSection } from "../../types/src";

export const APP_NAME = "Northstar Macro";
export const APP_TAGLINE = "Track macro events. Read the regime. Trade the reaction.";
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const APP_SECTIONS: NavSection[] = [
  { slug: "dashboard", title: "Dashboard", description: "Workstation home and cross-asset state." },
  { slug: "market-bias", title: "Market Bias", description: "Per-asset directional bias and rationale." },
  { slug: "regime-monitor", title: "Regime Monitor", description: "Transparent regime model and scores." },
  { slug: "macro-calendar", title: "Macro Calendar", description: "Event schedule and release context." },
  { slug: "briefings", title: "Briefings", description: "Analyst intelligence and event prep." },
  { slug: "news", title: "News", description: "Macro-linked headlines and context." },
  { slug: "impact-lab", title: "Impact Lab", description: "Historical reaction windows." },
  { slug: "event-explorer", title: "Event Explorer", description: "Search and filter event families." },
  { slug: "advanced-charts", title: "Advanced Charts", description: "Provider-ready charting scaffold." },
  { slug: "options-flow", title: "Options Flow", description: "Demo-backed unusual activity tape." },
  { slug: "watchlists", title: "Watchlists", description: "Saved instruments and event baskets." },
  { slug: "alerts", title: "Alerts", description: "Thresholds, reminders, and publication alerts." },
  { slug: "community", title: "Community", description: "Professional macro discussion." },
  { slug: "settings", title: "Settings", description: "Profile, preferences, and density." },
  { slug: "billing", title: "Billing", description: "Plan controls and provider scaffold." },
  { slug: "admin", title: "Admin", description: "Users, jobs, flags, and moderation.", adminOnly: true },
];

export const PUBLIC_LINKS = [
  { slug: "features", title: "Features" },
  { slug: "pricing", title: "Pricing" },
  { slug: "about", title: "About" },
  { slug: "contact", title: "Contact" },
  { slug: "disclaimer", title: "Disclaimer" },
];



