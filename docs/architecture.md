# Architecture

## Services
- Web (`apps/web`): renders public marketing pages and authenticated workstation routes.
- API (`apps/api`): owns auth, sessions, domain reads/writes, admin APIs, and payload composition.
- Worker (`apps/worker`): consumes queued demo jobs and updates persisted state.
- Postgres: source of truth for users, events, regime snapshots, biases, content, watchlists, alerts, jobs.
- Redis: dashboard cache, rate-limit counters, and job queue transport.

## Data flow
1. User signs in via API, receives session cookie.
2. Web server components call API with forwarded cookie.
3. API resolves session, applies role checks, and returns workstation/admin payloads.
4. Writes (alerts/watchlists/posts/onboarding) persist to Postgres and are reflected in subsequent reads.
5. Worker consumes queued jobs and marks lifecycle in `ingestion_jobs`.

## Product boundaries
- Demo mode is deterministic and seeded.
- Queue/cache mechanisms are real but used for deterministic simulation paths.
- Admin role is server-authorized; non-admin users cannot access admin API routes.
