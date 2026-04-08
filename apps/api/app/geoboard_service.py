import hashlib
from datetime import timedelta

import httpx

from .cache import cache_provider_payload, read_provider_payload
from .db import fetch_all
from .security import reference_now
from .settings import settings

GDELT_ENDPOINT = 'https://api.gdeltproject.org/api/v2/doc/doc'
GDELT_CACHE_NAME = 'geoboard:gdelt-events'
COUNTRY_COORDS = {'US': (38.9, -95.0), 'EU': (50.0, 10.0), 'JP': (35.7, 139.7), 'CN': (35.0, 105.0), 'GB': (51.5, -0.1), 'AU': (-25.0, 133.0), 'UA': (49.0, 31.0), 'RU': (61.5, 105.0), 'IR': (32.0, 53.0), 'IL': (31.5, 34.8), 'SA': (24.0, 45.0), 'TW': (23.7, 121.0), 'EG': (26.8, 30.8), 'SG': (1.3, 103.8)}
COUNTRY_NAMES = {'united states': 'US', 'euro area': 'EU', 'europe': 'EU', 'united kingdom': 'GB', 'japan': 'JP', 'china': 'CN', 'australia': 'AU', 'ukraine': 'UA', 'russia': 'RU', 'iran': 'IR', 'israel': 'IL', 'saudi arabia': 'SA', 'taiwan': 'TW', 'singapore': 'SG'}
KEYWORDS = {'IRAN': 'IR', 'ISRAEL': 'IL', 'GAZA': 'IL', 'UKRAINE': 'UA', 'RUSSIA': 'RU', 'CHINA': 'CN', 'TAIWAN': 'TW', 'EUROPE': 'EU', 'ECB': 'EU', 'SAUDI': 'SA', 'HORMUZ': 'IR', 'SUEZ': 'EG', 'MALACCA': 'SG', 'BLACK SEA': 'UA'}
ASSETS = {'IR': ['OIL', 'DXY', 'XAU'], 'IL': ['OIL', 'XAU', 'VIX'], 'UA': ['WHEAT', 'EUR', 'NATGAS'], 'RU': ['BRENT', 'EUR', 'WHEAT'], 'CN': ['CNH', 'COPPER', 'SEMI'], 'TW': ['SEMI', 'CNH', 'QQQ'], 'EU': ['EURUSD', 'BUND', 'DAX'], 'GB': ['GBPUSD', 'GILT', 'DXY'], 'US': ['DXY', 'UST', 'SPX'], 'SA': ['BRENT', 'TANKERS', 'DXY'], 'EG': ['BRENT', 'FREIGHT', 'EMFX'], 'SG': ['FREIGHT', 'OIL', 'ASIA FX']}
FALLBACK_GEO_EVENTS = [{'id': 'geo-fallback-hormuz', 'title': 'Shipping insurers widen cover costs around Hormuz corridor', 'source': 'Macro Access Wire', 'lat': 26.6, 'lon': 56.9, 'tone': -7.2, 'date': '2026-04-08T06:00:00+00:00', 'url': 'https://api.gdeltproject.org/', 'affectedAssets': ['OIL', 'DXY', 'XAU'], 'mode': 'fallback'}, {'id': 'geo-fallback-blacksea', 'title': 'Black Sea logistics remain strained after renewed port alerts', 'source': 'Macro Access Wire', 'lat': 45.1, 'lon': 31.3, 'tone': -6.4, 'date': '2026-04-08T05:10:00+00:00', 'url': 'https://api.gdeltproject.org/', 'affectedAssets': ['WHEAT', 'EUR', 'NATGAS'], 'mode': 'fallback'}]
FALLBACK_MACRO_EVENTS = [{'id': 'macro-fallback-cpi', 'name': 'US CPI', 'country': 'United States', 'countryCode': 'US', 'lat': 38.9, 'lon': -95.0, 'date': '2026-04-10T12:30:00+00:00', 'forecast': 2.9, 'previous': 3.1, 'impactLevel': 'High', 'expectedReaction': 'Softer core should ease front-end yields and lean risk-on.', 'relatedAssets': ['SPX', 'DXY', 'XAU'], 'mode': 'fallback'}, {'id': 'macro-fallback-ecb', 'name': 'ECB Rate Decision', 'country': 'Euro Area', 'countryCode': 'EU', 'lat': 50.0, 'lon': 10.0, 'date': '2026-04-11T11:15:00+00:00', 'forecast': 3.5, 'previous': 3.5, 'impactLevel': 'High', 'expectedReaction': 'Guidance should drive EUR duration and bank beta.', 'relatedAssets': ['EURUSD', 'BUND', 'DAX'], 'mode': 'fallback'}]

def _country_code(country: str) -> str:
	return COUNTRY_NAMES.get((country or '').strip().lower(), 'US')

def _headline_code(title: str) -> str:
	headline = (title or '').upper()
	for keyword, code in KEYWORDS.items():
		if keyword in headline:
			return code
	return 'US'

def _headline_tone(title: str):
	headline = (title or '').upper()
	if any(token in headline for token in ['STRIKE', 'ATTACK', 'SANCTION', 'MISSILE', 'WAR', 'CONFLICT', 'DISRUPT']):
		return -6.5
	if any(token in headline for token in ['TALKS', 'CEASEFIRE', 'DEAL', 'RESUME']):
		return 2.4
	return -1.2

def fetch_gdelt_events() -> list[dict]:
	cached = read_provider_payload(GDELT_CACHE_NAME)
	if cached and cached.get('payload'):
		return cached['payload']
	try:
		with httpx.Client(timeout=settings.provider_timeout_seconds) as client:
			response = client.get(GDELT_ENDPOINT, params={'query': 'conflict OR sanctions OR military', 'mode': 'ArtList', 'maxrecords': 50, 'format': 'json', 'sort': 'DateDesc'})
			response.raise_for_status()
			articles = response.json().get('articles') or response.json().get('artlist') or []
			events = []
			for article in articles[:30]:
				title = article.get('title') or article.get('name') or 'Untitled geopolitical event'
				code = _headline_code(title)
				lat, lon = COUNTRY_COORDS.get(code, COUNTRY_COORDS['US'])
				tone = article.get('tone') if isinstance(article.get('tone'), (int, float)) else _headline_tone(title)
				events.append({'id': 'geo-' + hashlib.sha1((title + '::' + (article.get('seendate') or article.get('date') or reference_now().isoformat())).encode('utf-8')).hexdigest()[:12], 'title': title, 'source': article.get('source') or article.get('domain') or article.get('sourcecountry') or 'GDELT', 'lat': lat, 'lon': lon, 'tone': float(tone), 'date': article.get('seendate') or article.get('date') or reference_now().isoformat(), 'url': article.get('url') or article.get('sourceurl') or GDELT_ENDPOINT, 'affectedAssets': ASSETS.get(code, ['OIL', 'DXY']), 'mode': 'live'})
		payload = events or FALLBACK_GEO_EVENTS
	except Exception:
		payload = FALLBACK_GEO_EVENTS
	cache_provider_payload(GDELT_CACHE_NAME, payload, ttl=300)
	return payload

def fetch_macro_events() -> list[dict]:
	now = reference_now()
	horizon = now + timedelta(days=14)
	query = "select e.id, ef.name, ef.country, ef.importance, e.scheduled_at, e.forecast_value, e.previous_value, coalesce(nullif(e.narrative, ''), e.why_it_matters) as expected_reaction, coalesce(array_agg(a.symbol order by a.symbol) filter (where a.symbol is not null), '{}') as related_assets from events e join event_families ef on ef.id = e.family_id left join event_release_assets era on era.event_id = e.id left join assets a on a.id = era.asset_id where e.scheduled_at >= '{now.isoformat()}' and e.scheduled_at <= '{horizon.isoformat()}' and ef.importance in ('High', 'Medium') group by e.id, ef.name, ef.country, ef.importance, e.scheduled_at, e.forecast_value, e.previous_value, e.narrative, e.why_it_matters order by e.scheduled_at asc"
	try:
		rows = fetch_all(query)
	except Exception:
		return FALLBACK_MACRO_EVENTS
	events = []
	for row in rows:
		code = _country_code(row['country'])
		lat, lon = COUNTRY_COORDS.get(code, COUNTRY_COORDS['US'])
		events.append({'id': row['id'], 'name': row['name'], 'country': row['country'], 'countryCode': code, 'lat': lat, 'lon': lon, 'date': row['scheduled_at'].isoformat(), 'forecast': float(row['forecast_value']) if row['forecast_value'] is not None else None, 'previous': float(row['previous_value']) if row['previous_value'] is not None else None, 'impactLevel': row['importance'], 'expectedReaction': row['expected_reaction'], 'relatedAssets': list(row['related_assets']) if row['related_assets'] else [], 'mode': 'live'})
	return events or FALLBACK_MACRO_EVENTS
