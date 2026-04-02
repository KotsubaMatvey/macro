from collections import deque
import json
from datetime import timedelta

import redis

from .security import utc_now
from .settings import settings

_LOCAL_CACHE = {}
_LOCAL_QUEUE = deque()
_LOCAL_RATES = {}

def get_redis():
	client = redis.Redis.from_url(settings.redis_url, decode_responses=True, socket_connect_timeout=0.2, socket_timeout=0.2)
	try:
		client.ping()
	except redis.RedisError:
		return None
	return client

def _set_json_cache(key, payload, ttl):
	client = get_redis()
	envelope = {'cachedAt': utc_now().isoformat(), 'payload': payload}
	if client:
		client.set(key, json.dumps(envelope), ex=ttl)
		return
	expires_at = utc_now() + timedelta(seconds=ttl)
	_LOCAL_CACHE[key] = (json.dumps(envelope), expires_at)

def _read_json_cache(key):
	client = get_redis()
	if client:
		value = client.get(key)
		return json.loads(value) if value else None
	value = _LOCAL_CACHE.get(key)
	if not value:
		return None
	payload, expires_at = value
	if expires_at <= utc_now():
		_LOCAL_CACHE.pop(key, None)
		return None
	return json.loads(payload)

def _delete_cache_key(key):
	client = get_redis()
	if client:
		client.delete(key)
		return
	_LOCAL_CACHE.pop(key, None)

def dashboard_cache_key(user_id):
	return f'{settings.dashboard_cache_key}:{user_id}'

def live_dashboard_cache_key(user_id):
	return f'{settings.dashboard_live_cache_key}:{user_id}'

def provider_cache_key(name):
	return f'{settings.provider_cache_key}:{name}'

def cache_dashboard(user_id, payload, ttl=None):
	_set_json_cache(dashboard_cache_key(user_id), payload, ttl or settings.dashboard_cache_ttl_seconds)

def read_dashboard_cache(user_id):
	return _read_json_cache(dashboard_cache_key(user_id))

def invalidate_dashboard_cache(user_id):
	_delete_cache_key(dashboard_cache_key(user_id))

def cache_live_dashboard(user_id, payload, ttl=None):
	_set_json_cache(live_dashboard_cache_key(user_id), payload, ttl or settings.dashboard_live_cache_ttl_seconds)

def read_live_dashboard_cache(user_id):
	return _read_json_cache(live_dashboard_cache_key(user_id))

def invalidate_live_dashboard_cache(user_id):
	_delete_cache_key(live_dashboard_cache_key(user_id))

def cache_provider_payload(name, payload, ttl=None):
	_set_json_cache(provider_cache_key(name), payload, ttl or settings.provider_cache_ttl_seconds)

def read_provider_payload(name):
	return _read_json_cache(provider_cache_key(name))

def invalidate_provider_payload(name):
	_delete_cache_key(provider_cache_key(name))

def enqueue_job(job_id):
	client = get_redis()
	if client:
		client.rpush(settings.jobs_queue_key, job_id)
		return
	_LOCAL_QUEUE.append(job_id)

def dequeue_job(timeout=3):
	client = get_redis()
	if client:
		result = client.blpop(settings.jobs_queue_key, timeout=timeout)
		return result[1] if result else None
	if _LOCAL_QUEUE:
		return _LOCAL_QUEUE.popleft()
	return None

def bump_rate_limit(key, ttl):
	client = get_redis()
	if client:
		value = client.incr(key)
		if value == 1:
			client.expire(key, ttl)
		return value
	entry = _LOCAL_RATES.get(key)
	now = utc_now()
	if not entry or entry[1] <= now:
		_LOCAL_RATES[key] = (1, now + timedelta(seconds=ttl))
		return 1
	value = entry[0] + 1
	_LOCAL_RATES[key] = (value, entry[1])
	return value
