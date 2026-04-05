from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import psycopg
import pytest

from app.settings import settings

def database_available():
    try:
        with psycopg.connect(settings.database_url, connect_timeout=1):
            return True
    except Exception:
        return False

_DB_AVAILABLE = database_available()
pytestmark = pytest.mark.skipif(not _DB_AVAILABLE, reason='Postgres unavailable for API integration tests')

if _DB_AVAILABLE:
    from fastapi.testclient import TestClient
    from app.main import app
    from app.seed import seed_demo_database

    client = TestClient(app)
else:
    client = None
 
def reset_demo(): 
    seed_demo_database() 
    client.cookies.clear() 
 
def sign_in(email='demo@macroaccess.local', password='demo12345'): 
    response = client.post('/api/v1/auth/sign-in', json={'email': email, 'password': password}) 
    assert response.status_code == 200, response.text 
    return response 
 
def test_health(): 
    response = client.get('/health') 
    assert response.status_code == 200 
    assert response.json()['status'] == 'ok' 
 
def test_demo_sign_in_and_workstation_flow(): 
    reset_demo() 
    sign_in() 
    response = client.get('/api/v1/workstation') 
    assert response.status_code == 200 
    payload = response.json() 
    assert payload['session']['email'] == 'demo@macroaccess.local' 
    assert payload['regime']['label'] == 'Expansionary' 
    assert payload['nextEvents'] 
    assert payload['watchlists'] 
    assert payload['alerts']
 
def test_sign_up_verify_and_sign_in_new_user(): 
    reset_demo() 
    email = 'new-' + __import__('uuid').uuid4().hex[:6] + '@macroaccess.local'
    signup = client.post('/api/v1/auth/sign-up', json={'email': email, 'password': 'pass12345', 'name': 'New User'})
    verify = client.post('/api/v1/auth/verify-email', json={'token': signup.json()['token']}) 
    assert verify.status_code == 200, verify.text 
    signin = client.post('/api/v1/auth/sign-in', json={'email': email, 'password': 'pass12345'})
    assert signin.status_code == 200, signin.text 
    assert signin.json()['email'] == email
 
def test_password_reset_flow(): 
    reset_demo() 
    issued = client.post('/api/v1/auth/request-password-reset', json={'email': 'demo@macroaccess.local'}) 
    assert issued.status_code == 200, issued.text 
    reset = client.post('/api/v1/auth/reset-password', json={'token': issued.json()['token'], 'password': 'demo54321'}) 
    assert reset.status_code == 200, reset.text 
    signin = client.post('/api/v1/auth/sign-in', json={'email': 'demo@macroaccess.local', 'password': 'demo54321'}) 
    assert signin.status_code == 200, signin.text 
 
def test_events_and_event_detail_are_backed_by_seeded_data(): 
    reset_demo() 
    sign_in() 
    events = client.get('/api/v1/events') 
    assert events.status_code == 200 
    assert any(item['id'] == 'event-cpi-mar' for item in events.json()) 
    detail = client.get('/api/v1/events/event-cpi-mar') 
    assert detail.status_code == 200 
    body = detail.json() 
    assert body['slug'] == 'us-cpi-mar' 
    assert body['historicalReactions'] 
    assert body['linkedBriefings']
 
def test_watchlist_and_alert_creation(): 
    reset_demo() 
    sign_in() 
    created = client.post('/api/v1/watchlists', json={'name': 'FX Desk', 'description': 'Dollar and euro'}) 
    assert created.status_code == 200, created.text 
    watchlist_id = created.json()['detail'] 
    added = client.post('/api/v1/watchlists/' + watchlist_id + '/items', json={'symbol': 'EURUSD', 'itemType': 'asset', 'note': 'ECB reaction'}) 
    assert added.status_code == 200, added.text 
    alert = client.post('/api/v1/alerts', json={'name': 'EURUSD event alert', 'triggerType': 'asset_threshold', 'targetRef': 'EURUSD', 'thresholdValue': '1.10', 'deliveryChannel': 'In-app'}) 
    assert alert.status_code == 200, alert.text 
    watchlists = client.get('/api/v1/watchlists') 
    assert watchlists.status_code == 200 
    assert any(item['name'] == 'FX Desk' for item in watchlists.json()) 
    alerts = client.get('/api/v1/alerts') 
    assert alerts.status_code == 200 
    assert any(item['name'] == 'EURUSD event alert' for item in alerts.json()) 
 
def test_admin_summary_requires_admin_role(): 
    reset_demo() 
    sign_in() 
    forbidden = client.get('/api/v1/admin/summary') 
    assert forbidden.status_code == 403 
    client.post('/api/v1/auth/sign-out') 
    sign_in('admin@macroaccess.local', 'admin12345') 
    allowed = client.get('/api/v1/admin/summary') 
    assert allowed.status_code == 200 
    summary = allowed.json() 
    assert summary['users'] 
    assert summary['queuedJobs'] 
 
def test_community_post_and_comment_flow(): 
    reset_demo() 
    sign_in() 
    post = client.post('/api/v1/community/posts', json={'title': 'Desk note', 'body': 'Watching CPI and front end.'}) 
    assert post.status_code == 200, post.text 
    post_id = post.json()['detail'] 
    comment = client.post('/api/v1/community/posts/' + post_id + '/comments', json={'body': 'Need euro follow through too.'}) 
    assert comment.status_code == 200, comment.text 
    feed = client.get('/api/v1/community/posts') 
    assert feed.status_code == 200 
    assert any(item['title'] == 'Desk note' for item in feed.json()) 

def test_event_detail_by_slug_route_is_dynamic():
    reset_demo()
    sign_in()
    detail = client.get('/api/v1/events/us-cpi-mar')
    assert detail.status_code == 200
    assert detail.json()['id'] == 'event-cpi-mar'

def test_sign_in_rejects_invalid_password():
    reset_demo()
    bad = client.post('/api/v1/auth/sign-in', json={'email': 'demo@macroaccess.local', 'password': 'wrong-password'})
    assert bad.status_code == 400

def test_onboarding_persistence_updates_session_state():
    reset_demo()
    sign_in()
    updated = client.post('/api/v1/onboarding', json={'desk': 'macro', 'timezone': 'Europe/Moscow', 'region': 'Global', 'density': 'dense', 'bio': 'desk note'})
    assert updated.status_code == 200
    session = client.get('/api/v1/auth/session')
    assert session.status_code == 200
    assert session.json()['onboardingCompleted'] is True

def test_watchlist_mutation_invalidates_workstation_cache():
    reset_demo()
    sign_in()
    first = client.get('/api/v1/workstation').json()
    before = len(first['watchlists'])
    created = client.post('/api/v1/watchlists', json={'name': 'Cache test', 'description': 'cache'})
    assert created.status_code == 200
    second = client.get('/api/v1/workstation').json()
    assert len(second['watchlists']) == before + 1

def test_worker_job_types_transition_to_completed(monkeypatch):
	reset_demo()
	import importlib.util
	from pathlib import Path
	from app.db import fetch_one
	from app.services import create_job

	worker_path = Path(__file__).resolve().parents[2] / 'worker' / 'main.py'
	spec = importlib.util.spec_from_file_location('worker_main', worker_path)
	assert spec and spec.loader
	worker = importlib.util.module_from_spec(spec)
	spec.loader.exec_module(worker)

	calls = []
	monkeypatch.setattr(worker, 'invalidate_provider_payload', lambda key: calls.append(('provider', key)))
	monkeypatch.setattr(worker, 'workstation_payload', lambda user, prefer_cache=False, force_refresh=False: calls.append(('workstation', user['id'], force_refresh)))
	monkeypatch.setattr(worker, 'dashboard_payload', lambda user, prefer_cache=False, force_refresh=False: calls.append(('dashboard', user['id'], force_refresh)))

	refresh_job_id = create_job('refresh_demo_market_state', {'source': 'test', 'userId': 'user-demo'}, run_now=False)
	worker.run_job(refresh_job_id)
	refresh_done = fetch_one('select status, started_at, finished_at from ingestion_jobs where id = %s', (refresh_job_id,))
	assert refresh_done['status'] == 'completed'
	assert refresh_done['started_at'] is not None
	assert refresh_done['finished_at'] is not None
	provider_keys = [item[1] for item in calls if item[0] == 'provider']
	assert 'fred:SP500' in provider_keys
	assert 'rss:fed' in provider_keys
	assert not [item for item in calls if item[0] == 'workstation']
	assert ('dashboard', 'user-demo', True) in calls

	calls.clear()
	recompute_job_id = create_job('recompute_market_bias', {'source': 'test', 'userId': 'user-demo'}, run_now=False)
	worker.run_job(recompute_job_id)
	recompute_done = fetch_one('select status from ingestion_jobs where id = %s', (recompute_job_id,))
	assert recompute_done['status'] == 'completed'
	assert not [item for item in calls if item[0] == 'provider']
	assert ('workstation', 'user-demo', True) in calls
	assert ('dashboard', 'user-demo', True) in calls

def test_dashboard_endpoint_surfaces_live_and_fallback_metadata(monkeypatch):
 reset_demo()
 sign_in()
 from app import dashboard_service
 sample_points = [{'date': '2026-02-01', 'value': 100.0}, {'date': '2026-02-15', 'value': 102.0}, {'date': '2026-03-01', 'value': 103.0}, {'date': '2026-03-15', 'value': 104.0}, {'date': '2026-03-20', 'value': 105.0}, {'date': '2026-03-21', 'value': 106.0}, {'date': '2026-03-22', 'value': 104.5}, {'date': '2026-03-23', 'value': 105.5}, {'date': '2026-03-24', 'value': 107.0}, {'date': '2026-03-25', 'value': 108.5}, {'date': '2026-03-26', 'value': 109.2}, {'date': '2026-03-27', 'value': 109.9}, {'date': '2026-03-28', 'value': 110.4}, {'date': '2026-03-29', 'value': 111.0}, {'date': '2026-03-30', 'value': 111.8}, {'date': '2026-03-31', 'value': 112.3}, {'date': '2026-04-01', 'value': 113.1}, {'date': '2026-04-02', 'value': 114.0}, {'date': '2026-04-03', 'value': 114.6}, {'date': '2026-04-04', 'value': 115.4}, {'date': '2026-04-05', 'value': 116.0}, {'date': '2026-04-06', 'value': 116.4}, {'date': '2026-04-07', 'value': 116.8}, {'date': '2026-04-08', 'value': 117.1}, {'date': '2026-04-09', 'value': 117.7}, {'date': '2026-04-10', 'value': 118.1}, {'date': '2026-04-11', 'value': 118.5}, {'date': '2026-04-12', 'value': 118.9}, {'date': '2026-04-13', 'value': 119.3}, {'date': '2026-04-14', 'value': 119.8}, {'date': '2026-04-15', 'value': 120.1}, {'date': '2026-04-16', 'value': 120.6}, {'date': '2026-04-17', 'value': 121.0}, {'date': '2026-04-18', 'value': 121.5}, {'date': '2026-04-19', 'value': 121.9}, {'date': '2026-04-20', 'value': 122.3}, {'date': '2026-04-21', 'value': 122.7}, {'date': '2026-04-22', 'value': 123.1}, {'date': '2026-04-23', 'value': 123.5}, {'date': '2026-04-24', 'value': 124.0}, {'date': '2026-04-25', 'value': 124.4}]
 monkeypatch.setattr(dashboard_service, '_load_series', lambda symbol: {'seriesId': symbol, 'source': 'FRED', 'sourceUrl': 'https://example.com', 'fetchedAt': '2026-04-25T08:00:00+00:00', 'lastUpdated': '2026-04-25T00:00:00+00:00', 'points': sample_points})
 monkeypatch.setattr(dashboard_service, '_load_live_news', lambda: ([{'title': 'Fed headline', 'subtitle': 'Official note', 'href': 'https://example.com', 'mode': 'live', 'publishedAt': '2026-04-25T07:00:00+00:00'}], [{'name': 'Federal Reserve press feed', 'status': 'live', 'detail': 'Official feed connected', 'mode': 'live'}]))
 response = client.get('/api/v1/dashboard')
 assert response.status_code == 200, response.text
 body = response.json()
 assert body['hero']['assets']
 assert len(body['hero']['assets']) >= 6
 assert any(item['symbol'] == 'US10Y' for item in body['hero']['assets'])
 assert body['liquidityInputs']
 assert body['liquidityInputs'][0]['label'] == 'Balance sheet'
 assert body['marketConsensus']['freshness']['mode'] == 'live'
 assert body['keyCatalyst']['freshness']['mode'] in ['demo', 'fallback']
 fred_row = next(item for item in body['utility']['providers'] if item['name'] == 'FRED market tape')
 assert fred_row['status'] == 'live'
 assert not any(item['name'] == 'SPX' for item in body['utility']['providers'])
