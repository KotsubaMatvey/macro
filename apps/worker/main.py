from pathlib import Path 
import sys 
import time 
 
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "api")) 
 
from app.cache import dequeue_job 
from app.db import apply_migrations, fetch_one, get_connection 
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
 
    mark_job(job_id, "running", started=True) 
    try: 
        if job["job_type"] == "evaluate_alerts": 
            with get_connection() as conn: 
                with conn.cursor() as cur: 
                    cur.execute( 
                        "insert into alert_deliveries (id, alert_id, status, payload) " 
                        "select 'delivery-' || replace(id, 'alert-', ''), id, 'delivered', '{}'::jsonb "
                        "from alerts where status = 'Triggered' on conflict do nothing" 
                    ) 
        elif job["job_type"] == "refresh_dashboard_cache": 
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
 
        mark_job(job_id, "completed", finished=True) 
    except Exception as exc: 
        mark_job(job_id, "failed", error_message=str(exc), finished=True) 
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
