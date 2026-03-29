import json

import redis

from .security import utc_now
from .settings import settings


def get_redis():
	return redis.Redis.from_url(settings.redis_url, decode_responses=True)


def dashboard_cache_key(user_id: str):
	return f"{settings.dashboard_cache_key}:{user_id}"


def cache_dashboard(user_id: str, payload, ttl=None):
	client = get_redis()
	envelope = {"cachedAt": utc_now().isoformat(), "payload": payload}
	client.set(dashboard_cache_key(user_id), json.dumps(envelope), ex=ttl or settings.dashboard_cache_ttl_seconds)


def read_dashboard_cache(user_id: str):
	client = get_redis()
	value = client.get(dashboard_cache_key(user_id))
	return json.loads(value) if value else None


def invalidate_dashboard_cache(user_id: str):
	get_redis().delete(dashboard_cache_key(user_id))


def enqueue_job(job_id: str):
	get_redis().rpush(settings.jobs_queue_key, job_id)


def dequeue_job(timeout: int = 3):
	result = get_redis().blpop(settings.jobs_queue_key, timeout=timeout)
	return result[1] if result else None


def bump_rate_limit(key: str, ttl: int):
	client = get_redis()
	value = client.incr(key)
	if value == 1:
		client.expire(key, ttl)
	return value
