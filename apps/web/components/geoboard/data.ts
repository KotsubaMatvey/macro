import type { DashboardPayload } from '@macroaccess/types'

import type { CentralBank, GeoEvent, MacroEvent, RegimeZone, TradeRoute } from './types'

export const CENTRAL_BANKS: CentralBank[] = [
 { id: 'fed', name: 'FED', lat: 38.9, lon: -77.0, rate: '5.25%', nextMeeting: '2026-05-06', bias: 'DATA DEPENDENT', signal: 'USD LIQUIDITY TIGHT', liquidityWeight: 100 },
 { id: 'ecb', name: 'ECB', lat: 50.1, lon: 8.7, rate: '3.50%', nextMeeting: '2026-04-11', bias: 'HOLD', signal: 'EUR LIQUIDITY STABLE', liquidityWeight: 85 },
 { id: 'boj', name: 'BOJ', lat: 35.7, lon: 139.7, rate: '0.25%', nextMeeting: '2026-04-26', bias: 'GRADUAL NORMALIZATION', signal: 'YEN FUNDING WATCH', liquidityWeight: 90 },
 { id: 'pboc', name: 'PBOC', lat: 39.9, lon: 116.4, rate: '2.50%', nextMeeting: '2026-04-15', bias: 'TARGETED EASING', signal: 'CN CREDIT SUPPORTIVE', liquidityWeight: 80 },
 { id: 'boe', name: 'BOE', lat: 51.5, lon: -0.1, rate: '4.50%', nextMeeting: '2026-05-09', bias: 'BALANCED', signal: 'GBP VOL TWO-WAY', liquidityWeight: 40 },
 { id: 'snb', name: 'SNB', lat: 46.9, lon: 7.4, rate: '1.25%', nextMeeting: '2026-06-20', bias: 'FX SENSITIVE', signal: 'SAFE-HAVEN BID', liquidityWeight: 25 },
 { id: 'rba', name: 'RBA', lat: -35.3, lon: 149.1, rate: '4.10%', nextMeeting: '2026-05-03', bias: 'PATIENT', signal: 'ASIA RISK BAROMETER', liquidityWeight: 30 },
]

export const TRADE_ROUTES: TradeRoute[] = [
 { id: 'hormuz', name: 'STRAIT OF HORMUZ', label: 'HORMUZ // 20% OIL', path: [[56.3, 26.6], [57.0, 24.5], [58.5, 22.0]], status: 'SHIPPING RISK ELEVATED', volume: '20% GLOBAL OIL', riskLevel: 'HIGH', impact: ['OIL', 'DXY', 'XAU'] },
 { id: 'suez', name: 'SUEZ CANAL', label: 'SUEZ // DISRUPTED', path: [[32.3, 30.7], [33.0, 29.0], [32.5, 27.0], [34.0, 24.0]], status: 'TRANSIT DELAYS', volume: '12% GLOBAL TRADE', riskLevel: 'HIGH', impact: ['BRENT', 'FREIGHT', 'EMFX'] },
 { id: 'malacca', name: 'STRAIT OF MALACCA', label: 'MALACCA', path: [[104.0, 2.5], [105.0, 1.0], [103.5, 0.5]], status: 'OPEN / MONITORED', volume: 'ASIA ENERGY CORRIDOR', riskLevel: 'MED', impact: ['OIL', 'ASIA FX', 'FREIGHT'] },
 { id: 'black-sea', name: 'BLACK SEA GRAIN', label: 'BLACK SEA GRAIN', path: [[30.5, 46.5], [31.5, 44.0], [34.0, 42.5]], status: 'EXPORT RISK ACTIVE', volume: 'GRAIN FLOWS', riskLevel: 'HIGH', impact: ['WHEAT', 'EUR', 'NATGAS'] },
 { id: 'taiwan-strait', name: 'TAIWAN STRAIT', label: 'TAIWAN STRAIT', path: [[120.5, 26.0], [120.8, 24.5], [121.0, 22.5]], status: 'NAVAL ACTIVITY WATCH', volume: 'SEMI / CONTAINER FLOW', riskLevel: 'HIGH', impact: ['SEMI', 'CNH', 'QQQ'] },
]

export const FALLBACK_GEO_EVENTS: GeoEvent[] = [
 { id: 'geo-fallback-hormuz', title: 'Shipping insurers widen cover costs around Hormuz corridor', source: 'Fallback data', lat: 26.6, lon: 56.9, tone: -7.2, date: '2026-04-08T06:00:00+00:00', url: 'https://api.gdeltproject.org/', affectedAssets: ['OIL', 'DXY', 'XAU'], mode: 'fallback' },
 { id: 'geo-fallback-blacksea', title: 'Black Sea logistics remain strained after renewed port alerts', source: 'Fallback data', lat: 45.1, lon: 31.3, tone: -6.4, date: '2026-04-08T05:10:00+00:00', url: 'https://api.gdeltproject.org/', affectedAssets: ['WHEAT', 'EUR', 'NATGAS'], mode: 'fallback' },
]

export const FALLBACK_MACRO_EVENTS: MacroEvent[] = [
 { id: 'macro-fallback-cpi', name: 'US CPI', country: 'United States', countryCode: 'US', lat: 38.9, lon: -95.0, date: '2026-04-10T12:30:00+00:00', forecast: 2.9, previous: 3.1, impactLevel: 'High', expectedReaction: 'Softer core should ease front-end yields and lean risk-on.', relatedAssets: ['SPX', 'DXY', 'XAU'], mode: 'fallback' },
 { id: 'macro-fallback-ecb', name: 'ECB Rate Decision', country: 'Euro Area', countryCode: 'EU', lat: 50.0, lon: 10.0, date: '2026-04-11T11:15:00+00:00', forecast: 3.5, previous: 3.5, impactLevel: 'High', expectedReaction: 'Guidance should drive EUR duration and bank beta.', relatedAssets: ['EURUSD', 'BUND', 'DAX'], mode: 'fallback' },
]

export function deriveRegimeZones(dashboard: DashboardPayload | null): RegimeZone[] {
 const base = dashboard ? (dashboard.riskRegime.score >= 0.2 ? 'RISK-ON' : dashboard.riskRegime.score <= -0.2 ? 'RISK-OFF' : 'NEUTRAL') : 'NEUTRAL'
 const liq = dashboard ? (dashboard.liquidityRegime.score >= 0.2 ? 'RISK-ON' : dashboard.liquidityRegime.score <= -0.2 ? 'RISK-OFF' : 'NEUTRAL') : 'NEUTRAL'
 const confidence = dashboard ? Math.round(dashboard.marketConsensus.confidence * 100) : 62
 return [
 { id: 'USA', label: 'USA', flag: '🇺🇸', regime: base, confidence, center: [-98, 38], zoom: 2.7 },
 { id: 'EUROPE', label: 'EUROPE', flag: '🇪🇺', regime: liq, confidence: Math.max(48, confidence - 6), center: [11, 50], zoom: 3.6 },
 { id: 'CHINA', label: 'CHINA', flag: '🇨🇳', regime: liq === 'RISK-ON' ? 'NEUTRAL' : liq, confidence: Math.max(44, confidence - 10), center: [104, 35], zoom: 3.2 },
 { id: 'EM', label: 'EM', flag: '🌐', regime: base === 'RISK-OFF' ? 'RISK-OFF' : 'NEUTRAL', confidence: Math.max(40, confidence - 14), center: [35, 9], zoom: 1.9 },
 ]
}
