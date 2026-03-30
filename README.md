# Northstar Macro

Track macro events. Read the regime. Trade the reaction.

## Repository layout
- `apps/web`: Next.js public site + workstation UI
- `apps/api`: FastAPI service (auth, workstation payloads, admin APIs)
- `apps/worker`: queue consumer for demo ingestion jobs
- `packages/config`: product/navigation constants
- `packages/types`: shared payload contracts
- `packages/ui`: shared style tokens and shell primitives
- `docs`: architecture, auth, product and runbooks

## Runtime model
- Deterministic demo mode backed by Postgres seed data
- Session auth with secure token hashing and cookie sessions
- Redis used for queue/cache/rate-limits (with worker queue consumption)
- Worker jobs refresh demo state and admin-visible job status

## Quick start
1. Copy `.env.example` to `.env`.
2. Start infra: `docker-compose up -d`.
3. Install web deps: `npm install --prefix apps/web`.
4. Install API deps: `python -m pip install -r apps/api/requirements.txt`.
5. Seed demo data: `npm run api:seed`.
6. Start API: `npm run api:dev`.
7. Start worker: `npm run worker:dev`.
8. Start web: `npm run web:dev`.

## Demo accounts
- user: `demo@northstarmacro.local` / `demo12345`
- analyst: `analyst@northstarmacro.local` / `analyst12345`
- admin: `admin@northstarmacro.local` / `admin12345`

## Verification
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## What is demo-mode by design
- Deterministic seeded market/event state
- Worker jobs simulate operations, not live market ingestion
- Billing and provider integrations are contract-ready but demo-backed
