# Deployment

## Current target
Local/demo deployment with deterministic runtime for development and evaluation.

## Service requirements
- Postgres reachable by API and worker
- Redis reachable by API and worker
- Web app configured with API origin/cookies

## Environment variables
- `DATABASE_URL`
- `REDIS_URL`
- `SESSION_SECRET`
- `WEB_ORIGIN`
- `SESSION_COOKIE_NAME`
- `SESSION_TTL_HOURS`

## Deployment checklist
1. Apply DB migrations on API startup.
2. Seed demo data when resetting environment.
3. Run worker alongside API for job processing.
4. Validate admin/job endpoints and workstation payload routes.
5. Execute lint/typecheck/tests/build before release.

## Production readiness notes
- Replace demo billing/provider scaffolds with real integrations.
- Add observability for worker queue lag and API latency.
- Harden secret management and cookie security settings.
