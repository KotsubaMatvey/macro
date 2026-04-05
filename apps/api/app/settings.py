from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
 app_name: str = os.getenv('APP_NAME', 'Macro Access')
 app_mode: str = os.getenv('APP_MODE', 'demo')
 demo_reference_now: str = os.getenv('DEMO_REFERENCE_NOW', '2026-03-31T12:00:00+00:00')
 api_origin: str = os.getenv('WEB_ORIGIN', 'http://localhost:3000')
 database_url: str = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/macro_access')
 database_connect_timeout_seconds: int = int(os.getenv('DATABASE_CONNECT_TIMEOUT_SECONDS', '2'))
 redis_url: str = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
 session_cookie: str = os.getenv('SESSION_COOKIE_NAME', 'macro_access_session')
 session_ttl_hours: int = int(os.getenv('SESSION_TTL_HOURS', '72'))
 session_secret: str = os.getenv('SESSION_SECRET', 'replace-me')
 secure_cookies: bool = os.getenv('SECURE_COOKIES', 'false').lower() == 'true'
 dashboard_cache_key: str = 'macro_access:dashboard:cache'
 dashboard_cache_ttl_seconds: int = int(os.getenv('DASHBOARD_CACHE_TTL_SECONDS', '240'))
 dashboard_live_cache_key: str = 'macro_access:dashboard:live'
 dashboard_live_cache_ttl_seconds: int = int(os.getenv('DASHBOARD_LIVE_CACHE_TTL_SECONDS', '300'))
 provider_cache_key: str = 'macro_access:providers'
 provider_cache_ttl_seconds: int = int(os.getenv('PROVIDER_CACHE_TTL_SECONDS', '900'))
 provider_market_ttl_seconds: int = int(os.getenv('PROVIDER_MARKET_TTL_SECONDS', '900'))
 provider_news_ttl_seconds: int = int(os.getenv('PROVIDER_NEWS_TTL_SECONDS', '1800'))
 provider_timeout_seconds: float = float(os.getenv('PROVIDER_TIMEOUT_SECONDS', '8'))
 jobs_queue_key: str = 'macro_access:jobs'
 auth_window_seconds: int = int(os.getenv('AUTH_WINDOW_SECONDS', '900'))
 auth_max_attempts: int = int(os.getenv('AUTH_MAX_ATTEMPTS', '10'))


settings = Settings()
