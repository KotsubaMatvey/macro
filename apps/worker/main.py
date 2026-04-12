from pathlib import Path
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "api"))

from app.cache import (
 dequeue_job,
 invalidate_dashboard_cache,
 invalidate_live_dashboard_cache,
 invalidate_provider_payload,
 invalidate_provider_payload_prefix,
)
from app.calendar_data import calendar_feed
from app.dashboard_service import SERIES, dashboard_payload
from app.db import apply_migrations, fetch_all, fetch_one, get_connection
from app.insights_service import (
 build_market_bias_payload,
 build_reactions_payload,
 build_track_record_payload,
 generate_weekly_report as build_weekly_report,
)
from app.market_data import MARKET_INSTRUMENTS, invalidate_market_bundle, load_market_bundle
from app.news_service import DISCOVERY_NEWS_PROVIDERS, OFFICIAL_NEWS_PROVIDERS, cluster_news_items as cluster_news_items_service, enrich_news_items as enrich_news_items_service, ingest_news_sources, rebuild_news_rankings as rebuild_news_rankings_service
from app.services import workstation_payload

USER_COLUMNS = "id, email, name, role, onboarding_completed, email_verified_at"


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


def _current_user(row):
 return {
  "id": row["id"],
  "email": row["email"],
  "name": row["name"],
  "role": row["role"],
  "onboardingCompleted": row["onboarding_completed"],
  "emailVerified": bool(row["email_verified_at"]),
 }


def _target_user_ids(payload):
 if not isinstance(payload, dict):
  return None
 scoped = []
 user_id = payload.get("userId")
 if user_id:
  scoped.append(str(user_id))
 user_ids = payload.get("userIds")
 if isinstance(user_ids, list):
  for item in user_ids:
   if item:
    scoped.append(str(item))
 unique = []
 for item in scoped:
  if item not in unique:
   unique.append(item)
 return unique or None


def _load_users(user_ids=None):
 rows = fetch_all(f"select {USER_COLUMNS} from users order by created_at asc")
 if not user_ids:
  return rows
 scoped = set(user_ids)
 return [row for row in rows if row["id"] in scoped]


def _users_with_active_alerts():
 rows = fetch_all(
  f"""
  select {USER_COLUMNS}
  from users
  where exists (
   select 1
   from alerts
   where alerts.user_id = users.id
    and alerts.status in ('Active', 'Triggered', 'Scheduled')
  )
  order by created_at asc
  """
 )
 return [_current_user(row) for row in rows]


def _job_users(job_type, payload):
 user_ids = _target_user_ids(payload)
 if user_ids:
  return [_current_user(row) for row in _load_users(user_ids)]
 if job_type == "evaluate_alerts":
  return _users_with_active_alerts()
 return [_current_user(row) for row in _load_users()]


def _invalidate_provider_names(names):
 for name in names:
  invalidate_provider_payload(name)


def _invalidate_provider_prefixes(prefixes):
 for prefix in prefixes:
  invalidate_provider_payload_prefix(prefix)


def _invalidate_market_provider_cache():
 for config in SERIES.values():
  invalidate_provider_payload("fred:" + config["seriesId"])


def _invalidate_news_provider_cache(include_official=True, include_discovery=True):
 providers = []
 if include_official:
  providers.extend(OFFICIAL_NEWS_PROVIDERS)
 if include_discovery:
  providers.extend(DISCOVERY_NEWS_PROVIDERS)
 for provider in providers:
  invalidate_provider_payload("rss:" + provider.provider_key)


def _refresh_users(users, refresh_workstation=False, refresh_live_dashboard=False):
 for user in users:
  if refresh_workstation:
   invalidate_dashboard_cache(user["id"])
   workstation_payload(user, prefer_cache=False, force_refresh=True)
  if refresh_live_dashboard:
   invalidate_live_dashboard_cache(user["id"])
   dashboard_payload(user, prefer_cache=False, force_refresh=True)


def _refresh_demo_market_state(job_type, payload):
 symbols = list(MARKET_INSTRUMENTS.keys())
 _invalidate_market_provider_cache()
 invalidate_market_bundle(symbols)
 _invalidate_provider_prefixes(["insights:market-bias", "insights:reactions:", "insights:track-record", "insights:reports"])
 load_market_bundle(symbols, interval="1d", period="18mo")
 build_market_bias_payload()
 _refresh_users(_job_users(job_type, payload), refresh_workstation=False, refresh_live_dashboard=True)


def _refresh_dashboard_cache(job_type, payload):
 _refresh_users(_job_users(job_type, payload), refresh_workstation=False, refresh_live_dashboard=True)


def _refresh_market_prices(job_type, payload):
 symbols = payload.get("symbols") if isinstance(payload, dict) and isinstance(payload.get("symbols"), list) else list(MARKET_INSTRUMENTS.keys())
 invalidate_market_bundle(symbols)
 _invalidate_provider_prefixes(["insights:market-bias", "insights:reactions:", "insights:track-record", "insights:reports"])
 load_market_bundle(symbols, interval="1d", period="18mo")
 build_market_bias_payload()
 _refresh_users(_job_users(job_type, payload), refresh_workstation=False, refresh_live_dashboard=True)


def _refresh_calendar_events(job_type, payload):
 _invalidate_provider_prefixes(["calendar:", "insights:reactions:", "insights:reports"])
 calendar_feed(days_back=30, days_forward=60, prefer_cache=False)
 _refresh_users(_job_users(job_type, payload), refresh_workstation=True, refresh_live_dashboard=True)


def _ingest_official_news(job_type, payload):
 _invalidate_news_provider_cache(include_official=True, include_discovery=False)
 ingest_news_sources(include_official=True, include_discovery=False)
 _refresh_users(_job_users(job_type, payload), refresh_workstation=True, refresh_live_dashboard=True)


def _ingest_discovery_news(job_type, payload):
 _invalidate_news_provider_cache(include_official=False, include_discovery=True)
 ingest_news_sources(include_official=False, include_discovery=True)
 _refresh_users(_job_users(job_type, payload), refresh_workstation=False, refresh_live_dashboard=True)


def _cluster_news_items(job_type, payload):
 cluster_news_items_service()
 _refresh_users(_job_users(job_type, payload), refresh_workstation=True, refresh_live_dashboard=True)


def _enrich_news_items(job_type, payload):
 enrich_news_items_service(limit=240)
 _refresh_users(_job_users(job_type, payload), refresh_workstation=True, refresh_live_dashboard=True)


def _refresh_news_cache(job_type, payload):
 _invalidate_news_provider_cache(include_official=True, include_discovery=True)
 ingest_news_sources(include_official=True, include_discovery=True)
 rebuild_news_rankings_service(lookback_hours=120)
 _refresh_users(_job_users(job_type, payload), refresh_workstation=True, refresh_live_dashboard=True)


def _rebuild_news_rankings(job_type, payload):
 rebuild_news_rankings_service(lookback_hours=120)
 _refresh_users(_job_users(job_type, payload), refresh_workstation=True, refresh_live_dashboard=True)

def _recompute_regime(job_type, payload):
 _refresh_users(_job_users(job_type, payload), refresh_workstation=False, refresh_live_dashboard=True)


def _recompute_market_bias(job_type, payload):
 _invalidate_provider_names(["insights:market-bias"])
 _invalidate_provider_prefixes(["insights:reports"])
 build_market_bias_payload()
 _refresh_users(_job_users(job_type, payload), refresh_workstation=True, refresh_live_dashboard=True)


def _recompute_reactions(job_type, payload):
 _invalidate_provider_prefixes(["insights:reactions:", "insights:reports"])
 assets = payload.get("assets") if isinstance(payload, dict) and isinstance(payload.get("assets"), list) else ["SPX", "NDX", "EURUSD", "BTC"]
 for asset in assets:
  build_reactions_payload(asset=str(asset).upper())
 _refresh_users(_job_users(job_type, payload), refresh_live_dashboard=False)


def _recompute_track_record(job_type, payload):
 _invalidate_provider_names(["insights:track-record"])
 _invalidate_provider_prefixes(["insights:reports"])
 build_track_record_payload()
 _refresh_users(_job_users(job_type, payload), refresh_live_dashboard=True)


def _publish_scheduled_content(job_type, payload):
 _refresh_users(_job_users(job_type, payload), refresh_workstation=True, refresh_live_dashboard=True)


def _evaluate_alerts(job_type, payload):
 _refresh_users(_job_users(job_type, payload), refresh_workstation=True, refresh_live_dashboard=True)


def _generate_weekly_report(job_type, payload):
 _invalidate_provider_prefixes(["insights:reports"])
 build_weekly_report(persist=True)


JOB_HANDLERS = {
 "refresh_demo_market_state": _refresh_demo_market_state,
 "refresh_dashboard_cache": _refresh_dashboard_cache,
 "refresh_market_prices": _refresh_market_prices,
 "refresh_calendar_events": _refresh_calendar_events,
 "ingest_official_news": _ingest_official_news,
 "ingest_discovery_news": _ingest_discovery_news,
 "cluster_news_items": _cluster_news_items,
 "enrich_news_items": _enrich_news_items,
 "refresh_news_cache": _refresh_news_cache,
 "rebuild_news_rankings": _rebuild_news_rankings,
 "recompute_regime": _recompute_regime,
 "recompute_market_bias": _recompute_market_bias,
 "recompute_reactions": _recompute_reactions,
 "recompute_track_record": _recompute_track_record,
 "publish_scheduled_content": _publish_scheduled_content,
 "evaluate_alerts": _evaluate_alerts,
 "generate_weekly_report": _generate_weekly_report,
}

def run_job(job_id):
 job = fetch_one("select id, job_type, payload from ingestion_jobs where id = %s", (job_id,))
 if not job:
  return
 mark_job(job_id, "running", started=True)
 try:
  JOB_HANDLERS[job["job_type"]](job["job_type"], job.get("payload") or {})
  mark_job(job_id, "completed", finished=True)
 except Exception as exc:
  mark_job(job_id, "failed", error_message=str(exc), finished=True)
  return


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









