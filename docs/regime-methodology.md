# Regime Methodology

## Inputs
- Released-event surprise signal
- Component-level deterministic drifts
- Confidence scaling from magnitude of surprise

## Output
A regime snapshot with:
- `label` (Expansionary/Transitional/Contractionary)
- `score` in [-1, 1]
- `confidence` in [0, 1]
- `trend` and interpretation text
- component table (`growth`, `inflation`, `liquidity`, `rates`, `volatility`, `usd`)

## Demo constraints
- Designed for consistency and explainability in demo mode.
- Not a substitute for live macro nowcasting or proprietary signal engines.

## Why this is useful
- Keeps workstation state coherent across pages.
- Supports deterministic testing and reproducible behavior.
