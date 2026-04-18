# Data Model

## Identity and access
- users, profiles
- sessions
- email_verification_tokens, password_reset_tokens

## Macro domain
- event_families, events, event_release_assets, event_reaction_windows
- assets
- regime_snapshots, regime_components
- market_bias_snapshots, market_bias_rationales

## Content and collaboration
- briefings, news_items, news_clusters, news_item_assets, news_enrichment, news_provider_runs
- posts, comments, post_likes

## User workflows
- watchlists, watchlist_items
- alerts, alert_deliveries

## Intelligence core
- intelligence_entities: canonical source-aware entities across surfaces (news/event/asset/region/geoboard signal/cluster)
- intelligence_scores: unified importance/urgency/confidence/market-relevance/desk-relevance/rank snapshots
- intelligence_links: explicit typed edges (linked_asset, linked_event, linked_region, linked_news, linked_news_cluster, linked_report, linked_reaction)
- signal_snapshots: replay-safe point-in-time snapshots of ranked feed states
- signal_evaluations: replay-safe quality metrics (coverage, direction accuracy, calibration, ranking usefulness, source-quality alignment) with explicit outcome-grounding fields (`outcome_coverage`, `outcome_sample_size`, `realization_horizon`, `outcome_grounded`, `snapshot_ref`) when realized linkage data exists.

## Core contract semantics
- source/sourceType/sourceTier/sourceUrl are preserved on intelligence objects
- mode/freshness remain explicit (`live`, `demo`, `fallback`, `derived`, `static`, `replay`)
- unified score fields are deterministic and explainable via component factors + rationale
- linkedAssets/linkedEvents/linkedRegions/linkedNews/linkedReports/linkedReactions are explicit references, not front-end-only heuristics

## Operations
- feature_flags
- ingestion_jobs
- audit_logs
