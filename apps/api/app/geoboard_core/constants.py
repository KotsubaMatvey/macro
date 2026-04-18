from __future__ import annotations

from typing import Any

GDELT_ENDPOINT = 'https://api.gdeltproject.org/api/v2/doc/doc'
GDELT_CACHE_NAME = 'geoboard:gdelt-events:v2'
MACRO_CACHE_NAME = 'geoboard:macro-events:v2'
FEED_CACHE_PREFIX = 'geoboard:feed:v2'

COUNTRY_META: dict[str, dict[str, Any]] = {
 'US': {'country': 'United States', 'lat': 38.9, 'lon': -95.0, 'regionCode': 'NA', 'regionGroup': 'North America'},
 'EU': {'country': 'Euro Area', 'lat': 50.0, 'lon': 10.0, 'regionCode': 'EU', 'regionGroup': 'Europe'},
 'GB': {'country': 'United Kingdom', 'lat': 51.5, 'lon': -0.1, 'regionCode': 'EU', 'regionGroup': 'Europe'},
 'JP': {'country': 'Japan', 'lat': 35.7, 'lon': 139.7, 'regionCode': 'APAC', 'regionGroup': 'Asia'},
 'CN': {'country': 'China', 'lat': 35.0, 'lon': 105.0, 'regionCode': 'APAC', 'regionGroup': 'Asia'},
 'AU': {'country': 'Australia', 'lat': -25.0, 'lon': 133.0, 'regionCode': 'APAC', 'regionGroup': 'Asia Pacific'},
 'UA': {'country': 'Ukraine', 'lat': 49.0, 'lon': 31.0, 'regionCode': 'EMEA', 'regionGroup': 'Eastern Europe'},
 'RU': {'country': 'Russia', 'lat': 61.5, 'lon': 105.0, 'regionCode': 'EMEA', 'regionGroup': 'Eastern Europe'},
 'IR': {'country': 'Iran', 'lat': 32.0, 'lon': 53.0, 'regionCode': 'MENA', 'regionGroup': 'Middle East'},
 'IL': {'country': 'Israel', 'lat': 31.5, 'lon': 34.8, 'regionCode': 'MENA', 'regionGroup': 'Middle East'},
 'SA': {'country': 'Saudi Arabia', 'lat': 24.0, 'lon': 45.0, 'regionCode': 'MENA', 'regionGroup': 'Middle East'},
 'TW': {'country': 'Taiwan', 'lat': 23.7, 'lon': 121.0, 'regionCode': 'APAC', 'regionGroup': 'Asia'},
 'EG': {'country': 'Egypt', 'lat': 26.8, 'lon': 30.8, 'regionCode': 'MENA', 'regionGroup': 'Middle East'},
 'SG': {'country': 'Singapore', 'lat': 1.3, 'lon': 103.8, 'regionCode': 'APAC', 'regionGroup': 'Asia'},
 'GL': {'country': 'Global', 'lat': 12.0, 'lon': 8.0, 'regionCode': 'GL', 'regionGroup': 'Global'},
}

COUNTRY_HINTS: list[tuple[str, str]] = [
 ('UNITED STATES', 'US'), ('U.S.', 'US'), ('US ', 'US'), ('EURO AREA', 'EU'), ('EUROPE', 'EU'), ('EUROZONE', 'EU'),
 ('UNITED KINGDOM', 'GB'), ('BRITAIN', 'GB'), ('JAPAN', 'JP'), ('CHINA', 'CN'), ('AUSTRALIA', 'AU'), ('UKRAINE', 'UA'),
 ('RUSSIA', 'RU'), ('IRAN', 'IR'), ('ISRAEL', 'IL'), ('GAZA', 'IL'), ('SAUDI', 'SA'), ('TAIWAN', 'TW'), ('SUEZ', 'EG'),
 ('MALACCA', 'SG'), ('HORMUZ', 'IR'), ('BLACK SEA', 'UA'),
]

CLASSIFICATION_RULES: list[dict[str, Any]] = [
 {'name': 'Conflict', 'keywords': ('STRIKE', 'ATTACK', 'MISSILE', 'WAR', 'CLASH', 'DRONE', 'CEASEFIRE'), 'importance': 0.90, 'urgency': 0.88, 'assets': ['OIL', 'XAU', 'DXY'], 'modes': ['STANDARD', 'RISK']},
 {'name': 'Sanctions', 'keywords': ('SANCTION', 'EMBARGO', 'BLACKLIST', 'EXPORT CONTROL', 'RESTRICTION'), 'importance': 0.84, 'urgency': 0.74, 'assets': ['DXY', 'XAU', 'EMFX'], 'modes': ['STANDARD', 'RISK']},
 {'name': 'Shipping / Logistics', 'keywords': ('SHIPPING', 'VESSEL', 'PORT', 'CANAL', 'STRAIT', 'FREIGHT', 'TRANSIT', 'CHOKEPOINT', 'LOGISTICS'), 'importance': 0.86, 'urgency': 0.80, 'assets': ['FREIGHT', 'OIL', 'WHEAT'], 'modes': ['STANDARD', 'RISK']},
 {'name': 'Energy Risk', 'keywords': ('OIL', 'GAS', 'LNG', 'PIPELINE', 'REFINERY', 'OPEC', 'CRUDE', 'BRENT'), 'importance': 0.88, 'urgency': 0.78, 'assets': ['BRENT', 'NATGAS', 'DXY'], 'modes': ['STANDARD', 'RISK', 'LIQUIDITY']},
 {'name': 'Supply Chain', 'keywords': ('SUPPLY CHAIN', 'SEMICONDUCTOR', 'CHIP', 'CONTAINER', 'RARE EARTH'), 'importance': 0.72, 'urgency': 0.64, 'assets': ['SEMI', 'COPPER', 'CNH'], 'modes': ['STANDARD', 'RISK']},
 {'name': 'Trade Policy', 'keywords': ('TARIFF', 'TRADE POLICY', 'TRADE DEAL', 'CUSTOMS', 'DUTIES'), 'importance': 0.74, 'urgency': 0.62, 'assets': ['DXY', 'CNH', 'EMFX'], 'modes': ['STANDARD', 'RISK']},
 {'name': 'Elections / Political Risk', 'keywords': ('ELECTION', 'PARLIAMENT', 'VOTE', 'CABINET', 'PROTEST', 'COALITION'), 'importance': 0.70, 'urgency': 0.60, 'assets': ['DXY', 'EMFX', 'SPX'], 'modes': ['STANDARD', 'RISK']},
 {'name': 'Sovereign Stress', 'keywords': ('DEFAULT', 'DEBT', 'BOND SPREAD', 'RATING', 'IMF', 'FISCAL'), 'importance': 0.82, 'urgency': 0.66, 'assets': ['BUND', 'US10Y', 'EMFX'], 'modes': ['STANDARD', 'RISK', 'LIQUIDITY']},
]

COUNTRY_ASSETS: dict[str, list[str]] = {
 'US': ['DXY', 'US10Y', 'SPX', 'XAU'], 'EU': ['EURUSD', 'BUND', 'DAX', 'DXY'], 'GB': ['GBPUSD', 'GILT', 'DXY'], 'JP': ['USDJPY', 'NIKKEI', 'US10Y'],
 'CN': ['CNH', 'COPPER', 'SEMI'], 'AU': ['AUDUSD', 'COPPER', 'DXY'], 'UA': ['WHEAT', 'EURUSD', 'NATGAS'], 'RU': ['BRENT', 'EURUSD', 'WHEAT'],
 'IR': ['OIL', 'DXY', 'XAU'], 'IL': ['OIL', 'XAU', 'VIX'], 'SA': ['BRENT', 'TANKERS', 'DXY'], 'TW': ['SEMI', 'CNH', 'QQQ'],
 'EG': ['BRENT', 'FREIGHT', 'EMFX'], 'SG': ['FREIGHT', 'OIL', 'ASIA FX'], 'GL': ['DXY', 'XAU', 'SPX'],
}

REGION_SIGNIFICANCE = {'North America': 0.95, 'Europe': 0.88, 'Eastern Europe': 0.78, 'Middle East': 0.82, 'Asia': 0.84, 'Asia Pacific': 0.76, 'Global': 0.68}
IMPACT_WEIGHTS = {'HIGH': 0.92, 'MEDIUM': 0.72, 'LOW': 0.52}

CENTRAL_BANK_SEEDS: list[dict[str, Any]] = [
 {'id': 'fed', 'name': 'FED', 'lat': 38.9, 'lon': -77.0, 'rate': '5.25%', 'nextMeeting': '2026-05-06', 'bias': 'DATA DEPENDENT', 'signal': 'USD LIQUIDITY TIGHT', 'liquidityWeight': 100, 'country': 'United States', 'countryCode': 'US', 'regionCode': 'NA', 'regionGroup': 'North America', 'relatedAssets': ['DXY', 'US10Y', 'SPX', 'XAU']},
 {'id': 'ecb', 'name': 'ECB', 'lat': 50.1, 'lon': 8.7, 'rate': '3.50%', 'nextMeeting': '2026-04-11', 'bias': 'HOLD', 'signal': 'EUR LIQUIDITY STABLE', 'liquidityWeight': 85, 'country': 'Euro Area', 'countryCode': 'EU', 'regionCode': 'EU', 'regionGroup': 'Europe', 'relatedAssets': ['EURUSD', 'BUND', 'DAX', 'DXY']},
 {'id': 'boj', 'name': 'BOJ', 'lat': 35.7, 'lon': 139.7, 'rate': '0.25%', 'nextMeeting': '2026-04-26', 'bias': 'GRADUAL NORMALIZATION', 'signal': 'YEN FUNDING WATCH', 'liquidityWeight': 90, 'country': 'Japan', 'countryCode': 'JP', 'regionCode': 'APAC', 'regionGroup': 'Asia', 'relatedAssets': ['USDJPY', 'NIKKEI', 'US10Y', 'DXY']},
 {'id': 'pboc', 'name': 'PBOC', 'lat': 39.9, 'lon': 116.4, 'rate': '2.50%', 'nextMeeting': '2026-04-15', 'bias': 'TARGETED EASING', 'signal': 'CN CREDIT SUPPORTIVE', 'liquidityWeight': 80, 'country': 'China', 'countryCode': 'CN', 'regionCode': 'APAC', 'regionGroup': 'Asia', 'relatedAssets': ['CNH', 'SEMI', 'COPPER']},
 {'id': 'boe', 'name': 'BOE', 'lat': 51.5, 'lon': -0.1, 'rate': '4.50%', 'nextMeeting': '2026-05-09', 'bias': 'BALANCED', 'signal': 'GBP VOL TWO-WAY', 'liquidityWeight': 40, 'country': 'United Kingdom', 'countryCode': 'GB', 'regionCode': 'EU', 'regionGroup': 'Europe', 'relatedAssets': ['GBPUSD', 'GILT', 'DXY']},
 {'id': 'snb', 'name': 'SNB', 'lat': 46.9, 'lon': 7.4, 'rate': '1.25%', 'nextMeeting': '2026-06-20', 'bias': 'FX SENSITIVE', 'signal': 'SAFE-HAVEN BID', 'liquidityWeight': 25, 'country': 'Switzerland', 'countryCode': 'EU', 'regionCode': 'EU', 'regionGroup': 'Europe', 'relatedAssets': ['CHF', 'XAU', 'DXY']},
 {'id': 'rba', 'name': 'RBA', 'lat': -35.3, 'lon': 149.1, 'rate': '4.10%', 'nextMeeting': '2026-05-03', 'bias': 'PATIENT', 'signal': 'ASIA RISK BAROMETER', 'liquidityWeight': 30, 'country': 'Australia', 'countryCode': 'AU', 'regionCode': 'APAC', 'regionGroup': 'Asia Pacific', 'relatedAssets': ['AUDUSD', 'COPPER', 'DXY']},
]

TRADE_ROUTE_SEEDS: list[dict[str, Any]] = [
 {'id': 'hormuz', 'name': 'STRAIT OF HORMUZ', 'label': 'HORMUZ // 20% OIL', 'path': [[56.3, 26.6], [57.0, 24.5], [58.5, 22.0]], 'status': 'SHIPPING RISK ELEVATED', 'volume': '20% GLOBAL OIL', 'riskLevel': 'HIGH', 'impact': ['OIL', 'DXY', 'XAU'], 'regionCode': 'MENA', 'regionGroup': 'Middle East', 'keywords': ['HORMUZ', 'IRAN', 'TANKER', 'GULF']},
 {'id': 'suez', 'name': 'SUEZ CANAL', 'label': 'SUEZ // DISRUPTED', 'path': [[32.3, 30.7], [33.0, 29.0], [32.5, 27.0], [34.0, 24.0]], 'status': 'TRANSIT DELAYS', 'volume': '12% GLOBAL TRADE', 'riskLevel': 'HIGH', 'impact': ['BRENT', 'FREIGHT', 'EMFX'], 'regionCode': 'MENA', 'regionGroup': 'Middle East', 'keywords': ['SUEZ', 'RED SEA', 'CANAL', 'SHIPPING']},
 {'id': 'malacca', 'name': 'STRAIT OF MALACCA', 'label': 'MALACCA', 'path': [[104.0, 2.5], [105.0, 1.0], [103.5, 0.5]], 'status': 'OPEN / MONITORED', 'volume': 'ASIA ENERGY CORRIDOR', 'riskLevel': 'MED', 'impact': ['OIL', 'ASIA FX', 'FREIGHT'], 'regionCode': 'APAC', 'regionGroup': 'Asia', 'keywords': ['MALACCA', 'SINGAPORE', 'STRAIT', 'SHIPPING']},
 {'id': 'black-sea', 'name': 'BLACK SEA GRAIN', 'label': 'BLACK SEA GRAIN', 'path': [[30.5, 46.5], [31.5, 44.0], [34.0, 42.5]], 'status': 'EXPORT RISK ACTIVE', 'volume': 'GRAIN FLOWS', 'riskLevel': 'HIGH', 'impact': ['WHEAT', 'EURUSD', 'NATGAS'], 'regionCode': 'EMEA', 'regionGroup': 'Eastern Europe', 'keywords': ['BLACK SEA', 'ODESA', 'GRAIN', 'PORT']},
 {'id': 'taiwan-strait', 'name': 'TAIWAN STRAIT', 'label': 'TAIWAN STRAIT', 'path': [[120.5, 26.0], [120.8, 24.5], [121.0, 22.5]], 'status': 'NAVAL ACTIVITY WATCH', 'volume': 'SEMI / CONTAINER FLOW', 'riskLevel': 'HIGH', 'impact': ['SEMI', 'CNH', 'QQQ'], 'regionCode': 'APAC', 'regionGroup': 'Asia', 'keywords': ['TAIWAN', 'STRAIT', 'CHINA', 'NAVAL']},
]

FALLBACK_GEO_EVENTS: list[dict[str, Any]] = [
 {'id': 'geo-fallback-hormuz', 'title': 'Shipping insurers widen cover costs around Hormuz corridor', 'source': 'Macro Access Wire', 'lat': 26.6, 'lon': 56.9, 'tone': -7.2, 'date': '2026-04-08T06:00:00+00:00', 'url': 'https://api.gdeltproject.org/', 'affectedAssets': ['OIL', 'DXY', 'XAU'], 'classification': 'Shipping / Logistics', 'countryCode': 'IR', 'country': 'Iran', 'regionCode': 'MENA', 'regionGroup': 'Middle East'},
 {'id': 'geo-fallback-blacksea', 'title': 'Black Sea logistics remain strained after renewed port alerts', 'source': 'Macro Access Wire', 'lat': 45.1, 'lon': 31.3, 'tone': -6.4, 'date': '2026-04-08T05:10:00+00:00', 'url': 'https://api.gdeltproject.org/', 'affectedAssets': ['WHEAT', 'EURUSD', 'NATGAS'], 'classification': 'Shipping / Logistics', 'countryCode': 'UA', 'country': 'Ukraine', 'regionCode': 'EMEA', 'regionGroup': 'Eastern Europe'},
]

FALLBACK_MACRO_EVENTS: list[dict[str, Any]] = [
 {'id': 'macro-fallback-cpi', 'name': 'US CPI', 'country': 'United States', 'countryCode': 'US', 'lat': 38.9, 'lon': -95.0, 'date': '2026-04-10T12:30:00+00:00', 'forecast': 2.9, 'previous': 3.1, 'impactLevel': 'High', 'expectedReaction': 'Softer core should ease front-end yields and lean risk-on.', 'relatedAssets': ['SPX', 'DXY', 'XAU'], 'family': 'US CPI', 'category': 'Inflation'},
 {'id': 'macro-fallback-ecb', 'name': 'ECB Rate Decision', 'country': 'Euro Area', 'countryCode': 'EU', 'lat': 50.0, 'lon': 10.0, 'date': '2026-04-11T11:15:00+00:00', 'forecast': 3.5, 'previous': 3.5, 'impactLevel': 'High', 'expectedReaction': 'Guidance should drive EUR duration and bank beta.', 'relatedAssets': ['EURUSD', 'BUND', 'DAX'], 'family': 'ECB Rate Decision', 'category': 'Central bank'},
]


__all__ = [
    "GDELT_ENDPOINT",
    "GDELT_CACHE_NAME",
    "MACRO_CACHE_NAME",
    "FEED_CACHE_PREFIX",
    "COUNTRY_META",
    "COUNTRY_HINTS",
    "CLASSIFICATION_RULES",
    "COUNTRY_ASSETS",
    "REGION_SIGNIFICANCE",
    "IMPACT_WEIGHTS",
    "CENTRAL_BANK_SEEDS",
    "TRADE_ROUTE_SEEDS",
    "FALLBACK_GEO_EVENTS",
    "FALLBACK_MACRO_EVENTS",
]
