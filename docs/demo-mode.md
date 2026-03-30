# Demo Mode

## What demo mode means
- Deterministic, seeded market/event dataset in Postgres.
- Real API/auth/session mechanics over simulated domain state.
- Worker jobs mutate demo state coherently, not by external ingestion.

## Seed behavior
- `seed_demo_database()` truncates and rebuilds domain/user datasets.
- Initial jobs are queued in `ingestion_jobs` for worker processing.

## Worker behavior
- Jobs represent operational classes (state refresh, recompute, publish, evaluate, cache refresh).
- Status lifecycle is persisted and admin-visible.

## Guardrails
- No fake live-feed claims.
- Payloads are deterministic and auditable in local development.
- Product copy and docs should clearly indicate simulation boundaries.
