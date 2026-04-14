from __future__ import annotations

from typing import Iterable

from .intelligence_scoring import clamp01

VALID_SOURCE_TYPES = {"official", "discovery", "derived", "static", "fallback", "seeded"}
VALID_SOURCE_TIERS = {"primary", "secondary"}
VALID_MODES = {"live", "demo", "fallback", "static", "derived", "mixed", "replay"}
VALID_FRESHNESS = {"fresh", "aging", "stale", "degraded"}


def _normalize_text(value: object) -> str:
    return str(value or "").strip()


def normalize_source_type(value: object) -> str:
    normalized = _normalize_text(value).lower()
    if normalized in VALID_SOURCE_TYPES:
        return normalized
    return "discovery"


def normalize_source_tier(value: object) -> str:
    normalized = _normalize_text(value).lower()
    if normalized in VALID_SOURCE_TIERS:
        return normalized
    return "secondary"


def normalize_mode(value: object) -> str:
    normalized = _normalize_text(value).lower()
    if normalized in VALID_MODES:
        return normalized
    return "fallback"


def normalize_freshness(value: object, *, mode: str = "fallback") -> str:
    normalized = _normalize_text(value).lower()
    if normalized in VALID_FRESHNESS:
        return normalized
    if mode in {"demo", "fallback", "derived", "static"}:
        return "degraded"
    return "fresh"


def _uniq(values: Iterable[object]) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for value in values:
        item = _normalize_text(value)
        if not item:
            continue
        if item in seen:
            continue
        seen.add(item)
        out.append(item)
    return out


def build_linked_references(
    *,
    linked_assets: Iterable[object] = (),
    linked_events: Iterable[object] = (),
    linked_regions: Iterable[object] = (),
    linked_news: Iterable[object] = (),
    linked_reports: Iterable[object] = (),
    linked_reactions: Iterable[object] = (),
) -> dict:
    return {
        "linkedAssets": _uniq(linked_assets),
        "linkedEvents": _uniq(linked_events),
        "linkedRegions": _uniq(linked_regions),
        "linkedNews": _uniq(linked_news),
        "linkedReports": _uniq(linked_reports),
        "linkedReactions": _uniq(linked_reactions),
    }


def build_evaluation_metadata(
    *,
    surface: str,
    signal_type: str,
    signal_ref: str,
    sample_size: int = 0,
    coverage: float | None = None,
    direction_accuracy: float | None = None,
    magnitude_error: float | None = None,
    false_positive_rate: float | None = None,
    calibration: float | None = None,
    ranking_usefulness: float | None = None,
    source_quality_alignment: float | None = None,
    mode: str = "replay",
    note: str = "",
) -> dict:
    return {
        "surface": _normalize_text(surface),
        "signalType": _normalize_text(signal_type),
        "signalRef": _normalize_text(signal_ref),
        "sampleSize": max(0, int(sample_size or 0)),
        "coverage": round(clamp01(float(coverage)), 4) if coverage is not None else None,
        "directionAccuracy": round(clamp01(float(direction_accuracy)), 4) if direction_accuracy is not None else None,
        "magnitudeError": float(magnitude_error) if magnitude_error is not None else None,
        "falsePositiveRate": round(clamp01(float(false_positive_rate)), 4) if false_positive_rate is not None else None,
        "calibrationQuality": round(clamp01(float(calibration)), 4) if calibration is not None else None,
        "rankingUsefulness": round(clamp01(float(ranking_usefulness)), 4) if ranking_usefulness is not None else None,
        "sourceQualityAlignment": round(clamp01(float(source_quality_alignment)), 4) if source_quality_alignment is not None else None,
        "mode": normalize_mode(mode),
        "note": _normalize_text(note),
    }


def build_intelligence_contract(
    *,
    source: str,
    source_type: str,
    source_tier: str,
    source_url: str | None,
    mode: str,
    freshness: str,
    scores: dict,
    links: dict,
    derived_from: Iterable[object] = (),
    fallback_reason: str = "",
    evaluation: dict | None = None,
) -> dict:
    normalized_mode = normalize_mode(mode)
    normalized_freshness = normalize_freshness(freshness, mode=normalized_mode)
    return {
        "source": _normalize_text(source),
        "sourceType": normalize_source_type(source_type),
        "sourceUrl": _normalize_text(source_url) or None,
        "sourceTier": normalize_source_tier(source_tier),
        "mode": normalized_mode,
        "freshness": normalized_freshness,
        "importance": float(scores.get("importanceScore") or 0.0),
        "urgency": float(scores.get("urgencyScore") or 0.0),
        "confidence": float(scores.get("confidenceScore") or 0.0),
        "marketRelevance": float(scores.get("marketRelevanceScore") or 0.0),
        "deskRelevance": float(scores.get("deskRelevanceScore") or 0.0),
        "rankScore": float(scores.get("rankScore") or 0.0),
        "scoreRationale": list(scores.get("rationale") or []),
        "scoreComponents": dict(scores.get("componentScores") or {}),
        "linkedAssets": list(links.get("linkedAssets") or []),
        "linkedEvents": list(links.get("linkedEvents") or []),
        "linkedRegions": list(links.get("linkedRegions") or []),
        "linkedNews": list(links.get("linkedNews") or []),
        "linkedReports": list(links.get("linkedReports") or []),
        "linkedReactions": list(links.get("linkedReactions") or []),
        "derivedFrom": _uniq(derived_from),
        "fallbackReason": _normalize_text(fallback_reason),
        "evaluation": evaluation or build_evaluation_metadata(surface="", signal_type="", signal_ref="", mode="replay"),
    }
