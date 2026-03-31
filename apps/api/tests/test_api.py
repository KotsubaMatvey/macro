from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient 
 
from app.main import app 
from app.seed import seed_demo_database 
 
client = TestClient(app) 
 
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
    signup = client.post('/api/v1/auth/sign-up', json={'email': 'new@macroaccess.local', 'password': 'pass12345', 'name': 'New User'}) 
    assert signup.status_code == 200, signup.text 
    verify = client.post('/api/v1/auth/verify-email', json={'token': signup.json()['token']}) 
    assert verify.status_code == 200, verify.text 
    signin = client.post('/api/v1/auth/sign-in', json={'email': 'new@macroaccess.local', 'password': 'pass12345'}) 
    assert signin.status_code == 200, signin.text 
    assert signin.json()['email'] == 'new@macroaccess.local' 
 
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

def test_worker_job_types_transition_to_completed():
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
    job_types = ['refresh_demo_market_state', 'recompute_regime', 'recompute_market_bias', 'publish_scheduled_content', 'evaluate_alerts', 'refresh_dashboard_cache']
    for job_type in job_types:
        job_id = create_job(job_type, {'source': 'test'}, run_now=False)
        queued = fetch_one('select status from ingestion_jobs where id = %s', (job_id,))
        assert queued['status'] == 'queued'
        worker.run_job(job_id)
        done = fetch_one('select status, started_at, finished_at from ingestion_jobs where id = %s', (job_id,))
        assert done['status'] == 'completed'
        assert done['started_at'] is not None
        assert done['finished_at'] is not None
