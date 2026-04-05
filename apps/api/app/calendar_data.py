from __future__ import annotations

from datetime import datetime, timedelta, timezone
import re
from urllib.parse import quote

import httpx

from .cache import cache_provider_payload, read_provider_payload
from .db import fetch_all
from .providers import ProviderError
from .security import reference_now, utc_now
from .settings import settings

FALLBACK_SOURCE = {
	'label': 'Catalyst calendar',
	'source': 'Internal seeded calendar',
	'sourceUrl': None,
	'mode': 'demo' if settings.app_mode == 'demo' else 'fallback',
	'note': 'TradingEconomics credentials are not configured',
}


def calendar_provider_configured():
	return bool(settings.tradingeconomics_api_key or (settings.tradingeconomics_username and settings.tradingeconomics_password))


def _calendar_cache_key(label):
	return 'calendar:' + label


def _calendar_credentials():
	if settings.tradingeconomics_api_key:
		return settings.tradingeconomics_api_key
	if settings.tradingeconomics_username and settings.tradingeconomics_password:
		return settings.tradingeconomics_username + ':' + settings.tradingeconomics_password
	raise ProviderError('TradingEconomics credentials are not configured')


def _calendar_client():
	return httpx.Client(timeout=settings.provider_timeout_seconds)


def _slugify(value):
	return re.sub(r'[^a-z0-9]+', '-', value.lower()).strip('-')

def _impact_label(value):
	text = str(value or '').strip().lower()
	if text in {'3', 'high'}:
		return 'High'
	if text in {'2', 'medium', 'med'}:
		return 'Medium'
	if text in {'1', 'low'}:
		return 'Low'
	return 'Medium'


def _coerce_number(value):
	if value in (None, '', 'NaN'):
		return None
	cleaned = str(value).replace(',', '').replace('%', '').strip()
	multiplier = 1.0
	if cleaned.endswith('K'):
		multiplier = 1000.0
		cleaned = cleaned[:-1]
	elif cleaned.endswith('M'):
		multiplier = 1000000.0
		cleaned = cleaned[:-1]
	elif cleaned.endswith('B'):
		multiplier = 1000000000.0
		cleaned = cleaned[:-1]
	try:
		return round(float(cleaned) * multiplier, 4)
	except ValueError:
		return None


def _event_status(event_time, actual):
	now = reference_now()
	delta_minutes = (event_time - now).total_seconds() / 60.0
	if actual is not None:
		return 'Released'
	if -45 <= delta_minutes <= 90:
		return 'Live'
	if delta_minutes > 90:
		return 'Upcoming'
	return 'Released'


def _related_assets(currency, category, title):
	title_key = str(title or '').lower()
	category_key = str(category or '').lower()
	currency_key = str(currency or '').upper()
	if 'fomc' in title_key or 'fed' in title_key or 'rate' in title_key:
		return ['SPX', 'NDX', 'US10Y', 'DXY', 'XAU', 'BTC', 'VIX']
	if 'cpi' in title_key or 'inflation' in category_key or 'payroll' in title_key or 'nfp' in title_key:
		return ['SPX', 'NDX', 'US10Y', 'DXY', 'XAU', 'BTC']
	if currency_key == 'EUR':
		return ['EURUSD', 'DXY', 'US10Y', 'XAU']
	if currency_key == 'USD':
		return ['SPX', 'NDX', 'US10Y', 'DXY', 'XAU', 'BTC']
	return ['DXY', 'XAU']

def _normalize_te_event(item):
	event_time = item.get('Date') or item.get('date') or item.get('dateUtc')
	if not event_time:
		raise ProviderError('Calendar item is missing a timestamp')
	stamp = event_time.replace('Z', '+00:00') if isinstance(event_time, str) else event_time
	scheduled = datetime.fromisoformat(stamp)
	if scheduled.tzinfo is None:
		scheduled = scheduled.replace(tzinfo=timezone.utc)
	else:
		scheduled = scheduled.astimezone(timezone.utc)
	title = item.get('Event') or item.get('event') or item.get('Title') or 'Macro event'
	family = item.get('Category') or item.get('category') or title
	country = item.get('Country') or item.get('country') or 'Global'
	currency = item.get('Currency') or item.get('currency') or 'USD'
	impact = _impact_label(item.get('Importance') or item.get('importance') or item.get('ImportanceLevel'))
	actual = _coerce_number(item.get('Actual') or item.get('actual'))
	forecast = _coerce_number(item.get('Forecast') or item.get('forecast'))
	previous = _coerce_number(item.get('Previous') or item.get('previous'))
	provider_id = item.get('CalendarId') or item.get('calendarId') or _slugify(title + '-' + scheduled.date().isoformat())
	slug = _slugify(title + '-' + scheduled.date().isoformat())
	return {
		'id': 'te-' + str(provider_id),
		'family': family,
		'title': title,
		'slug': slug,
		'country': country,
		'currency': currency,
		'impact': impact,
		'category': family,
		'scheduledAt': scheduled.isoformat(),
		'status': _event_status(scheduled, actual),
		'previous': previous,
		'forecast': forecast,
		'actual': actual,
		'surprise': round(actual - forecast, 4) if actual is not None and forecast is not None else None,
		'whyItMatters': (item.get('Comment') or item.get('comment') or item.get('Reference') or 'Live macro catalyst from TradingEconomics.')[:220],
		'relatedAssets': _related_assets(currency, family, title),
		'providerEventId': str(provider_id),
		'freshness': {'label': 'Catalyst calendar', 'source': 'TradingEconomics', 'sourceUrl': settings.tradingeconomics_api_base_url, 'fetchedAt': utc_now().isoformat(), 'lastUpdated': scheduled.isoformat(), 'freshness': 'fresh', 'mode': 'live', 'note': 'Live economic calendar provider'},
	}


def _fallback_events():
	rows = fetch_all('select e.id, e.slug, e.title, e.status, e.scheduled_at, e.previous_value, e.forecast_value, e.actual_value, e.surprise_pct, e.why_it_matters, f.name as family, f.country, f.currency, f.importance, f.category from events e join event_families f on f.id = e.family_id order by e.scheduled_at asc')
	events = []
	for row in rows:
		events.append({
			'id': row['id'],
			'family': row['family'],
			'title': row['title'],
			'slug': row['slug'],
			'country': row['country'],
			'currency': row['currency'],
			'impact': row['importance'],
			'category': row['category'],
			'scheduledAt': row['scheduled_at'].isoformat(),
			'status': row['status'],
			'previous': float(row['previous_value']) if row['previous_value'] is not None else None,
			'forecast': float(row['forecast_value']) if row['forecast_value'] is not None else None,
			'actual': float(row['actual_value']) if row['actual_value'] is not None else None,
			'surprise': float(row['surprise_pct']) if row['surprise_pct'] is not None else None,
			'whyItMatters': row['why_it_matters'],
			'relatedAssets': _related_assets(row['currency'], row['category'], row['title']),
			'providerEventId': row['id'],
			'freshness': {'label': FALLBACK_SOURCE['label'], 'source': FALLBACK_SOURCE['source'], 'sourceUrl': FALLBACK_SOURCE['sourceUrl'], 'fetchedAt': utc_now().isoformat(), 'lastUpdated': row['scheduled_at'].isoformat(), 'freshness': 'aging', 'mode': FALLBACK_SOURCE['mode'], 'note': FALLBACK_SOURCE['note']},
		})
	return events

def _fetch_tradingeconomics(path):
	credentials = _calendar_credentials()
	separator = '&' if '?' in path else '?'
	url = settings.tradingeconomics_api_base_url.rstrip('/') + path + separator + 'c=' + quote(credentials) + '&f=json'
	with _calendar_client() as client:
		response = client.get(url)
		response.raise_for_status()
		payload = response.json()
	if not isinstance(payload, list):
		raise ProviderError('TradingEconomics calendar payload was malformed')
	return payload


def calendar_feed(search=None, family=None, days_back=14, days_forward=45, prefer_cache=True):
	cache_key = _calendar_cache_key((family or 'all') + ':' + str(days_back) + ':' + str(days_forward) + ':' + (search or ''))
	if prefer_cache:
		cached = read_provider_payload(cache_key)
		if cached and cached.get('payload'):
			return cached['payload']
	if calendar_provider_configured():
		try:
			start = (reference_now() - timedelta(days=days_back)).date().isoformat()
			end = (reference_now() + timedelta(days=days_forward)).date().isoformat()
			raw_items = _fetch_tradingeconomics('/calendar/country/all/' + start + '/' + end)
			events = []
			for item in raw_items:
				normalized = _normalize_te_event(item)
				if family and family.lower() not in normalized['family'].lower() and family.lower() not in normalized['title'].lower():
					continue
				if search:
					needle = search.lower()
					haystack = ' '.join([normalized['title'], normalized['family'], normalized['country'], normalized['currency']]).lower()
					if needle not in haystack:
						continue
				events.append(normalized)
			events.sort(key=lambda item: item['scheduledAt'])
			payload = {'events': events, 'freshness': {'label': 'Catalyst calendar', 'source': 'TradingEconomics', 'sourceUrl': settings.tradingeconomics_api_base_url, 'fetchedAt': utc_now().isoformat(), 'lastUpdated': events[-1]['scheduledAt'] if events else None, 'freshness': 'fresh', 'mode': 'live', 'note': 'Live TradingEconomics calendar feed'}, 'provider': {'name': 'TradingEconomics', 'status': 'live', 'detail': str(len(events)) + ' calendar rows loaded', 'mode': 'live'}}
			cache_provider_payload(cache_key, payload, ttl=settings.calendar_cache_ttl_seconds)
			return payload
		except Exception as exc:
			failure_note = str(exc)
	else:
		failure_note = 'TradingEconomics credentials are not configured'
	events = _fallback_events()
	if family:
	 events = [item for item in events if family.lower() in item['family'].lower() or family.lower() in item['title'].lower()]
	if search:
	 needle = search.lower()
	 events = [item for item in events if needle in ' '.join([item['title'], item['family'], item['country'], item['currency']]).lower()]
	payload = {'events': events, 'freshness': {'label': FALLBACK_SOURCE['label'], 'source': FALLBACK_SOURCE['source'], 'sourceUrl': FALLBACK_SOURCE['sourceUrl'], 'fetchedAt': utc_now().isoformat(), 'lastUpdated': events[-1]['scheduledAt'] if events else None, 'freshness': 'degraded', 'mode': FALLBACK_SOURCE['mode'], 'note': failure_note}, 'provider': {'name': 'Catalyst calendar', 'status': 'fallback', 'detail': failure_note, 'mode': FALLBACK_SOURCE['mode']}}
	cache_provider_payload(cache_key, payload, ttl=settings.calendar_cache_ttl_seconds)
	return payload


def list_calendar_events(search=None, family=None, days_back=30, days_forward=60):
	return calendar_feed(search=search, family=family, days_back=days_back, days_forward=days_forward)['events']


def get_calendar_event(event_id):
	for item in calendar_feed(days_back=90, days_forward=120)['events']:
		if item['id'] == event_id or item['slug'] == event_id or item['providerEventId'] == event_id:
			return item
	return None

