import json
import uuid
from datetime import timedelta

from psycopg.rows import dict_row

from .cache import bump_rate_limit, cache_dashboard, enqueue_job
from .db import fetch_all, fetch_one, get_connection
from .security import hash_password, session_expiry, token_pair, utc_now, verify_password
from .settings import settings

def _id(prefix):
    return prefix + "-" + uuid.uuid4().hex[:12]

def audit(actor_user_id, action, entity_type, entity_id, payload=None):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("insert into audit_logs (id, actor_user_id, action, entity_type, entity_id, payload) values (%s, %s, %s, %s, %s, %s::jsonb)", (_id("audit"), actor_user_id, action, entity_type, entity_id, json.dumps(payload or {})))

def _session_row_to_user(row):
    if not row:
        return None
    return {
        "id": row["id"],
        "email": row["email"],
        "name": row["name"],
        "role": row["role"],
        "onboardingCompleted": row["onboarding_completed"],
        "emailVerified": bool(row["email_verified_at"]),
    }

def current_user_from_token(session_token):
    if not session_token:
        return None
    _, token_hash = token_pair()
    token_hash = __import__("hashlib").sha256((session_token + settings.session_secret).encode("utf-8")).hexdigest()
    row = fetch_one("select u.id, u.email, u.name, u.role, u.onboarding_completed, u.email_verified_at from sessions s join users u on u.id = s.user_id where s.token_hash = %s and s.revoked_at is null and s.expires_at > now()", (token_hash,))
    return _session_row_to_user(row)

def _auth_limit(kind, key):
    count = bump_rate_limit("nsm:rate:" + kind + ":" + key, settings.auth_window_seconds)
    if count > settings.auth_max_attempts:
        raise ValueError("Too many auth attempts. Wait before retrying.")

def sign_up(payload):
    _auth_limit("signup", payload.email)
    existing = fetch_one("select id from users where email = %s", (payload.email.lower(),))
    if existing:
        raise ValueError("Email already registered.")
    user_id = _id("user")
    token, token_hash = token_pair()
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("insert into users (id, email, password_hash, role, name) values (%s, %s, %s, 'user', %s)", (user_id, payload.email.lower(), hash_password(payload.password), payload.name))
            cur.execute("insert into profiles (user_id) values (%s)", (user_id,))
            cur.execute("insert into email_verification_tokens (id, user_id, token_hash, expires_at) values (%s, %s, %s, now() + interval '24 hours')", (_id("verify"), user_id, token_hash))
    audit(user_id, "sign_up", "user", user_id, {"email": payload.email.lower()})
    return {"status": "ok", "detail": "Account created. Verify email to continue.", "token": token if settings.app_mode == "demo" else None}

def verify_email(token):
    token_hash = __import__("hashlib").sha256((token + settings.session_secret).encode("utf-8")).hexdigest()
    row = fetch_one("select user_id from email_verification_tokens where token_hash = %s and consumed_at is null and expires_at > now()", (token_hash,))
    if not row:
        raise ValueError("Verification token is invalid or expired.")
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("update users set email_verified_at = now() where id = %s", (row["user_id"],))
            cur.execute("update email_verification_tokens set consumed_at = now() where token_hash = %s", (token_hash,))
    audit(row["user_id"], "verify_email", "user", row["user_id"], {})
    return {"status": "ok", "detail": "Email verified."}

def sign_in(payload, ip_address, user_agent):
    _auth_limit("signin", payload.email)
    row = fetch_one("select id, email, password_hash, role, name, onboarding_completed, email_verified_at from users where email = %s", (payload.email.lower(),))
    if not row or not verify_password(payload.password, row["password_hash"]):
        raise ValueError("Invalid credentials.")
    if not row["email_verified_at"]:
        raise ValueError("Verify email before signing in.")
    token, token_hash = token_pair()
    session_id = _id("session")
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("insert into sessions (id, user_id, token_hash, user_agent, ip_address, expires_at) values (%s, %s, %s, %s, %s, %s)", (session_id, row["id"], token_hash, user_agent or "", ip_address or "", session_expiry()))
    audit(row["id"], "sign_in", "session", session_id, {})
    return token, _session_row_to_user(row)

def sign_out(session_token):
    if not session_token:
        return
    token_hash = __import__("hashlib").sha256((session_token + settings.session_secret).encode("utf-8")).hexdigest()
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("update sessions set revoked_at = now() where token_hash = %s and revoked_at is null", (token_hash,))

def request_password_reset(payload):
    _auth_limit("reset", payload.email)
    user = fetch_one("select id from users where email = %s", (payload.email.lower(),))
    if not user:
        return {"status": "ok", "detail": "If the account exists, a reset token has been issued."}
    token, token_hash = token_pair()
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("insert into password_reset_tokens (id, user_id, token_hash, expires_at) values (%s, %s, %s, now() + interval '2 hours')", (_id("reset"), user["id"], token_hash))
    audit(user["id"], "request_password_reset", "user", user["id"], {})
    return {"status": "ok", "detail": "Reset token issued.", "token": token if settings.app_mode == "demo" else None}

def complete_password_reset(payload):
    token_hash = __import__("hashlib").sha256((payload.token + settings.session_secret).encode("utf-8")).hexdigest()
    row = fetch_one("select user_id from password_reset_tokens where token_hash = %s and consumed_at is null and expires_at > now()", (token_hash,))
    if not row:
        raise ValueError("Reset token is invalid or expired.")
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("update users set password_hash = %s where id = %s", (hash_password(payload.password), row["user_id"]))
            cur.execute("update password_reset_tokens set consumed_at = now() where token_hash = %s", (token_hash,))
    audit(row["user_id"], "complete_password_reset", "user", row["user_id"], {})
    return {'status': 'ok', 'detail': 'Password updated.'}



def update_onboarding(user_id, payload):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute('update users set onboarding_completed = true where id = %s', (user_id,))
            cur.execute('update profiles set desk = %s, timezone = %s, region = %s, density = %s, bio = %s where user_id = %s', (payload.desk, payload.timezone, payload.region, payload.density, payload.bio, user_id))
    audit(user_id, 'complete_onboarding', 'profile', user_id, {'desk': payload.desk})

def list_feature_flags():
    return fetch_all('select key, description, enabled from feature_flags order by key')

def latest_regime():
    snapshot = fetch_one('select id, created_at, label, score, confidence, trend, interpretation, methodology from regime_snapshots order by created_at desc limit 1')
    if not snapshot:
        return None
    components = fetch_all('select key, label, value from regime_components where snapshot_id = %s order by key', (snapshot['id'],))
    return {'id': snapshot['id'], 'asOf': snapshot['created_at'].isoformat(), 'label': snapshot['label'], 'score': float(snapshot['score']), 'confidence': float(snapshot['confidence']), 'trend': snapshot['trend'], 'interpretation': snapshot['interpretation'], 'methodology': snapshot['methodology'], 'components': [{'key': item['key'], 'label': item['label'], 'value': float(item['value'])} for item in components]}

def list_biases():
    rows = fetch_all('select s.id, a.id as asset_id, a.symbol, a.name, a.class_name, s.direction, s.score, s.confidence, s.change_1d, s.change_5d from market_bias_snapshots s join assets a on a.id = s.asset_id order by s.score desc')
    result = []
    for row in rows:
        rationale_rows = fetch_all('select rationale from market_bias_rationales where snapshot_id = %s order by rationale', (row['id'],))
        result.append({'assetId': row['asset_id'], 'symbol': row['symbol'], 'name': row['name'], 'className': row['class_name'], 'direction': row['direction'], 'score': float(row['score']), 'confidence': float(row['confidence']), 'change1d': float(row['change_1d']), 'change5d': float(row['change_5d']), 'rationale': [item['rationale'] for item in rationale_rows]})
    return result

def _event_base_query():
    return 'select e.id, e.slug, e.title, e.status, e.scheduled_at, e.previous_value, e.forecast_value, e.actual_value, e.surprise_pct, e.why_it_matters, f.name as family, f.country, f.currency, f.importance, f.category from events e join event_families f on f.id = e.family_id'

def _event_payload(row):
    asset_rows = fetch_all('select a.symbol from event_release_assets era join assets a on a.id = era.asset_id where era.event_id = %s order by a.symbol', (row['id'],))
    return {'id': row['id'], 'family': row['family'], 'title': row['title'], 'slug': row['slug'], 'country': row['country'], 'currency': row['currency'], 'impact': row['importance'], 'category': row['category'], 'scheduledAt': row['scheduled_at'].isoformat(), 'status': row['status'], 'previous': float(row['previous_value']) if row['previous_value'] is not None else None, 'forecast': float(row['forecast_value']) if row['forecast_value'] is not None else None, 'actual': float(row['actual_value']) if row['actual_value'] is not None else None, 'surprise': float(row['surprise_pct']) if row['surprise_pct'] is not None else None, 'whyItMatters': row['why_it_matters'], 'relatedAssets': [item['symbol'] for item in asset_rows]}

def list_events(search=None):
    query = _event_base_query() + ' order by e.scheduled_at asc'
    rows = fetch_all(query)
    events = [_event_payload(row) for row in rows]
    if search:
        needle = search.lower()
        events = [item for item in events if needle in item['title'].lower() or needle in item['family'].lower() or needle in item['country'].lower()]
    return events

def event_detail(event_id):
    row = fetch_one(_event_base_query() + ' where e.id = %s or e.slug = %s', (event_id, event_id))
    if not row:
        return None
    base = _event_payload(row)
    windows = fetch_all('select reaction_window, avg_move_pct, consistency, narrative from event_reaction_windows where event_id = %s order by reaction_window', (row['id'],))
    briefings = fetch_all('select b.id, b.slug, b.title, b.kind, b.published_at, b.summary, u.name as analyst_name, b.takeaways, b.asset_symbols from briefings b join users u on u.id = b.analyst_user_id where b.event_id = %s order by b.published_at desc', (row['id'],))
    news = fetch_all('select id, slug, title, source, published_at, summary, category, sentiment, event_id from news_items where event_id = %s order by published_at desc', (row['id'],))
    base['historicalReactions'] = [{'window': item['reaction_window'], 'avgMovePct': float(item['avg_move_pct']), 'consistency': float(item['consistency']), 'narrative': item['narrative']} for item in windows]
    base['linkedBriefings'] = [{'id': item['id'], 'slug': item['slug'], 'title': item['title'], 'kind': item['kind'], 'publishedAt': item['published_at'].isoformat(), 'summary': item['summary'], 'analystName': item['analyst_name'], 'takeaways': item['takeaways'], 'assetSymbols': item['asset_symbols']} for item in briefings]
    base['linkedNews'] = [{'id': item['id'], 'slug': item['slug'], 'title': item['title'], 'source': item['source'], 'publishedAt': item['published_at'].isoformat(), 'summary': item['summary'], 'category': item['category'], 'sentiment': item['sentiment'], 'relatedEventId': item['event_id']} for item in news]
    return base

def list_briefings():
    rows = fetch_all('select b.id, b.slug, b.title, b.kind, b.published_at, b.summary, u.name as analyst_name, b.takeaways, b.asset_symbols from briefings b join users u on u.id = b.analyst_user_id order by b.published_at desc')
    return [{'id': item['id'], 'slug': item['slug'], 'title': item['title'], 'kind': item['kind'], 'publishedAt': item['published_at'].isoformat(), 'summary': item['summary'], 'analystName': item['analyst_name'], 'takeaways': item['takeaways'], 'assetSymbols': item['asset_symbols']} for item in rows]

def list_news():
    rows = fetch_all('select id, slug, title, source, published_at, summary, category, sentiment, event_id from news_items order by published_at desc')
    return [{'id': item['id'], 'slug': item['slug'], 'title': item['title'], 'source': item['source'], 'publishedAt': item['published_at'].isoformat(), 'summary': item['summary'], 'category': item['category'], 'sentiment': item['sentiment'], 'relatedEventId': item['event_id']} for item in rows]

def list_watchlists(user_id):
    rows = fetch_all('select id, name, description from watchlists where user_id = %s order by created_at desc', (user_id,))
    output = []
    for row in rows:
        items = fetch_all('select id, symbol, item_type, note from watchlist_items where watchlist_id = %s order by symbol', (row['id'],))
        alert_count = fetch_one("select count(*) as count from alerts where user_id = %s and status in ('Active', 'Triggered', 'Scheduled')", (user_id,))
        output.append({'id': row['id'], 'name': row['name'], 'description': row['description'], 'itemCount': len(items), 'alertCount': int(alert_count['count']), 'items': [{'id': item['id'], 'symbol': item['symbol'], 'itemType': item['item_type'], 'note': item['note']} for item in items]})
    return output

def create_watchlist(user_id, payload):
    watchlist_id = _id('watchlist')
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute('insert into watchlists (id, user_id, name, description) values (%s, %s, %s, %s)', (watchlist_id, user_id, payload.name, payload.description))
    audit(user_id, 'create_watchlist', 'watchlist', watchlist_id, {'name': payload.name})
    return watchlist_id

def add_watchlist_item(user_id, watchlist_id, payload):
    item_id = _id('watch-item')
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute('insert into watchlist_items (id, watchlist_id, item_type, symbol, note) values (%s, %s, %s, %s, %s)', (item_id, watchlist_id, payload.itemType, payload.symbol.upper(), payload.note))
    audit(user_id, 'create_watchlist_item', 'watchlist_item', item_id, {'watchlistId': watchlist_id, 'symbol': payload.symbol.upper()})
    return item_id

def list_alerts(user_id):
    rows = fetch_all('select id, name, trigger_type, delivery_channel, status, threshold_value, last_triggered_at from alerts where user_id = %s order by created_at desc', (user_id,))
    return [{'id': item['id'], 'name': item['name'], 'triggerType': item['trigger_type'], 'deliveryChannel': item['delivery_channel'], 'status': item['status'], 'threshold': item['threshold_value'], 'lastTriggeredAt': item['last_triggered_at'].isoformat() if item['last_triggered_at'] else None} for item in rows]

def create_alert(user_id, payload):
    alert_id = _id('alert')
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute('insert into alerts (id, user_id, name, trigger_type, target_ref, threshold_value, delivery_channel, status) values (%s, %s, %s, %s, %s, %s, %s, %s)', (alert_id, user_id, payload.name, payload.triggerType, payload.targetRef, payload.thresholdValue, payload.deliveryChannel, 'Active'))
    audit(user_id, 'create_alert', 'alert', alert_id, {'triggerType': payload.triggerType, 'targetRef': payload.targetRef})
    return alert_id

def list_posts():
    rows = fetch_all('select p.id, p.title, p.body, p.created_at, u.name, u.role, (select count(*) from post_likes pl where pl.post_id = p.id) as likes, (select count(*) from comments c where c.post_id = p.id) as comments from posts p join users u on u.id = p.user_id where p.moderated = false order by p.created_at desc')
    return [{'id': item['id'], 'title': item['title'], 'body': item['body'], 'authorName': item['name'], 'authorRole': item['role'], 'likes': int(item['likes']), 'comments': int(item['comments']), 'createdAt': item['created_at'].isoformat()} for item in rows]

def create_post(user_id, payload):
    post_id = _id('post')
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute('insert into posts (id, user_id, title, body) values (%s, %s, %s, %s)', (post_id, user_id, payload.title, payload.body))
    audit(user_id, 'create_post', 'post', post_id, {'title': payload.title})
    return post_id

def create_comment(user_id, post_id, payload):
    comment_id = _id('comment')
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute('insert into comments (id, post_id, user_id, body) values (%s, %s, %s, %s)', (comment_id, post_id, user_id, payload.body))
    audit(user_id, 'create_comment', 'comment', comment_id, {'postId': post_id})
    return comment_id

def like_post(user_id, post_id):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute('insert into post_likes (post_id, user_id) values (%s, %s) on conflict do nothing', (post_id, user_id))

def billing_state(user_id):
    row = fetch_one('select subscription_plan from profiles where user_id = %s', (user_id,))
    return {'plan': row['subscription_plan'] if row else 'pro', 'seatCount': 1, 'renewalDate': (utc_now() + timedelta(days=30)).date().isoformat(), 'providerMode': 'demo-provider'}

def admin_summary():
    return {
        'users': int(fetch_one('select count(*) as count from users')['count']),
        'analysts': int(fetch_one("select count(*) as count from users where role = 'analyst'")['count']),
        'scheduledEvents': int(fetch_one('select count(*) as count from events where scheduled_at > now()')['count']),
        'activeAlerts': int(fetch_one("select count(*) as count from alerts where status in ('Active', 'Triggered', 'Scheduled')")['count']),
        'queuedJobs': int(fetch_one("select count(*) as count from ingestion_jobs where status in ('queued', 'running')")['count']),
    }

def list_jobs():
    return fetch_all('select id, job_type, status, run_at, started_at, finished_at, error_message from ingestion_jobs order by created_at desc')

def metrics_payload():
    events = list_events()
    alerts = fetch_one("select count(*) as count from alerts where status in ('Active', 'Triggered', 'Scheduled')")
    regime = latest_regime()
    event_count = len([item for item in events if item['status'] in ['Upcoming', 'Live']])
    return [
        {'label': 'Regime', 'value': regime['label'], 'note': regime['trend']},
        {'label': 'Regime score', 'value': format(regime['score'], '.2f'), 'note': str(int(regime['confidence'] * 100)) + '%% confidence'},
        {'label': 'Next 24h events', 'value': str(event_count), 'note': 'Calendar heat'},
        {'label': 'Active alerts', 'value': str(int(alerts['count'])), 'note': 'Cross-channel'},
    ]

def workstation_payload(user):
    payload = {'session': user, 'metrics': metrics_payload(), 'regime': latest_regime(), 'biases': list_biases(), 'nextEvents': list_events()[:8], 'briefings': list_briefings()[:6], 'news': list_news()[:8], 'watchlists': list_watchlists(user['id']), 'alerts': list_alerts(user['id']), 'posts': list_posts()[:6], 'featureFlags': list_feature_flags(), 'billing': billing_state(user['id']), 'adminSummary': admin_summary() if user['role'] == 'admin' else None}
    cache_dashboard(payload)
    return payload

def create_job(job_type, payload=None, run_now=True):
    job_id = _id('job')
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("insert into ingestion_jobs (id, job_type, status, payload) values (%s, %s, 'queued', %s::jsonb)", (job_id, job_type, json.dumps(payload or {})))
    if run_now:
        enqueue_job(job_id)
    return job_id

def reset_demo_jobs():
    for job_type in ['refresh_demo_market_state', 'recompute_regime', 'recompute_market_bias', 'publish_scheduled_content', 'evaluate_alerts', 'refresh_dashboard_cache']:
        create_job(job_type, {'source': 'seed'})

