# Local Development

## Prerequisites
- Node.js 20+
- Python 3.11+
- Docker (for Postgres + Redis)

## Setup
1. `cp .env.example .env` (or create equivalent values on Windows).
2. `docker-compose up -d`
3. `npm install --prefix apps/web`
4. `python -m pip install -r apps/api/requirements.txt`
5. `npm run api:seed`

## Run services
- API: `npm run api:dev`
- Worker: `npm run worker:dev`
- Web: `npm run web:dev`

## Verification
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Common troubleshooting
- Auth 401: verify API and cookie domain/origin settings.
- Empty workstation: run seed script and confirm Postgres connectivity.
- Jobs not progressing: ensure Redis and worker process are running.
