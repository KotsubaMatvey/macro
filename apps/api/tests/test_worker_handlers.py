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


def test_refresh_demo_market_state_invalidates_provider_payloads_and_refreshes_workstation_and_live_dashboard(monkeypatch):
    worker = load_worker_module()
    calls = []

    monkeypatch.setattr(worker, '_invalidate_market_provider_cache', lambda: calls.append(('invalidate',)))
    monkeypatch.setattr(worker, '_job_users', lambda job_type, payload: [demo_user()])
    monkeypatch.setattr(worker, '_refresh_users', lambda users, refresh_workstation=False, refresh_live_dashboard=False: calls.append(('refresh', [user['id'] for user in users], refresh_workstation, refresh_live_dashboard)))

    worker._refresh_demo_market_state('refresh_demo_market_state', {'userId': 'user-demo'})

    assert calls == [('invalidate',), ('refresh', ['user-demo'], True, True)]


def test_refresh_dashboard_cache_job_only_rebuilds_live_dashboard(monkeypatch):
    worker = load_worker_module()
    calls = []

    monkeypatch.setattr(worker, '_job_users', lambda job_type, payload: [demo_user()])
    monkeypatch.setattr(worker, '_refresh_users', lambda users, refresh_workstation=False, refresh_live_dashboard=False: calls.append(([user['id'] for user in users], refresh_workstation, refresh_live_dashboard)))

    worker._refresh_dashboard_cache('refresh_dashboard_cache', {'userId': 'user-demo'})

    assert calls == [(['user-demo'], False, True)]


def test_recompute_market_bias_rebuilds_workstation_and_live_dashboard(monkeypatch):
    worker = load_worker_module()
    calls = []

    monkeypatch.setattr(worker, '_job_users', lambda job_type, payload: [demo_user()])
    monkeypatch.setattr(worker, '_refresh_users', lambda users, refresh_workstation=False, refresh_live_dashboard=False: calls.append(([user['id'] for user in users], refresh_workstation, refresh_live_dashboard)))

    worker._recompute_market_bias('recompute_market_bias', {'userId': 'user-demo'})

    assert calls == [(['user-demo'], True, True)]


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
