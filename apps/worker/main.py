from pathlib import Path
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "api"))

from app.cache import dequeue_job, invalidate_dashboard_cache, invalidate_live_dashboard_cache, invalidate_provider_payload
from app.dashboard_service import NEWS_FEEDS, SERIES, dashboard_payload
from app.db import apply_migrations, fetch_all, fetch_one, get_connection
from app.services import workstation_payload

JOB_PLANS = {
  "refresh_demo_market_state": {"provider": True, "workstation": True, "live_dashboard": True},
  "recompute_regime": {"provider": False, "workstation": True, "live_dashboard": True},
  "recompute_market_bias": {"provider": False, "workstation": True, "live_dashboard": True},
  "publish_scheduled_content": {"provider": False, "workstation": True, "live_dashboard": True},
  "evaluate_alerts": {"provider": False, "workstation": True, "live_dashboard": True},
  "refresh_dashboard_cache": {"provider": False, "workstation": True, "live_dashboard": True},
}

def mark_job(job_id, status, error_message=None, started=False, finished=False):
	with get_connection() as conn:
		with conn.cursor() as cur:
			if started:
				cur.execute('update ingestion_jobs set status = %s, started_at = now(), error_message = null where id = %s', (status, job_id))
			elif finished:
				cur.execute('update ingestion_jobs set status = %s, finished_at = now(), error_message = %s where id = %s', (status, error_message, job_id))
			else:
				cur.execute('update ingestion_jobs set status = %s, error_message = %s where id = %s', (status, error_message, job_id))

def _current_user(row):
	return {
		'id': row['id'],
		'email': row['email'],
		'name': row['name'],
		'role': row['role'],
		'onboardingCompleted': row['onboarding_completed'],
		'emailVerified': bool(row['email_verified_at']),
	}

def _target_user_ids(payload):
	if not isinstance(payload, dict):
		return None
	scoped = []
	user_id = payload.get('userId')
	if user_id:
		scoped.append(str(user_id))
	user_ids = payload.get('userIds')
	if isinstance(user_ids, list):
		for item in user_ids:
			if item:
				scoped.append(str(item))
	unique = []
	for item in scoped:
		if item not in unique:
			unique.append(item)
	return unique or None

def _job_users(payload):
	rows = fetch_all('select id, email, name, role, onboarding_completed, email_verified_at from users')
	user_ids = _target_user_ids(payload)
	if user_ids:
		rows = [row for row in rows if row['id'] in user_ids]
	return [_current_user(row) for row in rows]

def _invalidate_provider_cache():
	for config in SERIES.values():
		invalidate_provider_payload('fred:' + config['seriesId'])
	for feed in NEWS_FEEDS:
		invalidate_provider_payload('rss:' + feed['cache'])

def _refresh_users(users, refresh_workstation=False, refresh_live_dashboard=False):
	for user in users:
		if refresh_workstation:
			invalidate_dashboard_cache(user['id'])
			workstation_payload(user, prefer_cache=False, force_refresh=True)
		if refresh_live_dashboard:
			invalidate_live_dashboard_cache(user['id'])
			dashboard_payload(user, prefer_cache=False, force_refresh=True)

def _job_plan(job_type):
	return JOB_PLANS.get(job_type, {"provider": False, "workstation": False, "live_dashboard": False})

def run_job(job_id):
	job = fetch_one('select id, job_type, payload from ingestion_jobs where id = %s', (job_id,))
	if not job:
		return
	mark_job(job_id, 'running', started=True)
	try:
		plan = _job_plan(job['job_type'])
		users = _job_users(job.get('payload') or {})
		if plan['provider']:
			_invalidate_provider_cache()
		_refresh_users(users, refresh_workstation=plan['workstation'], refresh_live_dashboard=plan['live_dashboard'])
		mark_job(job_id, 'completed', finished=True)
	except Exception as exc:
		mark_job(job_id, 'failed', error_message=str(exc), finished=True)
		raise

def run_forever():
	apply_migrations()
	while True:
		job_id = dequeue_job(3)
		if not job_id:
			time.sleep(1)
			continue
		run_job(job_id)

if __name__ == "__main__":
	run_forever()

