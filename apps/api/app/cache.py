import json

import redis

from .settings import settings

def get_redis():
    return redis.Redis.from_url(settings.redis_url, decode_responses=True)

def cache_dashboard(payload):
    client = get_redis()
    client.set(settings.dashboard_cache_key, json.dumps(payload), ex=300)

def read_dashboard_cache():
    client = get_redis()
    value = client.get(settings.dashboard_cache_key)
    return json.loads(value) if value else None

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
