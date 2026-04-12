# Demo Mode

## What demo mode means
- Real API/auth/session mechanics over a seeded domain dataset.
- Dashboard market/news surfaces can still use real providers when FRED/RSS are reachable.
- Calendar and catalyst state remain seeded or demo-backed unless TradingEconomics credentials are configured and reachable; briefing, watchlist, alert, community, and admin state remain seeded or demo-backed.

## Boundaries
- No fake live-feed claims.
- Fallback/degraded metadata must remain visible when providers fail.
- Track record is a retrospective model replay, not a logged discretionary track record.

## Worker behavior
- Jobs represent operational classes (state refresh, recompute, publish, evaluate, cache refresh).
- The worker keeps admin-visible job lifecycle and refreshes only the surfaces relevant to each job type.
