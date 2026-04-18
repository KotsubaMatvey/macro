# Architecture

## Services
- Web (`apps/web`): renders public pages and authenticated workstation routes.
- API (`apps/api`): owns auth, sessions, domain reads/writes, admin APIs, and payload composition.
- Worker (`apps/worker`): consumes queued jobs and refreshes only the surfaces relevant to that job type.
- Postgres: source of truth for users, events, regime snapshots, biases, content, watchlists, alerts, jobs.
- Redis: dashboard cache, provider cache, rate-limit counters, and job queue transport.

## Runtime split
- Workstation payloads remain seeded/Postgres-backed for calendar, content, watchlists, alerts, and admin workflows.
- Dashboard payloads blend provider-backed market data with ranked news snapshots and seeded or provider-backed catalyst/calendar context.
- Provider failures degrade honestly: the dashboard keeps rendering with fallback/degraded metadata instead of pretending to be live.

## Data flow
- Intelligence core modules are split by responsibility: News (`news_core/pipeline.py`, `news_core/feed.py`), Geoboard (`geoboard_core/constants.py`, `geoboard_core/feed.py`), contracts/semantics (`intelligence_contracts.py`, `intelligence_semantics.py`), graph materialization (`entity_graph.py`), and evaluation (`evaluation_service.py`, `evaluation_metrics.py`).
1. User signs in via API and receives a session cookie.
2. Web server components call the API with that cookie.
3. API resolves session, applies role checks, and returns workstation/admin/dashboard payloads.
4. Writes persist to Postgres and invalidate the affected cache surfaces.
5. Worker jobs mark lifecycle in `ingestion_jobs` and refresh only the surfaces their job type targets; news ingestion, clustering, enrichment, and ranking jobs stay scoped to news caches and linked surfaces.

