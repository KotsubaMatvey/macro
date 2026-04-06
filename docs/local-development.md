# Local Development

## Prerequisites
- Node.js 20+
- Python 3.11+
- Docker (for Postgres + Redis)

## Setup
1. Copy `.env.example` to `.env` (or create equivalent values on Windows).
2. Run `docker-compose up -d`.
3. Run `npm install --prefix apps/web`.
4. Run `python -m pip install -r apps/api/requirements.txt`.
5. Run `npm run api:seed`.

## Run services
- API: `npm run api:dev`
- Worker: `npm run worker:dev`
- Web: `npm run web:dev`

## Runtime notes
- The dashboard will use Yahoo Finance via yfinance for live market tape, fall back to FRED public series when needed, and use official RSS feeds when your network allows them; otherwise it will degrade honestly.
- Calendar, catalyst, watchlist, alert, community, and admin data remain seeded for local development.
- If jobs are not progressing, verify Redis and the worker process are running.

## Verification
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Optional provider configuration
- `MARKET_PROVIDER=auto` keeps the market adapter replaceable and currently resolves to the Yahoo Finance via yfinance adapter with FRED fallback proxies.
- `CALENDAR_PROVIDER=auto` keeps the calendar adapter replaceable and prefers TradingEconomics when credentials are present.
- TradingEconomics configuration: `TRADINGECONOMICS_API_KEY` or `TRADINGECONOMICS_USERNAME` plus `TRADINGECONOMICS_PASSWORD`.
- There is no report LLM configuration used by the current runtime. Weekly reports are generated deterministically from structured product data.

## Cache policy
- Market tape and intraday market windows: 5 minutes.
- Upcoming calendar feed: 15 minutes.
- Calendar history and event metadata: 1 hour.
- Macro or FRED series: 1 hour.
- Dashboard live payload: 5 minutes.
- Reactions and Track Record views: 15 minutes.
- Reports: 30 minutes.

## Product honesty
- TradingEconomics and Yahoo Finance via yfinance are optional. If they are missing or unreachable, the UI should surface fallback or degraded mode instead of claiming live coverage.
- Track Record is replay-only. Reports are deterministic structured summaries today; there is no optional LLM summarization path wired into runtime.
