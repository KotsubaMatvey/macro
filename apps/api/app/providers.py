import csv
import re
from email.utils import parsedate_to_datetime
from html import unescape
from io import StringIO
from xml.etree import ElementTree

import httpx

from .cache import cache_provider_payload, read_provider_payload
from .security import utc_now
from .settings import settings

USER_AGENT = 'MacroAccessDashboard/1.0'

class ProviderError(RuntimeError):
	pass

def _client():
	return httpx.Client(
		timeout=settings.provider_timeout_seconds,
		follow_redirects=True,
		headers={'user-agent': USER_AGENT},
	)

def _strip_html(value):
	text = unescape(value or '')
	text = re.sub(r'<[>]+>', ' ', text)
	return re.sub(r'\s+', ' ', text).strip()

def load_fred_series(series_id, source_url, ttl=None):
	cache_name = 'fred:' + series_id
	cached = read_provider_payload(cache_name)
	if cached and cached.get('payload'):
		return cached['payload']
	url = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=' + series_id
	try:
		with _client() as client:
			response = client.get(url)
			response.raise_for_status()
	except httpx.HTTPError as exc:
		raise ProviderError(str(exc)) from exc
	reader = csv.DictReader(StringIO(response.text))
	points = []
	for row in reader:
		value = row.get('VALUE')
		date = row.get('DATE')
		if not value or value == '.' or not date:
			continue
		try:
			points.append({'date': date, 'value': float(value)})
		except ValueError:
			continue
	if len(points) < 40:
		raise ProviderError('FRED series returned insufficient data: ' + series_id)
	payload = {
		'seriesId': series_id,
		'source': 'FRED',
		'sourceUrl': source_url,
		'fetchedAt': utc_now().isoformat(),
		'lastUpdated': points[-1]['date'] + 'T00:00:00+00:00',
		'points': points,
	}
	cache_provider_payload(cache_name, payload, ttl or settings.provider_market_ttl_seconds)
	return payload

def load_rss_feed(cache_name, source_label, source_url, ttl=None, item_limit=6):
	cache_id = 'rss:' + cache_name
	cached = read_provider_payload(cache_id)
	if cached and cached.get('payload'):
		return cached['payload']
	try:
		with _client() as client:
			response = client.get(source_url)
			response.raise_for_status()
	except httpx.HTTPError as exc:
		raise ProviderError(str(exc)) from exc
	try:
		root = ElementTree.fromstring(response.text)
	except ElementTree.ParseError as exc:
		raise ProviderError(str(exc)) from exc
	items = []
	for node in root.findall('.//item'):
		title = (node.findtext('title') or '').strip()
		link = (node.findtext('link') or '').strip()
		published_raw = (node.findtext('pubDate') or '').strip()
		description = _strip_html(node.findtext('description') or '')
		if not title or not link:
			continue
		published_at = published_raw
		if published_raw:
			try:
				published_at = parsedate_to_datetime(published_raw).astimezone().isoformat()
			except (TypeError, ValueError, OverflowError):
				published_at = published_raw
		items.append({
			'title': title,
			'link': link,
			'publishedAt': published_at,
			'summary': description,
		})
		if len(items) >= item_limit:
			break
	if not items:
		raise ProviderError('RSS feed returned no items: ' + source_label)
	payload = {
		'source': source_label,
		'sourceUrl': source_url,
		'fetchedAt': utc_now().isoformat(),
		'lastUpdated': items[0]['publishedAt'],
		'items': items,
	}
	cache_provider_payload(cache_id, payload, ttl or settings.provider_news_ttl_seconds)
	return payload
