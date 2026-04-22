# Product

## Positioning
Macro Access is a dark, desk-oriented macro intelligence workstation for event-driven operators.

## Current runtime
- Provider-backed today: dashboard market tape from Yahoo Finance via yfinance with FRED fallback proxies, plus a ranked News module (Wire / Macro Only / Watchlist) that ingests official feeds first and discovery feeds second.
- Seeded today: auth/demo accounts, briefings, watchlists, alerts, community, and admin workflows. Calendar/events are seeded only when TradingEconomics is not configured or unavailable.
- Replay today: track record is a retrospective model replay, not a live audited blotter

## Core surfaces
- Dashboard
- Macro Calendar
- Event Detail, Event Explorer, and Impact Lab
- Market Bias and Regime surfaces
- News (Wire, Macro Only, Watchlist), Briefings, Watchlists, Alerts, Community, Admin
- Data Sources (provider control plane)
- Relationship Map (entity graph explorer)
- Workspaces (saved desk presets)

## UX principles
- Institutional dark visual system
- Dense board-based desktop hierarchy
- Honest live/fallback/provider labeling
- Direct drill-down into event detail routes
- Fast keyboard-first workflows through a command palette (`Ctrl/Cmd+K`)
- Strong cross-surface pivots so the workstation behaves as one desk

## Expanded real-data layer
- Dashboard market strip now comes from a provider-backed market adapter rather than seeded pseudo-prices.
- Calendar and catalyst surfaces can switch to a live TradingEconomics-backed schedule while preserving explicit fallback or demo labeling.
- Reactions is now a dedicated research surface, Bias adds factor or influence detail, Track Record has its own replay evaluation page, and Reports archives weekly briefs.

## Integrity rules
- Do not imply live coverage when the adapter falls back. Discovery news rows must stay labeled as secondary even when the feed is fresh.
- Do not imply audited live track record when the product is showing replay analytics.
- Do not let report prose drift beyond the structured source-backed sections that generated it.


## Geoboard integrity model
- Discovery: GDELT-derived geopolitical rows are treated as ranked discovery signals and explicitly labeled discovery/secondary unless corroborated elsewhere.
- Derived: macro map rows and regime zones are derived from internal event/regime layers and labeled derived.
- Static: central bank nodes and trade/chokepoint routes remain curated static overlays with explicit static labeling.
- Fallback: each layer can degrade independently; fallback is shown per-layer in source status rather than hidden behind a generic online badge.
- Integration: ranked feed items carry direct links into Event Detail, Macro Calendar, News, Live Reactions, Market Bias, Reports, Watchlists, and Alerts.

## Operator platform upgrades
- Provider control plane: grouped domain rows for market, calendar, news, geoboard, and evaluation/worker freshness with explicit mode/source/freshness/state semantics.
- Relationship map: neighborhood exploration over the existing intelligence graph model; no separate front-end graph truth source.
- Workspaces: user-scoped persistence with safe CRUD and immutable defaults (`Macro Desk`, `Event Day`, `News + Calendar`, `Geoboard Focus`, `Reactions / Bias Review`).
- Command palette: searchable command registry with route jumps, workspace actions, and entity-aware pivots (event/news/asset graph actions).
- Cross-surface linkage: event/news/geoboard/provider/workspace surfaces now include direct pivots into related modules without hiding fallback or derived context.

