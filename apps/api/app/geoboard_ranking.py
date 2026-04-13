from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable


@dataclass(frozen=True)
class GeoboardRankInputs:
 urgency_score: float
 importance_score: float
 confidence_score: float
 recency_score: float
 source_quality_score: float
 watchlist_overlap_score: float
 catalyst_proximity_score: float
 region_significance_score: float
 regime_relevance_score: float


def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
 if value < low:
  return low
 if value > high:
  return high
 return value


def source_quality_score(source_type: str, source_tier: str, mode: str) -> float:
 type_score = {
  'official': 0.92,
  'derived': 0.78,
  'static': 0.66,
  'discovery': 0.58,
  'fallback': 0.40,
 }.get(source_type, 0.50)
 tier_bonus = 0.08 if source_tier == 'primary' else 0.0
 mode_adjustment = {
  'live': 0.04,
  'derived': 0.0,
  'static': -0.02,
  'demo': -0.06,
  'fallback': -0.08,
 }.get(mode, -0.04)
 return _clamp(type_score + tier_bonus + mode_adjustment)


def rank_metadata(inputs: GeoboardRankInputs, rationale: Iterable[str] | None = None) -> dict:
 weighted = (
  0.22 * _clamp(inputs.urgency_score)
  + 0.20 * _clamp(inputs.importance_score)
  + 0.16 * _clamp(inputs.confidence_score)
  + 0.12 * _clamp(inputs.recency_score)
  + 0.11 * _clamp(inputs.source_quality_score)
  + 0.08 * _clamp(inputs.watchlist_overlap_score)
  + 0.05 * _clamp(inputs.catalyst_proximity_score)
  + 0.04 * _clamp(inputs.region_significance_score)
  + 0.02 * _clamp(inputs.regime_relevance_score)
 )
 return {
  'rankScore': round(_clamp(weighted), 4),
  'urgencyScore': round(_clamp(inputs.urgency_score), 4),
  'importanceScore': round(_clamp(inputs.importance_score), 4),
  'confidenceScore': round(_clamp(inputs.confidence_score), 4),
  'recencyScore': round(_clamp(inputs.recency_score), 4),
  'sourceQualityScore': round(_clamp(inputs.source_quality_score), 4),
  'watchlistOverlapScore': round(_clamp(inputs.watchlist_overlap_score), 4),
  'catalystProximityScore': round(_clamp(inputs.catalyst_proximity_score), 4),
  'regionSignificanceScore': round(_clamp(inputs.region_significance_score), 4),
  'regimeRelevanceScore': round(_clamp(inputs.regime_relevance_score), 4),
  'rationale': list(rationale or []),
 }
