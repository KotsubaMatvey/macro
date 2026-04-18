from __future__ import annotations

from typing import Any

from .intelligence_scoring import clamp01


def mean(values: list[float]) -> float:
 if not values:
  return 0.0
 return sum(values) / len(values)


def top_slice(rows: list[dict[str, Any]], *, fraction: float = 0.25, key: str = 'rank_score') -> list[dict[str, Any]]:
 if not rows:
  return []
 count = max(1, int(round(len(rows) * max(0.05, min(0.95, fraction)))))
 ordered = sorted(rows, key=lambda row: float(row.get(key) or 0.0), reverse=True)
 return ordered[:count]


def normalized_outcome_magnitude(value: float | None, *, scale: float = 2.5) -> float | None:
 if value is None:
  return None
 return clamp01(abs(float(value)) / max(0.1, scale))


def calibration_quality(predictions: list[float], outcomes: list[float]) -> float:
 if not predictions or not outcomes:
  return 0.0
 pairs = min(len(predictions), len(outcomes))
 if pairs <= 0:
  return 0.0
 error = 0.0
 for index in range(pairs):
  error += abs(clamp01(predictions[index]) - clamp01(outcomes[index]))
 return clamp01(1.0 - (error / pairs))


def lift_score(top_mean: float, baseline_mean: float) -> float:
 return clamp01(0.5 + (top_mean - baseline_mean))
