# Market Bias Methodology

## Inputs
- Latest regime score
- Asset-specific deterministic drift term
- Confidence scaling from distance to neutral (50)

## Output per asset
- `direction`: Bullish / Neutral / Bearish
- `score`: 0..100
- `confidence`: 0..1
- `change_1d`, `change_5d`
- rationale entries

## Demo semantics
- Bias is deterministic and reproducible.
- It demonstrates product flow and UX behavior, not live signal alpha claims.

## Product usage
- Dashboard and Market Bias pages consume latest snapshots.
- Alerts and event planning can reference bias direction and score.
