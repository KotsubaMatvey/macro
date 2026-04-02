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
- The dashboard will use FRED and official RSS feeds when your network allows them; otherwise it will degrade honestly.
- Calendar, catalyst, watchlist, alert, community, and admin data remain seeded for local development.
- If jobs are not progressing, verify Redis and the worker process are running.

## Verification
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
