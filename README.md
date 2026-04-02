# Macro Access

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
- Hybrid runtime: provider-backed dashboard market and news surfaces when FRED/RSS are reachable, with honest degraded or fallback states when they are not
- Seeded workstation domain data for auth, calendar/events, briefings, watchlists, alerts, community, and admin flows
- Session auth with secure token hashing and cookie sessions
- Redis used for queue/cache/rate-limits (with worker queue consumption and dashboard cache warming)
- Worker jobs recompute or refresh specific surfaces and persist admin-visible job lifecycle

## Workstation surfaces
- Dashboard: board-based macro workstation with regime, bias, catalysts, calendar, and market strip
- Macro Calendar: filterable event tape with drill-down into dynamic event detail
- Event Explorer and Impact Lab: family history and reaction context
- Market Bias and Liquidity Regime: cross-asset consensus and regime layers
- News, Briefings, Watchlists, Alerts, Community, Admin: connected operator workflows

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
- user: `demo@macroaccess.local` / `demo12345`
- analyst: `analyst@macroaccess.local` / `analyst12345`
- admin: `admin@macroaccess.local` / `admin12345`

## Verification
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Live vs fallback
- Provider-backed today: dashboard market tape from FRED public series and official RSS news feeds when reachable
- Fallback/demo today: seeded macro calendar, demo accounts, watchlists/alerts/community/admin content, and the catalyst calendar until a live schedule provider is attached
- Replay/simulated today: track-record windows are retrospective model replays, not logged discretionary calls
