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
- Hybrid runtime: provider-backed market tape through Yahoo Finance via yfinance with FRED fallback proxies, plus a ranked news pipeline that prioritizes official macro sources and labels discovery feeds explicitly.
- Seeded workstation domain data for auth, calendar/events, briefings, watchlists, alerts, community, and admin flows
- Session auth with secure token hashing and cookie sessions
- Redis used for queue/cache/rate-limits (with worker queue consumption and dashboard cache warming)
- Worker jobs recompute or refresh specific surfaces and persist admin-visible job lifecycle

## Workstation surfaces
- Dashboard: board-based macro workstation with regime, bias, catalysts, calendar, and market strip
- Macro Calendar: filterable event tape with drill-down into dynamic event detail
- Event Explorer and Impact Lab: family history and reaction context
- Market Bias and Liquidity Regime: cross-asset consensus and regime layers
- News (Wire, Macro Only, Watchlist), Briefings, Watchlists, Alerts, Community, Admin: connected operator workflows

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


## Geoboard data model
- Geo discovery rows: GDELT-backed discovery signals classified into conflict, sanctions, shipping/logistics, energy, supply-chain, trade-policy, political, and sovereign-stress buckets. These remain discovery rows, not verified geopolitical truth claims.
- Macro map rows: DB-backed event family projections with region tags, urgency horizons (today / next 24h / next 7d), event-detail links, and reactions/bias/report pivots.
- Central banks and trade routes: curated static overlays kept explicit as static; they are enriched with linked macro/news/asset context and ranked alongside live/derived rows.
- Regime zones: derived dashboard context labeled as derived, not presented as direct live geographic telemetry.
- Feed engine: canonical ranked items scored on urgency, importance, confidence, recency, source quality, watchlist overlap, catalyst proximity, region significance, and regime relevance.

## Live vs fallback
- Provider-backed today: dashboard market tape from Yahoo Finance via yfinance with honest FRED fallback proxies, plus official-source news ingestion with discovery-layer augmentation and explicit source labels
- Fallback/demo today: demo accounts, watchlists/alerts/community/admin content, and seeded calendar or catalyst rows whenever TradingEconomics is missing or degraded
- Replay/simulated today: track-record windows are retrospective model replays, not logged discretionary calls

## Real-data Product Layer
- Market data now runs through a replaceable provider adapter, with Yahoo Finance via yfinance as the primary live source and FRED public series as the explicit fallback proxy for SPX, NDX, DXY, US10Y, VIX, EURUSD, XAU, and BTC.
- Calendar data now prefers TradingEconomics when credentials are configured; the seeded calendar remains an explicit demo or fallback mode rather than a hidden live substitute.
- Reactions, Bias or Influencers, Track Record, and Reports all consume the same structured provider-backed product layer and keep live, fallback, and replay labeling explicit.

## Cache and Jobs
- Redis TTLs: market tape 5 minutes, intraday market windows 5 minutes, upcoming calendar 15 minutes, calendar history 1 hour, macro or FRED series 1 hour, dashboard live payload 5 minutes, reactions 15 minutes, track record 15 minutes, reports 30 minutes.
- Worker job types: refresh_demo_market_state, refresh_dashboard_cache, refresh_market_prices, refresh_calendar_events, ingest_official_news, ingest_discovery_news, cluster_news_items, enrich_news_items, refresh_news_cache, rebuild_news_rankings, recompute_regime, recompute_market_bias, recompute_reactions, recompute_track_record, publish_scheduled_content, evaluate_alerts, generate_weekly_report.
- Worker job scope today: market refresh jobs invalidate market plus dependent insights and rebuild live dashboard caches (not workstation caches); calendar refresh jobs target calendar plus reactions or reports dependencies and rebuild workstation and live dashboard caches; replay or report jobs rebuild only replay or report surfaces.
- Reports are deterministic structured summaries today. There is no live LLM report path wired into the runtime, and the structured source-backed sections remain authoritative. News enrichment is deterministic text generation over ingested structured rows; it does not replace source provenance.

## Reactions and Replay Integrity
- Reactions use real market history windows only when the available data resolution supports them. Intraday windows are not fabricated.
- Track Record remains replay-only product analytics. It is not an audited live discretionary blotter or realized PnL record.



