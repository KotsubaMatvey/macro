import type { NavSection } from '../../types/src';

export const APP_NAME = 'Northstar Macro';
export const APP_TAGLINE = 'Track macro events. Read the regime. Trade the reaction.';
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export const APP_SECTIONS: NavSection[] = [
  { slug: 'dashboard', title: 'Dashboard', description: 'Workstation home and cross-asset state.' },
  { slug: 'macro-calendar', title: 'Macro Calendar', description: 'Day and week event schedule with drill-down detail.' },
  { slug: 'event-explorer', title: 'Event Explorer', description: 'Family-level history, comparisons, and release archives.' },
  { slug: 'market-bias', title: 'Market Bias', description: 'Consensus stance, themes, and analyst context.' },
  { slug: 'regime-monitor', title: 'Liquidity Regime', description: 'Macro liquidity, risk appetite, and quadrant state.' },
  { slug: 'live-reactions', title: 'Live Reactions', description: 'Event reaction monitor with demo refresh.' },
  { slug: 'news', title: 'Market News', description: 'Macro-linked headlines and context.' },
  { slug: 'briefings', title: 'Briefings', description: 'Analyst intelligence and event prep.' },
  { slug: 'education', title: 'Education', description: 'Module guides and operating notes.' },
  { slug: 'watchlists', title: 'Watchlists', description: 'Saved instruments and event baskets.' },
  { slug: 'alerts', title: 'Alerts', description: 'Thresholds, reminders, and publication alerts.' },
  { slug: 'community', title: 'Community', description: 'Professional macro discussion.' },
  { slug: 'advanced-charts', title: 'Advanced Charts', description: 'Provider-ready charting scaffold.' },
  { slug: 'options-flow', title: 'Options Flow', description: 'Demo-backed unusual activity tape.' },
  { slug: 'settings', title: 'Settings', description: 'Profile, preferences, and density.' },
  { slug: 'billing', title: 'Billing', description: 'Plan controls and provider scaffold.' },
  { slug: 'admin', title: 'Admin', description: 'Users, jobs, flags, and moderation.', adminOnly: true },
];

export const PUBLIC_LINKS = [
  { slug: 'features', title: 'Features' },
  { slug: 'pricing', title: 'Pricing' },
  { slug: 'about', title: 'About' },
  { slug: 'contact', title: 'Contact' },
  { slug: 'disclaimer', title: 'Disclaimer' },
];
