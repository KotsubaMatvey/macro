from pathlib import Path 
import sys 
import time 
 
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "api")) 
 
from app.cache import dequeue_job, invalidate_dashboard_cache 
from app.db import apply_migrations, fetch_all, fetch_one, get_connection 
from app.services import workstation_payload 
 

def mark_job(job_id, status, error_message=None, started=False, finished=False): 
    with get_connection() as conn: 
        with conn.cursor() as cur: 
            if started: 
                cur.execute( 
                    "update ingestion_jobs set status = %s, started_at = now(), error_message = null where id = %s", 
                    (status, job_id), 
                ) 
            elif finished: 
                cur.execute( 
                    "update ingestion_jobs set status = %s, finished_at = now(), error_message = %s where id = %s", 
                    (status, error_message, job_id), 
                ) 
            else: 
                cur.execute( 
                    "update ingestion_jobs set status = %s, error_message = %s where id = %s", 
                    (status, error_message, job_id), 
                ) 
 

def run_job(job_id): 
    job = fetch_one("select id, job_type from ingestion_jobs where id = %s", (job_id,)) 
    if not job: 
        return 
 
    mark_job(job_id, 'running', started=True) 
    try: 
        if job['job_type'] == 'refresh_demo_market_state': 
            with get_connection() as conn: 
                with conn.cursor() as cur: 
                    cur.execute("update events set status = 'Released', actual_value = coalesce(actual_value, forecast_value), surprise_pct = coalesce(surprise_pct, 0) where status in ('Upcoming', 'Live') and scheduled_at <= now()") 
                    cur.execute("update alerts set status = 'Triggered', last_triggered_at = now() where trigger_type = 'event_reminder' and status in ('Scheduled', 'Active') and target_ref in (select id from events where status = 'Released')") 
        elif job['job_type'] == 'recompute_regime': 
            with get_connection() as conn: 
                with conn.cursor() as cur: 
                    cur.execute("update regime_snapshots set score = greatest(least(score + 0.02, 1), -1), confidence = greatest(least(confidence + 0.01, 0.95), 0.5), trend = case when trend = 'Improving' then 'Stable' else 'Improving' end where id = (select id from regime_snapshots order by created_at desc limit 1)") 
                    cur.execute("update regime_components set value = greatest(least(value + case when key in ('growth','liquidity') then 0.02 else -0.01 end, 1), -1) where snapshot_id = (select id from regime_snapshots order by created_at desc limit 1)") 
        elif job['job_type'] == 'recompute_market_bias': 
            with get_connection() as conn: 
                with conn.cursor() as cur: 
                    cur.execute("update market_bias_snapshots set score = greatest(least(score + 1.5, 100), 0), confidence = greatest(least(confidence + 0.01, 0.95), 0.45) where id in (select id from (select distinct on (asset_id) id from market_bias_snapshots order by asset_id, created_at desc) latest)") 
                    cur.execute("update market_bias_snapshots set direction = case when score >= 55 then 'Bullish' when score <= 45 then 'Bearish' else 'Neutral' end where id in (select id from (select distinct on (asset_id) id from market_bias_snapshots order by asset_id, created_at desc) latest)") 
        elif job['job_type'] == 'publish_scheduled_content': 
            with get_connection() as conn: 
                with conn.cursor() as cur: 
                    cur.execute("insert into briefings (id, slug, kind, title, summary, body, analyst_user_id, published_at, event_id, asset_symbols, takeaways) select 'brief-auto-' || replace(e.id,'event-',''), e.slug || '-auto', 'Scheduler', e.title || ' auto update', 'Published by worker scheduler', 'Seeded scheduled publication', 'user-analyst', now(), e.id, '[]'::jsonb, '[]'::jsonb from events e where not exists (select 1 from briefings b where b.event_id = e.id) limit 2") 
                    cur.execute("update alerts set status = 'Active' where status = 'Scheduled' and trigger_type = 'event_reminder' and target_ref in (select id from events where scheduled_at <= now() + interval '12 hours')") 
        elif job['job_type'] == 'evaluate_alerts': 
            with get_connection() as conn: 
                with conn.cursor() as cur: 
                    cur.execute("update alerts set status = 'Triggered', last_triggered_at = now() where status in ('Active', 'Scheduled') and trigger_type = 'event_reminder' and target_ref in (select id from events where scheduled_at <= now() + interval '30 minutes')") 
                    cur.execute( 
                        "insert into alert_deliveries (id, alert_id, status, payload) " 
                        "select 'delivery-' || replace(id, 'alert-', ''), id, 'delivered', '{}'::jsonb "
                        "from alerts where status = 'Triggered' on conflict do nothing" 
                    ) 
        elif job['job_type'] == 'refresh_dashboard_cache': 
            user = fetch_one( 
                "select id, email, name, role, onboarding_completed, email_verified_at from users where id = %s", 
                ("user-demo",), 
            )
            if user: 
                workstation_payload( 
                    { 
                        "id": user["id"], 
                        "email": user["email"], 
                        "name": user["name"], 
                        "role": user["role"], 
                        "onboardingCompleted": user["onboarding_completed"], 
                        "emailVerified": bool(user["email_verified_at"]), 
                    } 
                ) 
        else: 
            raise ValueError('Unsupported job type: ' + str(job['job_type'])) 
 
        users = fetch_all("select id, email, name, role, onboarding_completed, email_verified_at from users") 
        for user in users: 
            invalidate_dashboard_cache(user['id']) 
            workstation_payload({'id': user['id'], 'email': user['email'], 'name': user['name'], 'role': user['role'], 'onboardingCompleted': user['onboarding_completed'], 'emailVerified': bool(user['email_verified_at'])}, prefer_cache=False, force_refresh=True) 
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
