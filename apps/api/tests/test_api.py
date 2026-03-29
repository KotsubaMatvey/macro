from fastapi.testclient import TestClient 
 
from app.main import app 
from app.seed import seed_demo_database 
 
client = TestClient(app) 
 
def reset_demo(): 
    seed_demo_database() 
    client.cookies.clear() 
 
def sign_in(email='demo@northstarmacro.local', password='demo12345'): 
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
    assert payload['session']['email'] == 'demo@northstarmacro.local' 
    assert payload['regime']['label'] == 'Expansionary' 
    assert payload['nextEvents'] 
    assert payload['watchlists'] 
    assert payload['alerts']
 
def test_sign_up_verify_and_sign_in_new_user(): 
    reset_demo() 
    signup = client.post('/api/v1/auth/sign-up', json={'email': 'new@northstarmacro.local', 'password': 'pass12345', 'name': 'New User'}) 
    assert signup.status_code == 200, signup.text 
    verify = client.post('/api/v1/auth/verify-email', json={'token': signup.json()['token']}) 
    assert verify.status_code == 200, verify.text 
    signin = client.post('/api/v1/auth/sign-in', json={'email': 'new@northstarmacro.local', 'password': 'pass12345'}) 
    assert signin.status_code == 200, signin.text 
    assert signin.json()['email'] == 'new@northstarmacro.local' 
 
def test_password_reset_flow(): 
    reset_demo() 
    issued = client.post('/api/v1/auth/request-password-reset', json={'email': 'demo@northstarmacro.local'}) 
    assert issued.status_code == 200, issued.text 
    reset = client.post('/api/v1/auth/reset-password', json={'token': issued.json()['token'], 'password': 'demo54321'}) 
    assert reset.status_code == 200, reset.text 
    signin = client.post('/api/v1/auth/sign-in', json={'email': 'demo@northstarmacro.local', 'password': 'demo54321'}) 
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
    sign_in('admin@northstarmacro.local', 'admin12345') 
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
