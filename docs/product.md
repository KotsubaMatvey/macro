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

## UX principles
- Institutional dark visual system
- Dense board-based desktop hierarchy
- Honest live/fallback/provider labeling
- Direct drill-down into event detail routes

## Expanded real-data layer
- Dashboard market strip now comes from a provider-backed market adapter rather than seeded pseudo-prices.
- Calendar and catalyst surfaces can switch to a live TradingEconomics-backed schedule while preserving explicit fallback or demo labeling.
- Reactions is now a dedicated research surface, Bias adds factor or influence detail, Track Record has its own replay evaluation page, and Reports archives weekly briefs.

## Integrity rules
- Do not imply live coverage when the adapter falls back. Discovery news rows must stay labeled as secondary even when the feed is fresh.
- Do not imply audited live track record when the product is showing replay analytics.
- Do not let report prose drift beyond the structured source-backed sections that generated it.

