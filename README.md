# Northstar Macro 
 
Track macro events. Read the regime. Trade the reaction. 
 
## Services 
- `apps/web`: Next.js workstation and public pages 
- `apps/api`: FastAPI backend with Postgres-backed demo mode and real auth 
- `apps/worker`: Redis-backed worker for queued demo jobs 
- `docs`: architecture, auth, methodology, and local development notes 
 
## Local setup 
1. Copy `.env.example` to `.env`. 
2. Start infra: `docker-compose up -d` 
3. Install web deps: `npm install --prefix apps/web` 
4. Install API deps: `python -m pip install -r apps/api/requirements.txt` 
6. Start API: `python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --app-dir apps/api` 
7. Start worker: `python apps/worker/main.py` 
8. Start web: `npm run dev --prefix apps/web` 
 
## Demo users 
- User: `demo@northstarmacro.local` / `demo12345` 
- Analyst: `analyst@northstarmacro.local` / `analyst12345` 
- Admin: `admin@northstarmacro.local` / `admin12345` 
 
## Verification 
- Web lint: `npm run lint --prefix apps/web` 
- Web build: `npm run build --prefix apps/web` 
