# Product

## Positioning
Macro Access is a dark, desk-oriented macro intelligence workstation for event-driven operators.

## Current runtime
- Provider-backed today: dashboard market tape from FRED public series and official RSS feeds when reachable
- Seeded today: auth/demo accounts, macro calendar/events, briefings, watchlists, alerts, community, and admin workflows
- Replay today: track record is a retrospective model replay, not a live audited blotter

## Core surfaces
- Dashboard
- Macro Calendar
- Event Detail, Event Explorer, and Impact Lab
- Market Bias and Regime surfaces
- News, Briefings, Watchlists, Alerts, Community, Admin

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
- Do not imply live coverage when the adapter falls back.
- Do not imply audited live track record when the product is showing replay analytics.
- Do not let optional LLM narrative override numeric source-backed sections in reports.
