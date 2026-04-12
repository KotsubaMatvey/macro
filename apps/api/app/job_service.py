import json
import uuid

from .cache import enqueue_job
from .db import fetch_all, get_connection

JOB_TYPES = (
 "refresh_demo_market_state",
 "refresh_dashboard_cache",
 "refresh_market_prices",
 "refresh_calendar_events",
 "ingest_official_news",
 "ingest_discovery_news",
 "cluster_news_items",
 "enrich_news_items",
 "refresh_news_cache",
 "rebuild_news_rankings",
 "recompute_regime",
 "recompute_market_bias",
 "recompute_reactions",
 "recompute_track_record",
 "publish_scheduled_content",
 "evaluate_alerts",
 "generate_weekly_report",
)


def _id(prefix):
 return prefix + "-" + uuid.uuid4().hex[:12]


def list_jobs():
 return fetch_all(
  "select id, job_type, status, run_at, started_at, finished_at, error_message from ingestion_jobs order by created_at desc"
 )


def create_job(job_type, payload=None, run_now=True):
 if job_type not in JOB_TYPES:
  raise ValueError(str(job_type))
 job_id = _id("job")
 with get_connection() as conn:
  with conn.cursor() as cur:
   cur.execute(
    "insert into ingestion_jobs (id, job_type, status, payload) values (%s, %s, 'queued', %s::jsonb)",
    (job_id, job_type, json.dumps(payload or {})),
   )
 if run_now:
  enqueue_job(job_id)
 return job_id


def reset_demo_jobs(default_payload=None):
 payload = dict(default_payload or {"source": "seed"})
 for job_type in JOB_TYPES:
  create_job(job_type, payload)
 return list(JOB_TYPES)

