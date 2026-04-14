from __future__ import annotations 
 
from datetime import date, datetime, timedelta, timezone 
import json 
import statistics 
import uuid 
 
from .cache import cache_provider_payload, read_provider_payload 
from .calendar_data import calendar_feed 
from .db import fetch_all, get_connection 
from .evaluation_service import latest_evaluation_metadata 
from .market_data import MARKET_INSTRUMENTS, load_market_bundle, load_market_series 
from .providers import ProviderError, load_fred_series 
from .security import utc_now 
from .settings import settings 
from .source_meta import build_source_metadata
 
FACTOR_SERIES = { 
    'US2Y': {'seriesId': 'DGS2', 'sourceUrl': 'https://fred.stlouisfed.org/series/DGS2'}, 
    'US10Y': {'seriesId': 'DGS10', 'sourceUrl': 'https://fred.stlouisfed.org/series/DGS10'}, 
    'DFII10': {'seriesId': 'DFII10', 'sourceUrl': 'https://fred.stlouisfed.org/series/DFII10'}, 
    'BAA10Y': {'seriesId': 'BAA10Y', 'sourceUrl': 'https://fred.stlouisfed.org/series/BAA10Y'}, 
    'WALCL': {'seriesId': 'WALCL', 'sourceUrl': 'https://fred.stlouisfed.org/series/WALCL'}, 
    'RRPONTSYD': {'seriesId': 'RRPONTSYD', 'sourceUrl': 'https://fred.stlouisfed.org/series/RRPONTSYD'}, 
    'WTREGEN': {'seriesId': 'WTREGEN', 'sourceUrl': 'https://fred.stlouisfed.org/series/WTREGEN'}, 
    'WRESBAL': {'seriesId': 'WRESBAL', 'sourceUrl': 'https://fred.stlouisfed.org/series/WRESBAL'}, 
    'NFCI': {'seriesId': 'NFCI', 'sourceUrl': 'https://fred.stlouisfed.org/series/NFCI'}, 
} 
 
REACTION_WINDOWS = [('1d', timedelta(days=1)), ('5d', timedelta(days=5))] 
INTRADAY_WINDOWS = [('1h', timedelta(hours=1)), ('4h', timedelta(hours=4))] 
 
def _provider_key(name: str) -> str: 
    return 'insights:' + name 
 
def _id(prefix: str) -> str: 
    return prefix + '-' + uuid.uuid4().hex[:12] 
 
def _parse_iso(value: str | datetime | None) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        parsed = value
    else:
        raw = str(value).strip()
        if not raw:
            return None
        try:
            parsed = datetime.fromisoformat(raw.replace('Z', '+00:00'))
        except ValueError:
            return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)
def _source_meta(label: str, source: str, payload: dict | None = None, mode: str = 'live', note: str = '') -> dict:
    return build_source_metadata(label, source, payload=payload, mode=mode, note=note)
def _values(series_payload: dict | None) -> list[float]:
    if not isinstance(series_payload, dict):
        return []
    points = series_payload.get('points')
    if not isinstance(points, list):
        return []
    values: list[float] = []
    for item in points:
        if not isinstance(item, dict):
            continue
        try:
            values.append(float(item['value']))
        except (KeyError, TypeError, ValueError):
            continue
    return values
def _pct_change(values: list[float], periods: int) -> float: 
    if len(values) <= periods: 
        return 0.0 
    base = values[-periods - 1] 
    if not base: 
        return 0.0 
    return ((values[-1] / base) - 1.0) * 100.0 
 
def _median(values: list[float]) -> float: 
    ordered = sorted(values) 
    return round(ordered[len(ordered) // 2], 2) 
 
def _direction(score: float, positive: str = 'Supportive', negative: str = 'Restrictive', neutral: str = 'Neutral') -> str: 
    if score >= 20: 
        return positive 
    if score <= -20: 
        return negative 
    return neutral 
 
def _factor_series_map() -> dict[str, dict]: 
    cache_key = _provider_key('factor-series') 
    cached = read_provider_payload(cache_key) 
    if cached and cached.get('payload'): 
        return cached['payload'] 
    payload = {} 
    for name, config in FACTOR_SERIES.items(): 
        payload[name] = load_fred_series(config['seriesId'], config['sourceUrl'], ttl=settings.macro_series_ttl_seconds) 
    cache_provider_payload(cache_key, payload, ttl=settings.macro_series_ttl_seconds) 
    return payload 
 
def build_market_bias_payload() -> dict: 
    cache_key = _provider_key('market-bias') 
    cached = read_provider_payload(cache_key) 
    if cached and cached.get('payload'): 
        return cached['payload'] 
    market_map, failures = load_market_bundle(list(MARKET_INSTRUMENTS.keys()), interval='1d', period='18mo') 
    factor_map = _factor_series_map() 

    factors = []
    missing = dict(failures)

    us10 = _values(factor_map.get('US10Y'))
    us2 = _values(factor_map.get('US2Y'))
    if len(us10) >= 21 and len(us2) >= 21:
        yield_curve_now = us10[-1] - us2[-1]
        yield_curve_then = us10[-21] - us2[-21]
        factors.append({'key': 'yield_curve', 'label': 'Yield curve', 'score': round((yield_curve_now - yield_curve_then) * 100.0, 2), 'detail': '10s2s slope change over 20d', 'source': _source_meta('Yield curve', 'FRED', factor_map.get('US10Y'))})
    else:
        missing.setdefault('yield_curve', 'Insufficient 10s2s history for yield-curve factor')

    real_yields = _values(factor_map.get('DFII10'))
    if len(real_yields) >= 21:
        factors.append({'key': 'real_yields', 'label': 'Real yields', 'score': round(-(real_yields[-1] - real_yields[-21]) * 100.0, 2), 'detail': '10Y TIPS yield change over 20d', 'source': _source_meta('Real yields', 'FRED', factor_map.get('DFII10'))})
    else:
        missing.setdefault('real_yields', 'Insufficient real-yield history for DFII10 factor')

    dxy_payload = market_map.get('DXY')
    dxy_values = _values(dxy_payload)
    if len(dxy_values) >= 21 and isinstance(dxy_payload, dict):
        factors.append({'key': 'dollar_pressure', 'label': 'Dollar pressure', 'score': round(-_pct_change(dxy_values, 20) * 8.0, 2), 'detail': 'DXY trend over 20d', 'source': _source_meta('Dollar pressure', dxy_payload['source'], dxy_payload)})
    else:
        missing.setdefault('DXY', 'Dollar series unavailable for bias factor')

    credit = _values(factor_map.get('BAA10Y'))
    if len(credit) >= 21:
        factors.append({'key': 'credit_spreads', 'label': 'Credit spreads', 'score': round(-(credit[-1] - credit[-21]) * 65.0, 2), 'detail': 'BAA spread change over 20d', 'source': _source_meta('Credit spreads', 'FRED', factor_map.get('BAA10Y'))})
    else:
        missing.setdefault('credit_spreads', 'Insufficient BAA spread history for credit factor')

    walcl = _values(factor_map.get('WALCL'))
    rrp = _values(factor_map.get('RRPONTSYD'))
    tga = _values(factor_map.get('WTREGEN'))
    reserves = _values(factor_map.get('WRESBAL'))
    nfci = _values(factor_map.get('NFCI'))
    if len(walcl) >= 9 and len(rrp) >= 9 and len(tga) >= 9 and len(reserves) >= 9 and len(nfci) >= 9:
        liquidity_score = round((_pct_change(walcl, 8) * 6.0) + (-_pct_change(rrp, 8) * 2.0) + (-_pct_change(tga, 8) * 2.0) + (_pct_change(reserves, 8) * 1.5) + (-(nfci[-1] - nfci[-9]) * 50.0), 2)
        factors.append({'key': 'liquidity_funding', 'label': 'Liquidity / funding', 'score': liquidity_score, 'detail': 'Balance sheet, RRP, TGA, reserves, and NFCI blend', 'source': _source_meta('Liquidity plumbing', 'FRED composite', factor_map.get('WALCL'))})
    else:
        missing.setdefault('liquidity_funding', 'Insufficient liquidity plumbing history for composite factor')

    spx_payload = market_map.get('SPX')
    btc_payload = market_map.get('BTC')
    vix_payload = market_map.get('VIX')
    spx_values = _values(spx_payload)
    btc_values = _values(btc_payload)
    vix_values = _values(vix_payload)
    if len(spx_values) >= 21 and len(btc_values) >= 21 and len(vix_values) >= 21 and isinstance(spx_payload, dict):
        factors.append({'key': 'beta_risk', 'label': 'Equity / beta risk tone', 'score': round((_pct_change(spx_values, 20) * 5.0) + (_pct_change(btc_values, 20) * 1.5) - (_pct_change(vix_values, 20) * 1.5), 2), 'detail': 'SPX, BTC, and VIX blend over 20d', 'source': _source_meta('Beta risk tone', spx_payload['source'], spx_payload)})
    else:
        missing.setdefault('beta_risk', 'Insufficient SPX/BTC/VIX history for beta-risk factor')

    for factor in factors: 
        factor['direction'] = _direction(factor['score']) 
        factor['strength'] = round(min(100.0, abs(factor['score'])), 2) 
        factor['confidence'] = round(min(0.95, max(0.4, abs(factor['score']) / 80.0)), 2) 
        factor['note'] = factor['label'] + ' is ' + factor['direction'].lower() + ' for the current macro tape.' 

    assets = [] 
    live_assets = 0
    fallback_assets = 0
    for symbol in ['SPX', 'NDX', 'DXY', 'US10Y', 'VIX', 'EURUSD', 'XAU', 'BTC']: 
        series_payload = market_map.get(symbol) 
        if not isinstance(series_payload, dict): 
            missing.setdefault(symbol, 'Market series unavailable for this asset')
            continue 
        values = _values(series_payload) 
        if len(values) < 21:
            missing.setdefault(symbol, 'Insufficient market history for this asset')
            continue
        change_1d = round(_pct_change(values, 1), 2) 
        change_30d = round(_pct_change(values, 20), 2) 
        score = max(0.0, min(100.0, 50.0 + (change_30d * 2.0))) 
        mode = str(series_payload.get('mode', 'fallback'))
        if mode == 'live':
            live_assets += 1
        else:
            fallback_assets += 1
            missing.setdefault(symbol, 'Fallback market proxy in use for this asset')
        assets.append({ 
            'symbol': symbol, 
            'name': MARKET_INSTRUMENTS[symbol]['title'], 
            'direction': 'Bullish' if change_30d > 1.0 else 'Bearish' if change_30d < -1.0 else 'Neutral', 
            'score': round(score, 2), 
            'confidence': round(min(0.95, max(0.4, abs(change_30d) / 12.0)), 2), 
            'change1d': change_1d, 
            'change30d': change_30d, 
            'note': series_payload['note'], 
            'freshness': _source_meta('Market bias asset', series_payload['source'], series_payload, note=series_payload['note']), 
        }) 
    assets.sort(key=lambda item: item['confidence'], reverse=True) 

    if factors:
        summary_score = round(sum(item['score'] for item in factors) / len(factors), 2)
        summary_confidence = round(sum(item['confidence'] for item in factors) / len(factors), 2)
        summary_label = _direction(summary_score)
    else:
        summary_score = 50.0
        summary_confidence = 0.4
        summary_label = 'Neutral'

    summary_mode = 'live' if live_assets != 0 and fallback_assets == 0 and len(missing) == 0 else 'fallback'
    summary_note = 'Bias is derived from factor contributions and live market behavior, not seeded copy.'
    if summary_mode != 'live':
        summary_note = 'Bias is running in degraded mode with fallback or missing inputs; provider detail lists gaps explicitly.'

    payload = { 
        'summary': { 
            'label': summary_label, 
            'score': summary_score, 
            'confidence': summary_confidence, 
            'note': summary_note, 
            'freshness': _source_meta('Bias / influencers', 'Composite', mode=summary_mode, note='Market and macro factors combined'), 
        }, 
        'factors': factors, 
        'assets': assets, 
        'providerStatus': {'live': live_assets, 'degraded': fallback_assets + len(missing), 'detail': missing}, 
        'evaluation': latest_evaluation_metadata('bias', 'quality', 'market-bias', fallback_note='Bias quality evaluation is pending.'),
    } 
    cache_provider_payload(cache_key, payload, ttl=settings.dashboard_live_cache_ttl_seconds) 
    return payload 
def _nearest_before_after(points: list[dict], event_time: datetime) -> tuple[tuple[datetime, float] | None, tuple[datetime, float] | None]: 
    before = None 
    after = None 
    for item in points: 
        stamp = _parse_iso(item['date']) 
        if stamp is None: 
            continue 
        value = float(item['value']) 
        if stamp <= event_time: 
            before = (stamp, value) 
        if stamp >= event_time and after is None: 
            after = (stamp, value)
    return before, after 
 
def _move(base: float | None, target: float | None) -> float | None: 
    if base is None or target is None or not base: 
        return None 
    return round(((target / base) - 1.0) * 100.0, 2) 
 
def _future_value(points: list[dict], target_time: datetime) -> float | None: 
    for item in points: 
        stamp = _parse_iso(item['date']) 
        if stamp is not None and stamp >= target_time: 
            return float(item['value']) 
    return None 
 
def _calendar_meta(feed: dict) -> dict:
    freshness = feed.get('freshness')
    if isinstance(freshness, dict):
        mode = str(freshness.get('mode', feed.get('mode', 'fallback')))
        return {
            'mode': mode if mode in {'live', 'demo', 'fallback'} else 'fallback',
            'freshness': str(freshness.get('freshness', 'degraded')),
            'note': str(freshness.get('note', feed.get('note', 'Calendar source note unavailable'))),
        }
    mode = str(feed.get('mode', 'fallback'))
    return {
        'mode': mode if mode in {'live', 'demo', 'fallback'} else 'fallback',
        'freshness': str(feed.get('freshness', 'degraded')),
        'note': str(feed.get('note', 'Calendar source note unavailable')),
    }


def build_reactions_payload(family: str | None = None, asset: str = 'SPX', country: str | None = None, currency: str | None = None) -> dict: 
    cache_key = _provider_key('reactions:' + (family or 'all') + ':' + asset + ':' + (country or 'all') + ':' + (currency or 'all')) 
    cached = read_provider_payload(cache_key) 
    if cached and cached.get('payload'): 
        return cached['payload'] 
    feed = calendar_feed(family=family, days_back=365, days_forward=14) 
    events = [item for item in feed['events'] if item['status'] == 'Released'] 
    if country: 
        events = [item for item in events if item['country'] == country] 
    if currency: 
        events = [item for item in events if item['currency'] == currency] 

    try:
        daily = load_market_series(asset, interval='1d', period='18mo')
    except ProviderError as exc:
        calendar_meta = _calendar_meta(feed)
        payload = {
            'filters': {'family': family or '', 'asset': asset, 'country': country or '', 'currency': currency or ''},
            'familyOptions': sorted(list({item['family'] for item in feed['events']}))[:12],
            'assetOptions': list(MARKET_INSTRUMENTS.keys()),
            'summary': {
                'sampleSize': 0,
                'directionDistribution': {'positive': 0, 'negative': 0, 'flat': 0},
                'windowStats': [],
                'note': 'Market reaction study is unavailable because the market provider is currently down: ' + str(exc),
                'freshness': _source_meta('Reactions', 'Market provider', mode='fallback', note=str(exc)),
            },
            'records': [],
            'calendar': calendar_meta,
            'evaluation': latest_evaluation_metadata('reactions', 'quality', 'event-reaction-windows', fallback_note='Reactions quality evaluation is pending.'),
        }
        cache_provider_payload(cache_key, payload, ttl=settings.reactions_cache_ttl_seconds)
        return payload

    intraday = None 
    try: 
        intraday = load_market_series(asset, interval='60m', period='60d') 
    except ProviderError: 
        intraday = None 

    records = [] 
    for event in events: 
        event_time = _parse_iso(event['scheduledAt']) 
        if event_time is None: 
            continue 
        windows = {} 
        if intraday and intraday.get('mode') == 'live': 
            before, after = _nearest_before_after(intraday['points'], event_time) 
            if before and after and after[0] != before[0]: 
                immediate = _move(before[1], after[1]) 
                if immediate is not None: 
                    windows['immediate'] = immediate 
            base_intraday = after[1] if after else None 
            for label, delta in INTRADAY_WINDOWS: 
                target_value = _future_value(intraday['points'], event_time + delta) 
                move = _move(base_intraday, target_value) 
                if move is not None: 
                    windows[label] = move 
        daily_base = _future_value(daily['points'], event_time) 
        for label, delta in REACTION_WINDOWS: 
            move = _move(daily_base, _future_value(daily['points'], event_time + delta)) 
            if move is not None: 
                windows[label] = move 
        if not windows: 
            continue 
        records.append({'eventId': event['id'], 'title': event['title'], 'family': event['family'], 'scheduledAt': event['scheduledAt'], 'country': event['country'], 'currency': event['currency'], 'href': '/app/events/' + event['id'], 'windows': windows}) 
    available_windows = [] 
    for candidate in ['immediate', '1h', '4h', '1d', '5d']: 
        if any(candidate in item['windows'] for item in records): 
            available_windows.append(candidate) 
    stats = [] 
    for window in available_windows: 
        moves = [item['windows'][window] for item in records if window in item['windows']] 
        if not moves: 
            continue 
        stats.append({'window': window, 'sampleSize': len(moves), 'meanMovePct': round(sum(moves) / len(moves), 2), 'medianMovePct': _median(moves), 'positiveHitRate': round(len([item for item in moves if item > 0]) / len(moves), 2), 'negativeHitRate': round(len([item for item in moves if item < 0]) / len(moves), 2)}) 

    calendar_meta = _calendar_meta(feed)
    payload = {
        'filters': {'family': family or '', 'asset': asset, 'country': country or '', 'currency': currency or ''},
        'familyOptions': sorted(list({item['family'] for item in feed['events']}))[:12],
        'assetOptions': list(MARKET_INSTRUMENTS.keys()),
        'summary': {
            'sampleSize': len(records),
            'directionDistribution': {
                'positive': len([item for item in records if item['windows'].get('1d', 0) > 0]),
                'negative': len([item for item in records if item['windows'].get('1d', 0) < 0]),
                'flat': len([item for item in records if item['windows'].get('1d', 0) == 0]),
            },
            'windowStats': stats,
            'note': 'Only windows supportable by the available market resolution are included.',
            'freshness': _source_meta('Reactions', daily['source'], daily, note='Event windows are built from real market history and live or fallback calendar events.'),
        },
        'records': records[:60],
        'calendar': calendar_meta,
        'evaluation': latest_evaluation_metadata('reactions', 'quality', 'event-reaction-windows', fallback_note='Reactions quality evaluation is pending.'),
    }
    cache_provider_payload(cache_key, payload, ttl=settings.reactions_cache_ttl_seconds)
    return payload
def build_track_record_payload() -> dict: 
    cache_key = _provider_key('track-record') 
    cached = read_provider_payload(cache_key) 
    if cached and cached.get('payload'): 
        return cached['payload'] 
    records = [] 
    by_asset = [] 
    by_regime = {'Supportive': [], 'Restrictive': [], 'Neutral': []} 
    for symbol in ['SPX', 'NDX', 'DXY', 'US10Y', 'XAU', 'BTC']:
        try:
            series_payload = load_market_series(symbol, interval='1d', period='18mo')
        except ProviderError:
            continue
        values = _values(series_payload)
        if len(values) < 36:
            continue
        asset_records = []
        for index in range(30, len(values) - 5):
            change_20d = _pct_change(values[:index + 1], 20)
            stance = 'Bullish' if change_20d > 1.0 else 'Bearish' if change_20d < -1.0 else 'Neutral'
            if stance == 'Neutral':
                continue
            base = values[index]
            realized = ((values[index + 5] / base) - 1.0) * 100.0
            expected = abs(change_20d)
            hit = (stance == 'Bullish' and realized > 0) or (stance == 'Bearish' and realized < 0)
            regime = _direction(change_20d)
            record = {'symbol': symbol, 'asOf': series_payload['points'][index]['date'], 'stance': stance, 'expectedMove5dPct': round(expected, 2), 'realizedMove5dPct': round(realized, 2), 'outcome': 'Hit' if hit else 'Miss', 'signalType': 'trend-regime replay', 'family': None, 'href': None, 'regime': regime}
            asset_records.append(record)
            records.append(record)
            by_regime[regime].append(record)
        if asset_records:
            by_asset.append({'asset': symbol, 'sampleSize': len(asset_records), 'hitRate': round(len([item for item in asset_records if item['outcome'] == 'Hit']) / len(asset_records), 2), 'magnitudeErrorPct': round(sum(abs(abs(item['realizedMove5dPct']) - item['expectedMove5dPct']) for item in asset_records) / len(asset_records), 2)})
    records.sort(key=lambda item: item['asOf'], reverse=True)
    sample = records[:120]
    by_regime_rows = []
    for label, items in by_regime.items():
        if not items:
            continue
        by_regime_rows.append({'regime': label, 'sampleSize': len(items), 'hitRate': round(len([item for item in items if item['outcome'] == 'Hit']) / len(items), 2)})
    payload = {'mode': 'replay', 'label': 'Replay only', 'sampleSize': len(sample), 'hitRate': round(len([item for item in sample if item['outcome'] == 'Hit']) / max(len(sample), 1), 2) if sample else None, 'magnitudeErrorPct': round(sum(abs(abs(item['realizedMove5dPct']) - item['expectedMove5dPct']) for item in sample) / max(len(sample), 1), 2) if sample else None, 'bySignalType': [{'signalType': 'trend-regime replay', 'sampleSize': len(sample), 'hitRate': round(len([item for item in sample if item['outcome'] == 'Hit']) / max(len(sample), 1), 2) if sample else None}], 'byAsset': by_asset, 'byEventFamily': [], 'byRegime': by_regime_rows, 'recentRecords': sample[:30], 'note': 'Track record is replayed over completed windows and is not audited live discretionary PnL.', 'freshness': _source_meta('Track record', 'Composite replay', mode='fallback', note='Replay statistics built from real market history'), 'evaluation': latest_evaluation_metadata('track-record', 'quality', 'replay', fallback_note='Track-record calibration evaluation is pending.')}
    cache_provider_payload(cache_key, payload, ttl=settings.track_record_cache_ttl_seconds)
    return payload
def _week_bounds(today: date | None = None) -> tuple[date, date]: 
    current = today or utc_now().date() 
    start = current - timedelta(days=current.weekday()) 
    return start + timedelta(days=0), start + timedelta(days=6)
 
def _report_payload() -> dict: 
    bias = build_market_bias_payload() 
    reactions = build_reactions_payload() 
    track_record = build_track_record_payload() 
    catalysts = calendar_feed(days_back=3, days_forward=14)['events'][:6] 
    week_start, week_end = _week_bounds() 
    assets = bias['assets'][:4] 
    factors = bias['factors'][:4] 
    summary = 'Weekly macro brief for ' + week_start.isoformat() + ' to ' + week_end.isoformat() + ': ' + bias['summary']['label'] + ' bias with ' + str(len(catalysts)) + ' catalysts in focus.' 
    return {'id': _id('report'), 'slug': 'weekly-' + week_start.isoformat(), 'title': 'Weekly Macro Brief', 'status': 'ready', 'mode': 'deterministic', 'weekStart': week_start.isoformat(), 'weekEnd': week_end.isoformat(), 'summary': summary, 'body': {'regime': bias['summary'], 'factors': factors, 'assets': assets, 'topCatalysts': catalysts, 'reactions': reactions['summary'], 'trackRecord': {'label': track_record['label'], 'hitRate': track_record['hitRate'], 'sampleSize': track_record['sampleSize']}, 'watchItems': [item['label'] + ': ' + item['note'] for item in factors[:3]]}, 'sourceMeta': [bias['summary']['freshness'], reactions['summary']['freshness'], track_record['freshness']], 'createdAt': utc_now().isoformat()} 
 
def generate_weekly_report(persist: bool = True) -> dict: 
    payload = _report_payload() 
    if persist: 
        with get_connection() as conn: 
            with conn.cursor() as cur: 
                cur.execute('insert into macro_reports (id, slug, title, status, mode, week_start, week_end, summary, body, source_meta) values (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb) on conflict (slug) do update set title = excluded.title, status = excluded.status, mode = excluded.mode, week_start = excluded.week_start, week_end = excluded.week_end, summary = excluded.summary, body = excluded.body, source_meta = excluded.source_meta', (payload['id'], payload['slug'], payload['title'], payload['status'], payload['mode'], payload['weekStart'], payload['weekEnd'], payload['summary'], json.dumps(payload['body']), json.dumps(payload['sourceMeta']))) 
    cache_provider_payload(_provider_key('reports'), [payload], ttl=settings.reports_cache_ttl_seconds) 
    return payload 
 
def list_reports(limit: int = 12) -> list[dict]: 
    cache_key = _provider_key('reports') 
    cached = read_provider_payload(cache_key) 
    if cached and cached.get('payload'): 
        return cached['payload'][:limit] 
    rows = fetch_all('select id, slug, title, status, mode, week_start, week_end, summary, body, source_meta, created_at from macro_reports order by week_start desc, created_at desc limit %s', (limit,)) 
    reports = [{'id': row['id'], 'slug': row['slug'], 'title': row['title'], 'status': row['status'], 'mode': row['mode'], 'weekStart': row['week_start'].isoformat(), 'weekEnd': row['week_end'].isoformat(), 'summary': row['summary'], 'body': row['body'], 'sourceMeta': row['source_meta'], 'createdAt': row['created_at'].isoformat()} for row in rows] 
    if not reports: 
        reports = [generate_weekly_report(persist=False)] 
    cache_provider_payload(cache_key, reports, ttl=settings.reports_cache_ttl_seconds) 
    return reports 









