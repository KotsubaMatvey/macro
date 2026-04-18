# Geoboard

## What it is
Geoboard is a ranked global macro intelligence surface. It keeps the tactical dark map shell and mode model while shifting the logic to a data-first feed engine.

## Runtime guarantees
- Map rendering is resilient to malformed rows and missing coordinates (bad rows are dropped, not rendered).
- Basemap loading is explicit and stateful (`loading` / `ready` / `degraded`) and does not block tactical overlays.
- Mode switches are deterministic: only rows that declare mode support are rendered in non-`STANDARD` modes.
- Feed assembly is deterministic and guarded: rows are normalized, deduped, link-sanitized, and sorted by rank/time.

## Layer taxonomy
- `live`: provider-backed discovery rows (currently GDELT discovery ingestion)
- `discovery`: secondary-source signal rows that require corroboration
- `derived`: mapped rows built from internal event/regime layers
- `static`: curated overlays (central-bank nodes and trade/chokepoints)
- `fallback`: degraded continuity rows when live/derived layers fail

These labels are surfaced in source metadata and in right-panel source-status badges.

Additional honesty constraints:
- `discovery` rows stay discovery signals even when ranked highly.
- `static` overlays never imply live telemetry.
- `derived` zones remain model context, not direct geospatial sensors.
- `fallback` rows remain explicitly degraded continuity data.

## Domain model
Geoboard payload includes:
- `geoEvents`: classified geo discovery rows with region/country inference, linked assets, and ranking metadata
- `macroEvents`: map-ready macro catalysts with family tags, horizon tags, and route links into event/reactions/bias/report surfaces
- `centralBanks`: curated nodes enriched with linked macro/news context and ranking metadata
- `tradeRoutes`: curated chokepoint routes enriched with linked discovery/news context and ranking metadata
- `regimeZones`: derived dashboard regime overlays, explicitly labeled derived
- `feed`: canonical ranked feed items that drive right-panel prioritization and map focus

## Ranking
Feed ranking is deterministic and scored per item using:
- urgency
- importance
- confidence
- recency
- source quality
- watchlist overlap
- catalyst proximity
- region significance
- regime relevance

The output includes both total `rankScore` and component scores for UI/runtime transparency.

Feed assembly also applies a lightweight mode/source/freshness overlay so:
- active mode relevance is explicit,
- fallback rows cannot dominate ranked tops unfairly,
- static/derived context remains useful but honest.

## Integration surfaces
Each feed item carries direct links into:
- Event Detail (`/app/events/:id`)
- Macro Calendar (`/app/macro-calendar`)
- News (`/app/news`)
- Live Reactions (`/app/live-reactions`)
- Market Bias (`/app/market-bias`)
- Reports (`/app/reports`)
- Watchlists (`/app/watchlists`)
- Alerts (`/app/alerts`)

Links are sanitized during feed assembly. Invalid or unsafe runtime paths are replaced with safe `/app/*` defaults.

## Honesty constraints
- GDELT rows are discovery signals, not verified geopolitical truth.
- Static overlays stay marked static/curated.
- Derived overlays stay marked derived.
- Fallback state is layer-specific and visible.
- Feed integrity blocks and ticker counters mirror layer runtime states (`live`, `derived`, `static`, `degraded`, `fallback`) without masking degradation.

## Evaluation
- Geoboard ranking evaluation remains replay-labeled by default.
- When signals are explicitly linked to scheduled events that have stored reaction windows, evaluation metadata records outcome coverage and realization horizon instead of hiding proxy-only limits.
