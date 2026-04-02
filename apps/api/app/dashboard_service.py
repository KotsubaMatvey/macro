from __future__ import annotations

from datetime import datetime
import math
import statistics

from .cache import cache_live_dashboard, read_live_dashboard_cache
from .providers import ProviderError, load_fred_series, load_rss_feed
from .security import reference_now, utc_now
from .services import list_alerts, list_briefings, list_events, list_watchlists
from .settings import settings

SERIES = {
	'SPX': {'seriesId': 'SP500', 'title': 'SPX Index', 'sourceUrl': 'https://fred.stlouisfed.org/series/SP500'},
	'BTC': {'seriesId': 'CBBTCUSD', 'title': 'Bitcoin / USD', 'sourceUrl': 'https://fred.stlouisfed.org/series/CBBTCUSD'},
	'XAU': {'seriesId': 'GOLDAMGBD228NLBM', 'title': 'Gold AM Fix', 'sourceUrl': 'https://fred.stlouisfed.org/series/GOLDAMGBD228NLBM'},
	'DXY': {'seriesId': 'DTWEXBGS', 'title': 'Broad Dollar Index', 'sourceUrl': 'https://fred.stlouisfed.org/series/DTWEXBGS'},
	'EURUSD': {'seriesId': 'DEXUSEU', 'title': 'EUR / USD', 'sourceUrl': 'https://fred.stlouisfed.org/series/DEXUSEU'},
	'US2Y': {'seriesId': 'DGS2', 'title': 'US 2Y Yield', 'sourceUrl': 'https://fred.stlouisfed.org/series/DGS2'},
	'US10Y': {'seriesId': 'DGS10', 'title': 'US 10Y Yield', 'sourceUrl': 'https://fred.stlouisfed.org/series/DGS10'},
	'VIX': {'seriesId': 'VIXCLS', 'title': 'VIX', 'sourceUrl': 'https://fred.stlouisfed.org/series/VIXCLS'},
	'WALCL': {'seriesId': 'WALCL', 'title': 'Fed Balance Sheet', 'sourceUrl': 'https://fred.stlouisfed.org/series/WALCL'},
	'FEDFUNDS': {'seriesId': 'FEDFUNDS', 'title': 'Fed Funds', 'sourceUrl': 'https://fred.stlouisfed.org/series/FEDFUNDS'},
	'SOFR': {'seriesId': 'SOFR', 'title': 'SOFR', 'sourceUrl': 'https://fred.stlouisfed.org/series/SOFR'},
	'NFCI': {'seriesId': 'NFCI', 'title': 'Chicago Fed NFCI', 'sourceUrl': 'https://fred.stlouisfed.org/series/NFCI'},
}

NEWS_FEEDS = [
	{'cache': 'fed', 'label': 'Federal Reserve press feed', 'url': 'https://www.federalreserve.gov/feeds/press_monetary.xml'},
	{'cache': 'ecb', 'label': 'ECB press feed', 'url': 'https://www.ecb.europa.eu/rss/press.html'},
]

DEFAULT_EDGE_SYMBOLS = ['SPX', 'US10Y', 'DXY', 'XAU', 'BTC', 'EURUSD', 'US2Y']

def _parse_dt(value):
	if not value:
		return None
	if isinstance(value, datetime):
		return value
	return datetime.fromisoformat(str(value).replace('Z', '+00:00'))

def _clamp(value, low=-1.0, high=1.0):
	return max(low, min(high, value))

def _values(series_payload):
	return [item['value'] for item in series_payload['points']]

def _pct_change(values, periods, offset=0):
	end = len(values) - offset
	start = end - periods - 1
	if start < 0 or end <= 0:
		return 0.0
	base = values[start]
	if not base:
		return 0.0
	return ((values[end - 1] / base) - 1.0) * 100.0

def _abs_change(values, periods, offset=0):
	end = len(values) - offset
	start = end - periods - 1
	if start < 0 or end <= 0:
		return 0.0
	return values[end - 1] - values[start]

def _window_returns(values, periods):
	rows = []
	for index in range(periods, len(values)):
		base = values[index - periods]
		if not base:
			continue
		rows.append(((values[index] / base) - 1.0) * 100.0)
	return rows

def _expected_move(values):
	daily = _window_returns(values[-25:], 1)
	if len(daily) < 10:
		return 0.0
	return statistics.pstdev(daily) * math.sqrt(5.0)

def _confidence(change_30d, expected_move):
	baseline = max(expected_move * 1.4, 0.35)
	return max(0.35, min(0.95, abs(change_30d) / baseline))

def _scenario_buckets(values):
	windows = _window_returns(values, 5)
	if len(windows) < 12:
		return [
			{'label': 'Downside', 'probability': 0.0, 'description': 'Insufficient live history'},
			{'label': 'Base', 'probability': 1.0, 'description': 'Insufficient live history'},
			{'label': 'Upside', 'probability': 0.0, 'description': 'Insufficient live history'},
		]
	threshold = max(statistics.pstdev(windows), 0.2)
	downside = len([item for item in windows if item <= -threshold]) / len(windows)
	upside = len([item for item in windows if item >= threshold]) / len(windows)
	base = max(0.0, 1.0 - downside - upside)
	return [
		{'label': 'Downside', 'probability': round(downside, 2), 'description': 'Five day returns below one sigma'},
		{'label': 'Base', 'probability': round(base, 2), 'description': 'Five day returns inside the expected range'},
		{'label': 'Upside', 'probability': round(upside, 2), 'description': 'Five day returns above one sigma'},
	]

def _stance(change_30d, expected_move):
	threshold = max(expected_move * 0.55, 0.35)
	if change_30d >= threshold:
		return 'Bullish'
	if change_30d <= -threshold:
		return 'Bearish'
	return 'Neutral'

def _skew_label(buckets):
	edge = buckets[2]['probability'] - buckets[0]['probability']
	if edge > 0.08:
		return 'Positive'
	if edge < -0.08:
		return 'Negative'
	return 'Balanced'

def _sparkline(series_payload, size=12):
	points = series_payload['points'][-size:]
	return [{'label': item['date'], 'value': round(item['value'], 4)} for item in points]

def _format_price(symbol, value):
	if symbol == 'BTC':
		return '$' + format(value, ',.0f')
	if symbol == 'XAU':
		return '$' + format(value, ',.2f') + '/oz'
	if symbol == 'EURUSD':
		return format(value, '.4f')
	if symbol in {'US2Y', 'US10Y'}:
		return format(value, '.2f') + '%'
	return format(value, ',.2f')

def _liquidity_input_value(symbol, value):
	if symbol == 'WALCL':
		return '$' + format(value / 1000.0, '.2f') + 'T'
	if symbol == 'NFCI':
		return format(value, '.2f')
	return _format_price(symbol, value)

def _liquidity_inputs(series_map):
	if not {'WALCL', 'US2Y', 'FEDFUNDS', 'DXY', 'NFCI'}.issubset(series_map.keys()):
		return []
	values = {
		'WALCL': _values(series_map['WALCL']),
		'US2Y': _values(series_map['US2Y']),
		'FEDFUNDS': _values(series_map['FEDFUNDS']),
		'DXY': _values(series_map['DXY']),
		'NFCI': _values(series_map['NFCI']),
	}
	return [
		{'label': 'Balance sheet', 'value': _liquidity_input_value('WALCL', values['WALCL'][-1]), 'detail': format(_pct_change(values['WALCL'], 8), '+.2f') + '% / 8w', 'tone': 'Supportive' if _pct_change(values['WALCL'], 8) >= 0 else 'Restrictive'},
		{'label': 'US 2Y', 'value': _liquidity_input_value('US2Y', values['US2Y'][-1]), 'detail': format(_abs_change(values['US2Y'], 20), '+.2f') + ' / 20d', 'tone': 'Supportive' if _abs_change(values['US2Y'], 20) <= 0 else 'Restrictive'},
		{'label': 'Fed funds', 'value': _liquidity_input_value('FEDFUNDS', values['FEDFUNDS'][-1]), 'detail': format(_abs_change(values['FEDFUNDS'], 20), '+.2f') + ' / 20d', 'tone': 'Neutral'},
		{'label': 'Dollar', 'value': _liquidity_input_value('DXY', values['DXY'][-1]), 'detail': format(_pct_change(values['DXY'], 20), '+.2f') + '% / 20d', 'tone': 'Restrictive' if _pct_change(values['DXY'], 20) >= 0 else 'Supportive'},
		{'label': 'NFCI', 'value': _liquidity_input_value('NFCI', values['NFCI'][-1]), 'detail': format(_abs_change(values['NFCI'], 8), '+.2f') + ' / 8w', 'tone': 'Supportive' if _abs_change(values['NFCI'], 8) <= 0 else 'Restrictive'},
	]

def _source_meta(label, source, source_url='', payload=None, mode='live', note=''):
	fetched_at = utc_now().isoformat()
	last_updated = None
	freshness = 'degraded' if mode != 'live' else 'fresh'
	if payload:
		fetched_at = payload.get('fetchedAt', fetched_at)
		last_updated = payload.get('lastUpdated')
	if last_updated:
		age_hours = (utc_now() - _parse_dt(last_updated)).total_seconds() / 3600.0
		if age_hours > 72:
			freshness = 'stale'
		elif age_hours > 24:
			freshness = 'aging'
		else:
			freshness = 'fresh'
	return {
		'label': label,
		'source': source,
		'sourceUrl': source_url or None,
		'fetchedAt': fetched_at,
		'lastUpdated': last_updated,
		'freshness': freshness,
		'mode': mode,
		'note': note,
	}

def _load_series(symbol):
	config = SERIES[symbol]
	return load_fred_series(config['seriesId'], config['sourceUrl'])

def _load_live_news():
	items = []
	statuses = []
	for feed in NEWS_FEEDS:
		try:
			payload = load_rss_feed(feed['cache'], feed['label'], feed['url'])
			statuses.append({'name': feed['label'], 'status': 'live', 'detail': 'Official feed connected', 'mode': 'live'})
			for item in payload['items']:
				items.append({
					'title': item['title'],
					'subtitle': item['summary'] or item['publishedAt'],
					'href': item['link'],
					'mode': 'live',
					'publishedAt': item['publishedAt'],
				})
		except ProviderError as exc:
			statuses.append({'name': feed['label'], 'status': 'degraded', 'detail': str(exc), 'mode': 'fallback'})
	items.sort(key=lambda item: item['publishedAt'], reverse=True)
	return items[:6], statuses

def _session_strip():
	hour = utc_now().hour
	sessions = [
		{'code': 'SYD', 'label': 'Sydney', 'active': hour >= 21 or hour < 6},
		{'code': 'TKY', 'label': 'Tokyo', 'active': hour >= 0 and hour < 9},
		{'code': 'LDN', 'label': 'London', 'active': hour >= 7 and hour < 16},
		{'code': 'NYC', 'label': 'New York', 'active': hour >= 13 and hour < 22},
	]
	active = [item['label'] for item in sessions if item['active']]
	return sessions, ' / '.join(active) if active else 'Off hours'

def _edge_symbols(user_id):
	symbols = []
	for watchlist in list_watchlists(user_id):
		for item in watchlist['items']:
			symbol = item['symbol'].upper()
			if symbol in DEFAULT_EDGE_SYMBOLS and symbol not in symbols:
				symbols.append(symbol)
	for symbol in DEFAULT_EDGE_SYMBOLS:
		if symbol not in symbols:
			symbols.append(symbol)
	return symbols[:7]

def _build_asset_view(symbol, series_payload, regime_context):
	values = _values(series_payload)
	change_1d = _pct_change(values, 1)
	change_30d = _pct_change(values, 20)
	expected_move = _expected_move(values)
	buckets = _scenario_buckets(values)
	confidence = _confidence(change_30d, expected_move)
	return {
		'symbol': symbol,
		'title': SERIES[symbol]['title'],
		'subtitle': 'Source-derived price and model-derived edge estimate',
		'sourceSymbol': SERIES[symbol]['seriesId'],
		'price': _format_price(symbol, values[-1]),
		'change1dPct': round(change_1d, 2),
		'change30dPct': round(change_30d, 2),
		'expectedMove5dPct': round(expected_move, 2),
		'stance': _stance(change_30d, expected_move),
		'skew': _skew_label(buckets),
		'confidence': round(confidence, 2),
		'sampleCount': len(_window_returns(values, 5)),
		'regimeContext': regime_context,
		'sourceFacts': [
			'1d move ' + format(change_1d, '.2f') + '%',
			'30d move ' + format(change_30d, '.2f') + '%',
			'Last print ' + _format_price(symbol, values[-1]),
		],
		'modelFacts': [
			'Expected 5d move ' + format(expected_move, '.2f') + '%',
			'Confidence ' + str(int(confidence * 100)) + '%',
			'Distribution skew ' + _skew_label(buckets),
		],
		'scenarioBuckets': buckets,
		'sparkline': _sparkline(series_payload),
		'freshness': _source_meta('Price tape', 'FRED', SERIES[symbol]['sourceUrl'], series_payload, 'live', 'Official public series'),
	}

def _risk_score(series_map, offset=0):
	score = 0.0
	score += 0.35 * _clamp(_pct_change(_values(series_map['SPX']), 20, offset) / 6.0)
	score += 0.25 * _clamp(_pct_change(_values(series_map['BTC']), 20, offset) / 12.0)
	score -= 0.20 * _clamp(_pct_change(_values(series_map['VIX']), 20, offset) / 15.0)
	score -= 0.10 * _clamp(_pct_change(_values(series_map['DXY']), 20, offset) / 2.5)
	score -= 0.10 * _clamp(_abs_change(_values(series_map['US10Y']), 20, offset) / 0.25)
	return round(score * 100.0, 2)

def _liquidity_score(series_map, offset=0):
	score = 0.0
	score += 0.35 * _clamp(_pct_change(_values(series_map['WALCL']), 8, offset) / 2.5)
	score += 0.20 * _clamp(-_abs_change(_values(series_map['US2Y']), 20, offset) / 0.25)
	score += 0.15 * _clamp(-_pct_change(_values(series_map['DXY']), 20, offset) / 2.5)
	score += 0.15 * _clamp(-_abs_change(_values(series_map['FEDFUNDS']), 20, offset) / 0.20)
	score += 0.15 * _clamp(-_abs_change(_values(series_map['NFCI']), 8, offset) / 0.25)
	return round(score * 100.0, 2)

def _regime_label(score, positive, negative, middle):
	if score >= positive:
		return 'Supportive', 'Improving'
	if score <= negative:
		return 'Restrictive', 'Deteriorating'
	return middle, 'Stable'

def _history_points(series_map, scorer):
	rows = []
	for offset in range(29, -1, -1):
		rows.append({'label': str(offset), 'value': scorer(series_map, offset)})
	return rows

def _regime_block(label, score, delta, interpretation, drivers, history, freshness, positive, negative, middle):
	state, trend = _regime_label(score, positive, negative, middle)
	if delta > 5:
		trend = 'Improving'
	elif delta < -5:
		trend = 'Deteriorating'
	return {
		'label': state if label == 'Liquidity' else ('Risk-on' if score >= positive else 'Risk-off' if score <= negative else middle),
		'score': round(score, 2),
		'delta': round(delta, 2),
		'trend': trend,
		'interpretation': interpretation,
		'drivers': drivers,
		'history': history,
		'freshness': freshness,
	}

def _countdown_label(value):
	scheduled = _parse_dt(value)
	if not scheduled:
		return 'Unscheduled'
	minutes = int((scheduled - reference_now()).total_seconds() / 60)
	if minutes > 0:
		hours, remain = divmod(minutes, 60)
		if hours:
			return str(hours) + 'h ' + str(remain) + 'm'
		return str(remain) + 'm'
	if minutes >= -30:
		return 'Live / near release'
	return 'Released'

def _threshold_text(event):
	if event.get('actual') is not None and event.get('forecast') is not None:
		surprise = event.get('surprise')
		suffix = ' / ' + format(surprise, '.1f') + '% surprise' if surprise is not None else ''
		return 'Actual ' + str(event['actual']) + ' vs forecast ' + str(event['forecast']) + suffix
	if event.get('forecast') is not None:
		return 'Beat if actual exceeds ' + str(event['forecast']) + '; miss if below'
	return 'No threshold model available'

def _pick_catalyst(events):
	active = [item for item in events if item['status'] in {'Live', 'Upcoming'}]
	source = active if active else events
	return source[0] if source else None

def _linked_mode():
	return 'demo' if settings.app_mode == 'demo' else 'live'

def _match_event(event_date, symbol, events):
	target = _parse_dt(event_date)
	if not target:
		return None
	for event in events:
		if event['status'] != 'Released':
			continue
		if symbol not in event['relatedAssets']:
			continue
		scheduled = _parse_dt(event['scheduledAt'])
		if not scheduled:
			continue
		if abs((scheduled.date() - target.date()).days) <= 1:
			return event
	return None

def _track_record(series_map, events):
	records = []
	for symbol in ['SPX', 'BTC', 'XAU', 'DXY']:
		series_payload = series_map.get(symbol)
		if not series_payload:
			continue
		values = _values(series_payload)
		dates = [item['date'] for item in series_payload['points']]
		for index in range(30, len(values) - 5):
			trailing = values[:index + 1]
			change_30d = _pct_change(trailing, 20)
			expected_move = _expected_move(trailing)
			confidence = _confidence(change_30d, expected_move)
			stance = _stance(change_30d, expected_move)
			if confidence < 0.55 or stance == 'Neutral':
				continue
			base = values[index]
			if not base:
				continue
			realized = ((values[index + 5] / base) - 1.0) * 100.0
			hit = (stance == 'Bullish' and realized > 0) or (stance == 'Bearish' and realized < 0)
			linked_event = _match_event(dates[index], symbol, events)
			records.append({
				'symbol': symbol,
				'asOf': dates[index] + 'T00:00:00+00:00',
				'stance': stance,
				'expectedMove5dPct': round(expected_move, 2),
				'realizedMove5dPct': round(realized, 2),
				'outcome': 'Hit' if hit else 'Miss',
				'linkedEventTitle': linked_event['title'] if linked_event else None,
				'linkedEventHref': '/app/events/' + linked_event['id'] if linked_event else None,
			})
	records.sort(key=lambda item: item['asOf'], reverse=True)
	sample = records[:12]
	if len(sample) < 5:
		return {
			'status': 'Limited history',
			'evaluationMode': 'retrospective-model-replay',
			'sampleSize': len(sample),
			'hitRate': None,
			'magnitudeErrorPct': None,
			'note': 'Not enough completed replay windows to claim accuracy yet.',
			'records': sample,
			'freshness': _source_meta('Track record', 'FRED composite', mode='fallback', note='History is still building'),
		}
	hit_rate = len([item for item in sample if item['outcome'] == 'Hit']) / len(sample)
	magnitude_error = sum(abs(abs(item['realizedMove5dPct']) - item['expectedMove5dPct']) for item in sample) / len(sample)
	return {
		'status': 'Retrospective replay',
		'evaluationMode': 'retrospective-model-replay',
		'sampleSize': len(sample),
		'hitRate': round(hit_rate, 2),
		'magnitudeErrorPct': round(magnitude_error, 2),
		'note': 'Signals are replayed over completed five day windows, not logged discretionary calls.',
		'records': sample[:6],
		'freshness': _source_meta('Track record', 'FRED composite', mode='live', note='Backtest over completed model windows'),
	}

def _linked_intelligence(user_id, live_news, events):
	briefings = [
		{'title': item['title'], 'subtitle': item['summary'], 'href': '/app/briefings', 'mode': _linked_mode()}
		for item in list_briefings()[:3]
	]
	watchlists = [
		{'title': item['name'], 'subtitle': str(item['itemCount']) + ' instruments / ' + str(item['alertCount']) + ' alerts', 'href': '/app/watchlists', 'mode': 'live'}
		for item in list_watchlists(user_id)[:3]
	]
	alerts = [
		{'title': item['name'], 'subtitle': item['status'] + ' / ' + item['deliveryChannel'], 'href': '/app/alerts', 'mode': 'live'}
		for item in list_alerts(user_id)[:3]
	]
	catalysts = [
		{'title': item['title'], 'subtitle': item['impact'] + ' / ' + item['status'], 'href': '/app/events/' + item['id'], 'mode': _linked_mode()}
		for item in events[:3]
	]
	return {
		'briefings': briefings,
		'news': live_news[:4],
		'watchlists': watchlists,
		'alerts': alerts,
		'catalysts': catalysts,
	}

def _build_dashboard_payload(user):
	market_status = []
	live_news, news_status = _load_live_news()
	series_map = {}
	for symbol in ['SPX', 'BTC', 'XAU', 'DXY', 'EURUSD', 'US2Y', 'US10Y', 'VIX', 'WALCL', 'FEDFUNDS', 'SOFR', 'NFCI']:
		try:
			series_map[symbol] = _load_series(symbol)
		except ProviderError as exc:
			market_status.append({'name': symbol, 'status': 'degraded', 'detail': str(exc), 'mode': 'fallback'})
	events = list_events()
	catalyst = _pick_catalyst(events)
	if {'SPX', 'BTC', 'XAU', 'DXY', 'US10Y', 'VIX'}.issubset(series_map.keys()):
		risk_score = _risk_score(series_map)
		risk_history = _history_points(series_map, _risk_score)
		risk_delta = risk_score - risk_history[-6]['value']
	else:
		risk_score = 0.0
		risk_history = []
		risk_delta = 0.0
	if {'WALCL', 'US2Y', 'DXY', 'FEDFUNDS', 'NFCI'}.issubset(series_map.keys()):
		liquidity_score = _liquidity_score(series_map)
		liquidity_history = _history_points(series_map, _liquidity_score)
		liquidity_delta = liquidity_score - liquidity_history[-6]['value']
	else:
		liquidity_score = 0.0
		liquidity_history = []
		liquidity_delta = 0.0
	regime_context = 'Risk ' + ('supportive' if risk_score >= 20 else 'mixed' if risk_score > -20 else 'defensive') + ' / liquidity ' + ('supportive' if liquidity_score >= 15 else 'neutral' if liquidity_score > -15 else 'restrictive')
	edge_assets = []
	for symbol in _edge_symbols(user['id']):
		series_payload = series_map.get(symbol)
		if series_payload:
			edge_assets.append(_build_asset_view(symbol, series_payload, regime_context))
	consensus_assets = [
		{
			'symbol': item['symbol'],
			'direction': item['stance'],
			'score': round(50.0 + (item['change30dPct'] * item['confidence']), 2),
			'confidence': item['confidence'],
			'change30dPct': item['change30dPct'],
			'note': item['regimeContext'],
		}
		for item in edge_assets
	]
	consensus_score = round(sum((item['score'] - 50.0) for item in consensus_assets) / max(len(consensus_assets), 1), 2)
	provider_rows = market_status if market_status else [{'name': 'FRED market tape', 'status': 'live', 'detail': 'Official public series connected', 'mode': 'live'}]
	provider_rows.extend(news_status)
	provider_rows.append({'name': 'Catalyst calendar', 'status': 'fallback', 'detail': 'Internal seeded calendar until a live macro schedule provider is attached', 'mode': 'demo' if settings.app_mode == 'demo' else 'fallback'})
	sessions, active_session = _session_strip()
	risk_freshness = _source_meta('Risk regime', 'FRED composite', mode='live' if risk_history else 'fallback', note='Real market regime derived from public series')
	liquidity_freshness = _source_meta('Liquidity regime', 'FRED composite', mode='live' if liquidity_history else 'fallback', note='Liquidity read derived from policy, balance sheet, yields, and dollar')
	if catalyst:
		catalyst_context = [
			'Risk regime ' + ('supports' if risk_score >= 20 else 'does not yet confirm') + ' the current tape',
			'Liquidity regime ' + ('is supportive' if liquidity_score >= 15 else 'remains tight' if liquidity_score <= -15 else 'is neutral'),
			live_news[0]['title'] if live_news else 'No official headline linked',
		]
		key_catalyst = {
			'title': catalyst['title'],
			'status': catalyst['status'],
			'scheduledAt': catalyst['scheduledAt'],
			'countdownLabel': _countdown_label(catalyst['scheduledAt']),
			'impact': catalyst['impact'],
			'country': catalyst['country'],
			'currency': catalyst['currency'],
			'relatedAssets': catalyst['relatedAssets'],
			'threshold': _threshold_text(catalyst),
			'sensitivity': catalyst['whyItMatters'],
			'whyItMatters': catalyst['whyItMatters'],
			'context': catalyst_context,
			'href': '/app/events/' + catalyst['id'],
			'freshness': _source_meta('Catalyst calendar', 'Internal calendar', mode='demo' if settings.app_mode == 'demo' else 'fallback', note='Live economic calendar provider is not configured yet'),
		}
	else:
		key_catalyst = {
			'title': 'No catalyst loaded',
			'status': 'Unavailable',
			'scheduledAt': None,
			'countdownLabel': 'Provider missing',
			'impact': '-',
			'country': '-',
			'currency': '-',
			'relatedAssets': [],
			'threshold': 'No internal or live event is available',
			'sensitivity': 'Catalyst selection is unavailable',
			'whyItMatters': 'Attach a live calendar provider or refresh the internal feed.',
			'context': ['No catalyst context available'],
			'href': '/app/macro-calendar',
			'freshness': _source_meta('Catalyst calendar', 'Internal calendar', mode='fallback', note='No catalyst record available'),
		}
	payload = {
		'generatedAt': utc_now().isoformat(),
		'session': user,
		'hero': {
			'assets': edge_assets,
			'defaultSymbol': edge_assets[0]['symbol'] if edge_assets else '',
			'sourceNote': 'Prices and changes come directly from official public series.',
			'modelNote': 'Expected move, stance, skew, and confidence are derived from rolling market behavior.',
		},
		'keyCatalyst': key_catalyst,
		'riskRegime': _regime_block('Risk', risk_score, risk_delta, 'Cross-asset risk appetite blended from equities, bitcoin, volatility, dollar, and rates.', [
			'SPX and BTC momentum anchor the risk side',
			'Dollar and VIX offset the read when stress rises',
			'10Y yield repricing penalizes the score when duration tightens',
		], risk_history, risk_freshness, 20, -20, 'Balanced'),
		'liquidityRegime': _regime_block('Liquidity', liquidity_score, liquidity_delta, 'Liquidity stance blends Fed balance sheet, front-end yields, funding, conditions, and dollar pressure.', [
			'WALCL and NFCI frame the macro liquidity backdrop',
			'Front-end yields and Fed funds capture policy tightness',
			'Dollar pressure is used as an additional liquidity tax',
		], liquidity_history, liquidity_freshness, 15, -15, 'Neutral'),
		'liquidityInputs': _liquidity_inputs(series_map),
		'marketConsensus': {
			'label': 'Risk is being rewarded' if consensus_score >= 5 else 'Consensus is defensive' if consensus_score <= -5 else 'Consensus is mixed',
			'score': consensus_score,
			'trend30d': 'Improving' if consensus_score > 5 else 'Deteriorating' if consensus_score < -5 else 'Stable',
			'confidence': round(sum(item['confidence'] for item in consensus_assets) / max(len(consensus_assets), 1), 2),
			'sampleSize': len(consensus_assets),
			'note': 'Consensus is aggregated from the live dashboard asset basket rather than seeded bias cards.',
			'href': '/app/market-bias',
			'assets': consensus_assets,
			'freshness': _source_meta('Consensus', 'FRED composite', mode='live' if consensus_assets else 'fallback', note='Derived from live market series'),
		},
		'trackRecord': _track_record(series_map, events),
		'linkedIntelligence': _linked_intelligence(user['id'], live_news, events),
		'utility': {
			'activeSession': active_session,
			'sessions': sessions,
			'refreshedAt': utc_now().isoformat(),
			'providers': provider_rows,
		},
	}
	cache_live_dashboard(user['id'], payload)
	return payload

def dashboard_payload(user, prefer_cache=False, force_refresh=False):
	if prefer_cache and not force_refresh:
		cached = read_live_dashboard_cache(user['id'])
		if cached and cached.get('payload'):
			return cached['payload']
	return _build_dashboard_payload(user)



