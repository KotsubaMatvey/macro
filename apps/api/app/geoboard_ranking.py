from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from .intelligence_scoring import UnifiedScoreInputs, clamp01, compute_unified_scores, source_quality_score as unified_source_quality_score


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
 market_relevance_score: float | None = None
 desk_relevance_score: float | None = None


def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
 if value < low:
  return low
 if value > high:
  return high
 return value


def source_quality_score(source_type: str, source_tier: str, mode: str) -> float:
 return unified_source_quality_score(source_type, source_tier, mode)


def rank_metadata(inputs: GeoboardRankInputs, rationale: Iterable[str] | None = None) -> dict:
 base_scores = compute_unified_scores(
  UnifiedScoreInputs(
   importance=_clamp(inputs.importance_score),
   urgency=_clamp(inputs.urgency_score),
   confidence=_clamp(inputs.confidence_score),
   source_quality=_clamp(inputs.source_quality_score),
   recency=_clamp(inputs.recency_score),
   watchlist_overlap=_clamp(inputs.watchlist_overlap_score),
   event_proximity=_clamp(inputs.catalyst_proximity_score),
   asset_breadth=_clamp(inputs.region_significance_score),
   regime_relevance=_clamp(inputs.regime_relevance_score),
   evidence_density=_clamp((inputs.watchlist_overlap_score + inputs.recency_score) / 2.0),
  ),
  rationale=rationale,
 )
 market_relevance = _clamp(
  inputs.market_relevance_score
  if inputs.market_relevance_score is not None
  else base_scores["marketRelevanceScore"],
 )
 desk_relevance = _clamp(
  inputs.desk_relevance_score
  if inputs.desk_relevance_score is not None
  else base_scores["deskRelevanceScore"],
 )
 weighted = (
  0.17 * _clamp(inputs.urgency_score)
  + 0.17 * _clamp(inputs.importance_score)
  + 0.14 * _clamp(inputs.confidence_score)
  + 0.12 * market_relevance
  + 0.12 * desk_relevance
  + 0.09 * _clamp(inputs.recency_score)
  + 0.07 * _clamp(inputs.source_quality_score)
  + 0.05 * _clamp(inputs.watchlist_overlap_score)
  + 0.04 * _clamp(inputs.catalyst_proximity_score)
  + 0.03 * _clamp(inputs.region_significance_score)
 )
 return {
  "rankScore": round(_clamp(weighted), 4),
  "urgencyScore": round(_clamp(inputs.urgency_score), 4),
  "importanceScore": round(_clamp(inputs.importance_score), 4),
  "confidenceScore": round(_clamp(inputs.confidence_score), 4),
  "marketRelevanceScore": round(market_relevance, 4),
  "deskRelevanceScore": round(desk_relevance, 4),
  "recencyScore": round(_clamp(inputs.recency_score), 4),
  "sourceQualityScore": round(_clamp(inputs.source_quality_score), 4),
  "watchlistOverlapScore": round(_clamp(inputs.watchlist_overlap_score), 4),
  "catalystProximityScore": round(_clamp(inputs.catalyst_proximity_score), 4),
  "regionSignificanceScore": round(_clamp(inputs.region_significance_score), 4),
  "regimeRelevanceScore": round(_clamp(inputs.regime_relevance_score), 4),
  "componentScores": base_scores.get("componentScores", {}),
  "rationale": list(rationale or []),
 }
