# Northstar Macro

Track macro events. Read the regime. Trade the reaction.

Northstar Macro is a demo-first macro intelligence workstation for event-driven traders. This repository contains:

- `apps/web`: Next.js public site and authenticated workstation
- `apps/api`: FastAPI backend with demo-mode endpoints
- `apps/worker`: Python worker for demo recomputation
- `docs`: product and methodology notes

## Quick start

1. Copy `.env.example` to `.env`.
2. Start infra: `docker-compose up -d`
3. Install web dependencies if needed: `npm install --prefix apps/web`
4. Seed demo data: `python apps/api/scripts/seed_demo.py`
5. Start API: `python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --app-dir apps/api`
6. Start worker: `python apps/worker/main.py`
7. Start web: `npm run dev --prefix apps/web`

## Demo credentials

- `demo@northstarmacro.local`
- password: `demo12345`
