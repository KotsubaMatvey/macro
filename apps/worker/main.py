from pathlib import Path
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "api"))

from app.cache import dequeue_job, invalidate_dashboard_cache, invalidate_live_dashboard_cache
from app.dashboard_service import dashboard_payload
from app.db import apply_migrations, fetch_all, fetch_one, get_connection
from app.services import workstation_payload


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

def run_job(job_id):
	job = fetch_one('select id, job_type from ingestion_jobs where id = %s', (job_id,))
	if not job:
		return
	mark_job(job_id, 'running', started=True)
	try:
		users = fetch_all('select id, email, name, role, onboarding_completed, email_verified_at from users')
		for user in users:
			current_user = _current_user(user)
			invalidate_dashboard_cache(user['id'])
			invalidate_live_dashboard_cache(user['id'])
			workstation_payload(current_user, prefer_cache=False, force_refresh=True)
			invalidate_live_dashboard_cache(user['id'])
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
