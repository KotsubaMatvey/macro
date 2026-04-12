from pathlib import Path
import importlib.util
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def load_worker_module():
    worker_path = Path(__file__).resolve().parents[2] / 'worker' / 'main.py'
    spec = importlib.util.spec_from_file_location('worker_main', worker_path)
    assert spec and spec.loader
    worker = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(worker)
    return worker


def demo_user():
    return {'id': 'user-demo', 'email': 'demo@macroaccess.local', 'name': 'Demo', 'role': 'user', 'onboardingCompleted': True, 'emailVerified': True}


def test_refresh_demo_market_state_invalidates_provider_payloads_and_refreshes_live_dashboard(monkeypatch):
    worker = load_worker_module()
    calls = []

    monkeypatch.setattr(worker, '_invalidate_market_provider_cache', lambda: calls.append(('invalidate_market_provider_cache',)))
    monkeypatch.setattr(worker, 'invalidate_market_bundle', lambda symbols: calls.append(('invalidate_market_bundle', list(symbols))))
    monkeypatch.setattr(worker, '_invalidate_provider_prefixes', lambda prefixes: calls.append(('invalidate_provider_prefixes', list(prefixes))))
    monkeypatch.setattr(worker, 'load_market_bundle', lambda symbols, interval='1d', period='18mo': calls.append(('load_market_bundle', list(symbols), interval, period)))
    monkeypatch.setattr(worker, 'build_market_bias_payload', lambda: calls.append(('build_market_bias_payload',)))
    monkeypatch.setattr(worker, '_job_users', lambda job_type, payload: [demo_user()])
    monkeypatch.setattr(worker, '_refresh_users', lambda users, refresh_workstation=False, refresh_live_dashboard=False: calls.append(('refresh_users', [user['id'] for user in users], refresh_workstation, refresh_live_dashboard)))

    worker._refresh_demo_market_state('refresh_demo_market_state', {'userId': 'user-demo'})

    assert ('invalidate_market_provider_cache',) in calls
    assert ('invalidate_provider_prefixes', ['insights:market-bias', 'insights:reactions:', 'insights:track-record', 'insights:reports']) in calls
    assert ('build_market_bias_payload',) in calls
    assert ('refresh_users', ['user-demo'], False, True) in calls


def test_refresh_dashboard_cache_job_only_rebuilds_live_dashboard(monkeypatch):
    worker = load_worker_module()
    calls = []

    monkeypatch.setattr(worker, '_job_users', lambda job_type, payload: [demo_user()])
    monkeypatch.setattr(worker, '_refresh_users', lambda users, refresh_workstation=False, refresh_live_dashboard=False: calls.append(([user['id'] for user in users], refresh_workstation, refresh_live_dashboard)))

    worker._refresh_dashboard_cache('refresh_dashboard_cache', {'userId': 'user-demo'})

    assert calls == [(['user-demo'], False, True)]


def test_recompute_regime_refreshes_only_live_dashboard(monkeypatch):
    worker = load_worker_module()
    calls = []

    monkeypatch.setattr(worker, '_job_users', lambda job_type, payload: [demo_user()])
    monkeypatch.setattr(worker, '_refresh_users', lambda users, refresh_workstation=False, refresh_live_dashboard=False: calls.append(([user['id'] for user in users], refresh_workstation, refresh_live_dashboard)))

    worker._recompute_regime('recompute_regime', {'userId': 'user-demo'})

    assert calls == [(['user-demo'], False, True)]


def test_recompute_market_bias_invalidates_bias_cache_then_rebuilds(monkeypatch):
    worker = load_worker_module()
    calls = []

    monkeypatch.setattr(worker, '_invalidate_provider_names', lambda names: calls.append(('names', list(names))))
    monkeypatch.setattr(worker, '_invalidate_provider_prefixes', lambda prefixes: calls.append(('prefixes', list(prefixes))))
    monkeypatch.setattr(worker, 'build_market_bias_payload', lambda: calls.append(('bias',)))
    monkeypatch.setattr(worker, '_job_users', lambda job_type, payload: [demo_user()])
    monkeypatch.setattr(worker, '_refresh_users', lambda users, refresh_workstation=False, refresh_live_dashboard=False: calls.append(('refresh', [user['id'] for user in users], refresh_workstation, refresh_live_dashboard)))

    worker._recompute_market_bias('recompute_market_bias', {'userId': 'user-demo'})

    assert ('names', ['insights:market-bias']) in calls
    assert ('prefixes', ['insights:reports']) in calls
    assert ('bias',) in calls
    assert ('refresh', ['user-demo'], True, True) in calls


def test_evaluate_alerts_defaults_to_alert_scoped_users(monkeypatch):
    worker = load_worker_module()
    alert_users = [
        demo_user(),
        {'id': 'user-analyst', 'email': 'analyst@macroaccess.local', 'name': 'Analyst', 'role': 'analyst', 'onboardingCompleted': True, 'emailVerified': True},
    ]

    monkeypatch.setattr(worker, '_users_with_active_alerts', lambda: alert_users)

    assert worker._job_users('evaluate_alerts', {}) == alert_users


def test_evaluate_alerts_explicit_scope_bypasses_alert_lookup(monkeypatch):
    worker = load_worker_module()
    rows = [
        {'id': 'user-demo', 'email': 'demo@macroaccess.local', 'name': 'Demo', 'role': 'user', 'onboarding_completed': True, 'email_verified_at': '2026-04-01T00:00:00+00:00'},
    ]

    def fail_alert_lookup():
        raise AssertionError('alert lookup should not run when explicit user scope is provided')

    monkeypatch.setattr(worker, '_users_with_active_alerts', fail_alert_lookup)
    monkeypatch.setattr(worker, '_load_users', lambda user_ids=None: rows if user_ids == ['user-demo'] else [])

    assert worker._job_users('evaluate_alerts', {'userId': 'user-demo', 'userIds': ['user-demo']}) == [demo_user()]


def test_recompute_reactions_respects_asset_scope_and_does_not_rebuild_dashboards(monkeypatch):
    worker = load_worker_module()
    calls = []

    monkeypatch.setattr(worker, '_invalidate_provider_prefixes', lambda prefixes: calls.append(('invalidate', tuple(prefixes))))
    monkeypatch.setattr(worker, 'build_reactions_payload', lambda asset='SPX', family=None, country=None, currency=None: calls.append(('reactions', asset)))
    monkeypatch.setattr(worker, '_job_users', lambda job_type, payload: [demo_user()])
    monkeypatch.setattr(worker, '_refresh_users', lambda users, refresh_workstation=False, refresh_live_dashboard=False: calls.append(('refresh', refresh_workstation, refresh_live_dashboard)))

    worker._recompute_reactions('recompute_reactions', {'assets': ['xau', 'spx']})

    assert ('invalidate', ('insights:reactions:', 'insights:reports')) in calls
    assert ('reactions', 'XAU') in calls
    assert ('reactions', 'SPX') in calls
    assert ('refresh', False, False) in calls


def test_refresh_market_prices_invalidates_market_and_dependent_caches(monkeypatch):
    worker = load_worker_module()
    calls = []

    monkeypatch.setattr(worker, 'invalidate_market_bundle', lambda symbols: calls.append(('market', list(symbols))))
    monkeypatch.setattr(worker, '_invalidate_provider_prefixes', lambda prefixes: calls.append(('prefixes', list(prefixes))))
    monkeypatch.setattr(worker, 'load_market_bundle', lambda symbols, interval='1d', period='18mo': calls.append(('load', list(symbols), interval, period)))
    monkeypatch.setattr(worker, 'build_market_bias_payload', lambda: calls.append(('bias',)))
    monkeypatch.setattr(worker, '_job_users', lambda job_type, payload: [demo_user()])
    monkeypatch.setattr(worker, '_refresh_users', lambda users, refresh_workstation=False, refresh_live_dashboard=False: calls.append(('refresh', refresh_workstation, refresh_live_dashboard)))

    worker._refresh_market_prices('refresh_market_prices', {'symbols': ['SPX', 'DXY']})

    assert ('market', ['SPX', 'DXY']) in calls
    assert ('prefixes', ['insights:market-bias', 'insights:reactions:', 'insights:track-record', 'insights:reports']) in calls
    assert ('load', ['SPX', 'DXY'], '1d', '18mo') in calls
    assert ('bias',) in calls
    assert ('refresh', False, True) in calls


def test_refresh_calendar_events_invalidates_calendar_and_dependent_insights(monkeypatch):
    worker = load_worker_module()
    calls = []

    monkeypatch.setattr(worker, '_invalidate_provider_prefixes', lambda prefixes: calls.append(('prefixes', list(prefixes))))
    monkeypatch.setattr(worker, 'calendar_feed', lambda days_back=30, days_forward=60, prefer_cache=False: calls.append(('calendar_feed', days_back, days_forward, prefer_cache)))
    monkeypatch.setattr(worker, '_job_users', lambda job_type, payload: [demo_user()])
    monkeypatch.setattr(worker, '_refresh_users', lambda users, refresh_workstation=False, refresh_live_dashboard=False: calls.append(('refresh', refresh_workstation, refresh_live_dashboard)))

    worker._refresh_calendar_events('refresh_calendar_events', {'userId': 'user-demo'})

    assert ('prefixes', ['calendar:', 'insights:reactions:', 'insights:reports']) in calls
    assert ('calendar_feed', 30, 60, False) in calls
    assert ('refresh', True, True) in calls


def test_recompute_track_record_targets_replay_and_reports_only(monkeypatch):
    worker = load_worker_module()
    calls = []

    monkeypatch.setattr(worker, '_invalidate_provider_names', lambda names: calls.append(('names', list(names))))
    monkeypatch.setattr(worker, '_invalidate_provider_prefixes', lambda prefixes: calls.append(('prefixes', list(prefixes))))
    monkeypatch.setattr(worker, 'build_track_record_payload', lambda: calls.append(('track_record',)))
    monkeypatch.setattr(worker, '_job_users', lambda job_type, payload: [demo_user()])
    monkeypatch.setattr(worker, '_refresh_users', lambda users, refresh_workstation=False, refresh_live_dashboard=False: calls.append(('refresh', refresh_workstation, refresh_live_dashboard)))

    worker._recompute_track_record('recompute_track_record', {'userId': 'user-demo'})

    assert ('names', ['insights:track-record']) in calls
    assert ('prefixes', ['insights:reports']) in calls
    assert ('track_record',) in calls
    assert ('refresh', False, True) in calls


def test_generate_weekly_report_rebuilds_reports_without_user_refresh(monkeypatch):
    worker = load_worker_module()
    calls = []

    monkeypatch.setattr(worker, '_invalidate_provider_prefixes', lambda prefixes: calls.append(('prefixes', list(prefixes))))
    monkeypatch.setattr(worker, 'build_weekly_report', lambda persist=True: calls.append(('report', persist)))
    monkeypatch.setattr(worker, '_refresh_users', lambda users, refresh_workstation=False, refresh_live_dashboard=False: calls.append(('refresh', refresh_workstation, refresh_live_dashboard)))

    worker._generate_weekly_report('generate_weekly_report', {'userId': 'user-demo'})

    assert ('prefixes', ['insights:reports']) in calls
    assert ('report', True) in calls
    assert not any(item[0] == 'refresh' for item in calls)


def test_ingest_official_news_invalidates_only_official_feeds_and_refreshes_both_views(monkeypatch):
    worker = load_worker_module()
    calls = []

    monkeypatch.setattr(worker, '_invalidate_news_provider_cache', lambda include_official=True, include_discovery=True: calls.append(('invalidate_news', include_official, include_discovery)))
    monkeypatch.setattr(worker, 'ingest_news_sources', lambda include_official=True, include_discovery=True, item_limit=12: calls.append(('ingest', include_official, include_discovery)))
    monkeypatch.setattr(worker, '_job_users', lambda job_type, payload: [demo_user()])
    monkeypatch.setattr(worker, '_refresh_users', lambda users, refresh_workstation=False, refresh_live_dashboard=False: calls.append(('refresh', refresh_workstation, refresh_live_dashboard)))

    worker._ingest_official_news('ingest_official_news', {'userId': 'user-demo'})

    assert ('invalidate_news', True, False) in calls
    assert ('ingest', True, False) in calls
    assert ('refresh', True, True) in calls


def test_refresh_news_cache_runs_full_news_pipeline_with_targeted_refresh(monkeypatch):
    worker = load_worker_module()
    calls = []

    monkeypatch.setattr(worker, '_invalidate_news_provider_cache', lambda include_official=True, include_discovery=True: calls.append(('invalidate_news', include_official, include_discovery)))
    monkeypatch.setattr(worker, 'ingest_news_sources', lambda include_official=True, include_discovery=True, item_limit=12: calls.append(('ingest', include_official, include_discovery)))
    monkeypatch.setattr(worker, 'rebuild_news_rankings_service', lambda lookback_hours=120: calls.append(('rankings', lookback_hours)))
    monkeypatch.setattr(worker, '_job_users', lambda job_type, payload: [demo_user()])
    monkeypatch.setattr(worker, '_refresh_users', lambda users, refresh_workstation=False, refresh_live_dashboard=False: calls.append(('refresh', refresh_workstation, refresh_live_dashboard)))

    worker._refresh_news_cache('refresh_news_cache', {'userId': 'user-demo'})

    assert ('invalidate_news', True, True) in calls
    assert ('ingest', True, True) in calls
    assert ('rankings', 120) in calls
    assert ('refresh', True, True) in calls
