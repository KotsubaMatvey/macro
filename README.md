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
- Worker jobs now run domain-specific refresh, normalization, linkage, scoring, and evaluation paths while keeping admin-visible lifecycle states.
- Web API proxy routes now enforce deterministic upstream timeouts (`API_PROXY_TIMEOUT_MS`, default `15000`) and return explicit `504` timeout errors instead of hanging indefinitely.

## Unified Intelligence Core
- Shared contract layer: source metadata, runtime mode, freshness, unified score fields, entity linkage references, and evaluation metadata are normalized through common backend helpers.
- Unified scoring: importance, urgency, confidence, market relevance, desk relevance, and rank score are deterministic compositions with explicit component factors and rationale.
- Entity graph: explicit entities, links, and score snapshots are materialized into `intelligence_entities`, `intelligence_links`, and `intelligence_scores`.
- Evaluation framework: ranked-signal snapshots and evaluations are stored in `signal_snapshots` and `signal_evaluations`; metrics stay explicitly replay-labeled and now include outcome-grounded fields (`outcomeCoverage`, `outcomeSampleSize`, `realizationHorizon`, `snapshotRef`) when linked realized windows exist.

## Runtime state semantics
- `live`: provider-backed rows fetched from active providers with explicit source metadata.
- `fallback`: degraded continuity rows used when live providers fail or return unusable payloads.
- `derived`: backend-computed rows grounded in internal datasets (calendar, regime, graph, scoring).
- `static`: curated overlays or reference layers that are intentionally non-live.
- `seeded`: deterministic seed/demo rows used for demo continuity; never presented as live ingest.
- `replay`: retrospective evaluation/track-record context; not audited live discretionary performance.

## Workstation surfaces
- Dashboard: board-based macro workstation with regime, bias, catalysts, calendar, and market strip
- Macro Calendar: filterable event tape with drill-down into dynamic event detail
- Event Explorer and Impact Lab: family history and reaction context
- Market Bias and Liquidity Regime: cross-asset consensus and regime layers
- News (Wire, Macro Only, Watchlist), Briefings, Watchlists, Alerts, Community, Admin: connected operator workflows
- Data Sources: provider control plane with domain grouping, mode/source/freshness state, fallback and degraded notes, and affected-surface routing
- Relationship Map: graph neighborhood explorer over `intelligence_entities`/`intelligence_links` with route pivots into event/news/geoboard/reactions/bias/reports/alerts/watchlists
- Workspaces: user-scoped saved desk layouts with default presets (`Macro Desk`, `Event Day`, `News + Calendar`, `Geoboard Focus`, `Reactions / Bias Review`)
- Watchlist mutations are user-scoped server-side: items can only be written to watchlists owned by the authenticated user.

## Operator workflow upgrades
- Provider control plane API: `GET /api/v1/providers/status`
- Graph explorer API: `GET /api/v1/graph/neighborhood?entity_type=...&ref_id=...`
- Workspaces API: `GET/POST /api/v1/workspaces`, `GET/PATCH/DELETE /api/v1/workspaces/{workspace_id}`
- Command palette (`Ctrl/Cmd+K`): route jumps, entity-aware pivots, workspace open actions, and provider/graph shortcuts
- Cross-surface pivots are first-class across Dashboard, Calendar, Event Detail, News, Geoboard, Reactions, Bias, Reports, Alerts, Watchlists, Data Sources, and Relationship Map

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
- Feed hardening: assembly now normalizes malformed rows, sanitizes unsafe links, dedupes IDs, and applies explicit mode/source/freshness weighting so fallback/static rows do not silently dominate ranked tops.
- Map hardening: Geoboard map rendering drops invalid coordinates safely and keeps tactical overlays usable even when basemap loading is degraded.

## Live vs fallback
- Provider-backed today (`live`): dashboard market tape from Yahoo Finance via yfinance with explicit FRED fallback proxies, plus official-source news ingestion and explicitly labeled discovery augmentations.
- Fallback/demo today (`fallback` or `seeded`): continuity rows for demo accounts and degraded providers; these remain explicitly marked and never silently promoted to live.
- Replay today (`replay`): evaluation and track-record windows are retrospective analytics, not audited live discretionary calls or realized PnL statements.

## Real-data Product Layer
- Market data now runs through a replaceable provider adapter, with Yahoo Finance via yfinance as the primary live source and FRED public series as the explicit fallback proxy for SPX, NDX, DXY, US10Y, VIX, EURUSD, XAU, and BTC.
- Calendar data now prefers TradingEconomics when credentials are configured; the seeded calendar remains an explicit demo or fallback mode rather than a hidden live substitute.
- Reactions, Bias or Influencers, Track Record, and Reports all consume the same structured provider-backed product layer and keep live, fallback, and replay labeling explicit.

## Cache and Jobs
- Redis TTLs: market tape 5 minutes, intraday market windows 5 minutes, upcoming calendar 15 minutes, calendar history 1 hour, macro or FRED series 1 hour, dashboard live payload 5 minutes, reactions 15 minutes, track record 15 minutes, reports 30 minutes.
- Worker job types: refresh_demo_market_state, refresh_dashboard_cache, refresh_market_prices, refresh_calendar_events, ingest_official_news, ingest_discovery_news, cluster_news_items, enrich_news_items, normalize_news_entities, link_news_to_events, score_news_items, refresh_news_cache, rebuild_news_rankings, score_geoboard_signals, recompute_regime, recompute_market_bias, recompute_reactions, recompute_track_record, recompute_signal_evaluations, publish_scheduled_content, evaluate_alerts, generate_weekly_report.
- Worker job scope today: market refresh jobs invalidate market plus dependent insights and rebuild live dashboard caches (not workstation caches); calendar refresh jobs target calendar plus reactions or reports dependencies and rebuild workstation and live dashboard caches; replay or report jobs rebuild only replay or report surfaces.
- Reports are deterministic structured summaries today. There is no live LLM report path wired into the runtime, and the structured source-backed sections remain authoritative. News enrichment is deterministic text generation over ingested structured rows; it does not replace source provenance.

## Reactions and Replay Integrity
- Reactions use real market history windows only when the available data resolution supports them. Intraday windows are not fabricated.
- Track Record remains replay-only product analytics. It is not an audited live discretionary blotter or realized PnL record.



