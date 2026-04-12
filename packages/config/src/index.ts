import type { NavSection } from '@macroaccess/types';

export const APP_NAME = 'Macro Access';
export const APP_TAGLINE = 'Track macro events. Read the regime. Trade the reaction.';
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export const APP_SECTIONS: NavSection[] = [
 { slug: 'dashboard', title: 'Dashboard', description: 'Desk overview' },
 {
 slug: 'macro-calendar',
 title: 'Calendar',
 description: 'Events and context',
 children: [
 { slug: 'event-explorer', title: 'Event Explorer', description: 'Family archive' },
 { slug: 'news', title: 'Market News', description: 'Headline tape' },
 { slug: 'briefings', title: 'Briefings', description: 'Prep notes' },
 { slug: 'watchlists', title: 'Watchlists', description: 'Saved baskets' },
 ],
 },
 {
 slug: 'market-bias',
 title: 'Market Bias',
 description: 'Signals and reaction',
 children: [
 { slug: 'regime-monitor', title: 'Regime Monitor', description: 'Macro backdrop' },
 { slug: 'live-reactions', title: 'Live Reactions', description: 'Reaction tape' },
 { slug: 'alerts', title: 'Alerts', description: 'Threshold rules' },
 ],
 },
 {
 slug: 'advanced-charts',
 title: 'Charts',
 description: 'Comparative tools',
 children: [
 { slug: 'options-flow', title: 'Options Flow', description: 'Unusual activity' },
 { slug: 'impact-lab', title: 'Impact Lab', description: 'Reaction studies' },
 ],
 },
 {
 slug: 'education',
 title: 'Education',
 description: 'Guides and notes',
 children: [
 { slug: 'community', title: 'Community', description: 'Desk discussion' },
 ],
 },
 {
 slug: 'geoboard',
 title: 'GEOBOARD',
 description: 'Global macro AOR',
 icon: 'globe',
 },
 {
 slug: 'settings',
 title: 'Settings',
 description: 'Profile and billing',
 children: [
 { slug: 'billing', title: 'Billing', description: 'Plan controls' },
 ],
 },
 { slug: 'admin', title: 'Admin', description: 'Users and jobs', adminOnly: true },
];

export const PUBLIC_LINKS = [
 { slug: 'features', title: 'Features' },
 { slug: 'pricing', title: 'Pricing' },
 { slug: 'about', title: 'About' },
 { slug: 'contact', title: 'Contact' },
 { slug: 'disclaimer', title: 'Disclaimer' },
];
 
const biasChildren = APP_SECTIONS.find(function (item) { return item.slug === 'market-bias' })?.children 
if (biasChildren) { 
 const reactionsItem = biasChildren.find(function (item) { return item.slug === 'live-reactions' }) 
 if (reactionsItem) reactionsItem.title = 'Reactions' 
 if (!biasChildren.some(function (item) { return item.slug === 'track-record' })) biasChildren.push({ slug: 'track-record', title: 'Track Record', description: 'Replay evaluation' }) 
} 
const calendarChildren = APP_SECTIONS.find(function (item) { return item.slug === 'macro-calendar' })?.children 
if (calendarChildren && !calendarChildren.some(function (item) { return item.slug === 'reports' })) calendarChildren.push({ slug: 'reports', title: 'Reports', description: 'Weekly brief archive' })
