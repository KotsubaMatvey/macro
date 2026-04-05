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

## Real-data Product Layer
- Market data now runs through a replaceable provider adapter, with yfinance-backed instrument coverage for SPX, NDX, DXY, US10Y, VIX, EURUSD, XAU, and BTC.
- Calendar data now prefers TradingEconomics when credentials are configured; the seeded calendar remains an explicit demo or fallback mode rather than a hidden live substitute.
- Reactions, Bias or Influencers, Track Record, and Reports all consume the same structured provider-backed product layer and keep live, fallback, and replay labeling explicit.

## Cache and Jobs
- Redis TTLs: market tape 5 minutes, intraday market windows 5 minutes, upcoming calendar 15 minutes, calendar history 1 hour, macro or FRED series 1 hour, dashboard live payload 5 minutes, reactions 15 minutes, track record 15 minutes, reports 30 minutes.
- Worker job types: refresh_demo_market_state, refresh_dashboard_cache, refresh_market_prices, refresh_calendar_events, recompute_regime, recompute_market_bias, recompute_reactions, recompute_track_record, publish_scheduled_content, evaluate_alerts, generate_weekly_report.
- Reports are deterministic by default and may optionally add LLM narrative summarization when `REPORT_LLM_ENABLED=true` and OpenAI credentials are configured. Numeric source-backed sections remain authoritative.

## Reactions and Replay Integrity
- Reactions use real market history windows only when the available data resolution supports them. Intraday windows are not fabricated.
- Track Record remains replay-only product analytics. It is not an audited live discretionary blotter or realized PnL record.
