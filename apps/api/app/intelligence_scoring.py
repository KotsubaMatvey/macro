from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from .source_meta import parse_source_timestamp
from .security import utc_now


def clamp01(value: float) -> float:
    if value < 0.0:
        return 0.0
    if value > 1.0:
        return 1.0
    return value


def round_score(value: float) -> float:
    return round(clamp01(value), 4)


def source_quality_score(source_type: str, source_tier: str, mode: str) -> float:
    source_component = {
        "official": 0.92,
        "derived": 0.78,
        "static": 0.68,
        "discovery": 0.56,
        "seeded": 0.48,
        "fallback": 0.42,
    }.get(str(source_type or "").lower(), 0.50)
    tier_component = 0.08 if str(source_tier or "").lower() == "primary" else 0.0
    mode_component = {
        "live": 0.05,
        "demo": -0.05,
        "fallback": -0.08,
        "derived": 0.00,
        "static": -0.02,
    }.get(str(mode or "").lower(), -0.04)
    return clamp01(source_component + tier_component + mode_component)


def recency_score(timestamp: object, *, horizon_hours: float = 96.0) -> float:
    parsed = parse_source_timestamp(timestamp)
    if parsed is None:
        return 0.18
    age_hours = max(0.0, (utc_now() - parsed).total_seconds() / 3600.0)
    return clamp01(1.0 - (age_hours / max(1.0, horizon_hours)))


def event_proximity_score(hours_to_event: float | None) -> float:
    if hours_to_event is None:
        return 0.14
    value = float(hours_to_event)
    if value < -24:
        return 0.30
    if value <= 2:
        return 0.98
    if value <= 24:
        return 0.86
    if value <= 24 * 3:
        return 0.68
    if value <= 24 * 7:
        return 0.54
    return 0.32


def watchlist_overlap_score(watch_hits: int, *, max_hits: int = 4) -> float:
    if watch_hits <= 0:
        return 0.0
    return clamp01(float(watch_hits) / float(max(1, max_hits)))


def asset_breadth_score(asset_count: int, *, max_assets: int = 6) -> float:
    if asset_count <= 0:
        return 0.0
    return clamp01(float(asset_count) / float(max(1, max_assets)))


@dataclass(frozen=True)
class UnifiedScoreInputs:
    importance: float
    urgency: float
    confidence: float
    source_quality: float
    recency: float
    watchlist_overlap: float
    event_proximity: float
    asset_breadth: float
    regime_relevance: float
    evidence_density: float


def compute_unified_scores(
    inputs: UnifiedScoreInputs,
    *,
    rationale: Iterable[str] | None = None,
) -> dict:
    importance = clamp01(inputs.importance)
    urgency = clamp01(inputs.urgency)
    confidence = clamp01(inputs.confidence)
    source_quality = clamp01(inputs.source_quality)
    recency = clamp01(inputs.recency)
    watchlist_overlap = clamp01(inputs.watchlist_overlap)
    event_proximity = clamp01(inputs.event_proximity)
    asset_breadth = clamp01(inputs.asset_breadth)
    regime_relevance = clamp01(inputs.regime_relevance)
    evidence_density = clamp01(inputs.evidence_density)

    market_relevance = clamp01(
        0.36 * importance
        + 0.24 * urgency
        + 0.16 * confidence
        + 0.10 * source_quality
        + 0.08 * asset_breadth
        + 0.06 * regime_relevance
    )
    desk_relevance = clamp01(
        0.42 * watchlist_overlap
        + 0.24 * event_proximity
        + 0.16 * market_relevance
        + 0.10 * regime_relevance
        + 0.08 * evidence_density
    )
    rank_score = clamp01(
        0.20 * importance
        + 0.18 * urgency
        + 0.16 * confidence
        + 0.14 * market_relevance
        + 0.14 * desk_relevance
        + 0.10 * recency
        + 0.08 * source_quality
    )

    return {
        "importanceScore": round_score(importance),
        "urgencyScore": round_score(urgency),
        "confidenceScore": round_score(confidence),
        "marketRelevanceScore": round_score(market_relevance),
        "deskRelevanceScore": round_score(desk_relevance),
        "rankScore": round_score(rank_score),
        "componentScores": {
            "sourceQualityScore": round_score(source_quality),
            "recencyScore": round_score(recency),
            "watchlistOverlapScore": round_score(watchlist_overlap),
            "eventProximityScore": round_score(event_proximity),
            "assetBreadthScore": round_score(asset_breadth),
            "regimeRelevanceScore": round_score(regime_relevance),
            "evidenceDensityScore": round_score(evidence_density),
        },
        "rationale": list(rationale or []),
    }
