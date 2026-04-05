import csv
import re
from datetime import timezone
from email.utils import parsedate_to_datetime
from html import unescape
from html.parser import HTMLParser
from io import StringIO
from xml.etree import ElementTree

import httpx

from .cache import cache_provider_payload, read_provider_payload
from .security import utc_now
from .settings import settings

USER_AGENT = 'MacroAccessDashboard/1.0'


class ProviderError(RuntimeError):
	pass


class _HTMLTextStripper(HTMLParser):
	def __init__(self):
		super().__init__(convert_charrefs=True)
		self._chunks = []

	def handle_starttag(self, tag, attrs):
		if tag in {'br', 'div', 'li', 'p'}:
			self._chunks.append(' ')

	def handle_data(self, data):
		if data:
			self._chunks.append(data)

	def text(self):
		return re.sub(r'\s+', ' ', ''.join(self._chunks)).strip()


def _client():
	return httpx.Client(
		timeout=settings.provider_timeout_seconds,
		follow_redirects=True,
		headers={'user-agent': USER_AGENT},
	)


def _local_name(tag):
	if '}' in tag:
		return tag.rsplit('}', 1)[1]
	return tag


def _strip_html(value):
	raw = (value or '').strip()
	if not raw:
		return ''
	parser = _HTMLTextStripper()
	try:
		parser.feed(unescape(raw))
		parser.close()
		text = parser.text()
		if text:
			return text
	except Exception:
		pass
	text = re.sub(r'<[^>]+>', ' ', unescape(raw))
	return re.sub(r'\s+', ' ', text).strip()


def _parse_feed_timestamp(value):
	raw = (value or '').strip()
	if not raw:
		return None
	try:
		parsed = parsedate_to_datetime(raw)
	except (TypeError, ValueError, OverflowError, IndexError):
		try:
			parsed = __import__('datetime').datetime.fromisoformat(raw.replace('Z', '+00:00'))
		except ValueError:
			return None
	if parsed.tzinfo is None:
		parsed = parsed.replace(tzinfo=timezone.utc)
	return parsed.astimezone(timezone.utc).isoformat()


def _child_value(node, *names):
	targets = set(names)
	for child in list(node):
		name = _local_name(child.tag)
		if name not in targets:
			continue
		if name == 'link':
			href = (child.attrib.get('href') or '').strip()
			if href:
				return href
		text = ''.join(child.itertext()).strip()
		if text:
			return text
	return ''


def _feed_entries(root):
	items = root.findall('.//item')
	if items:
		return items
	return [node for node in root.iter() if _local_name(node.tag) == 'entry']


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
		raise ProviderError('FRED request failed for ' + series_id + ': ' + str(exc)) from exc
	reader = csv.DictReader(StringIO(response.text.lstrip('\ufeff')))
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
	points.sort(key=lambda item: item['date'])
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
		raise ProviderError('Feed request failed for ' + source_label + ': ' + str(exc)) from exc
	try:
		root = ElementTree.fromstring(response.text)
	except ElementTree.ParseError as exc:
		raise ProviderError('Feed parse failed for ' + source_label + ': ' + str(exc)) from exc
	items = []
	for node in _feed_entries(root):
		title = _child_value(node, 'title')
		link = _child_value(node, 'link')
		published_raw = _child_value(node, 'pubDate', 'published', 'updated')
		summary = _strip_html(_child_value(node, 'description', 'summary', 'content', 'encoded'))
		if not title or not link:
			continue
		parsed_published = _parse_feed_timestamp(published_raw)
		items.append({
			'title': title,
			'link': link,
			'publishedAt': parsed_published or published_raw,
			'summary': summary,
			'_sort': parsed_published or '',
		})
	if not items:
		raise ProviderError('RSS feed returned no items: ' + source_label)
	items.sort(key=lambda item: (item['_sort'], item['publishedAt'], item['title']), reverse=True)
	trimmed = []
	for item in items[:item_limit]:
		trimmed.append({
			'title': item['title'],
			'link': item['link'],
			'publishedAt': item['publishedAt'],
			'summary': item['summary'],
		})
	payload = {
		'source': source_label,
		'sourceUrl': source_url,
		'fetchedAt': utc_now().isoformat(),
		'lastUpdated': trimmed[0]['publishedAt'],
		'items': trimmed,
	}
	cache_provider_payload(cache_id, payload, ttl or settings.provider_news_ttl_seconds)
	return payload
