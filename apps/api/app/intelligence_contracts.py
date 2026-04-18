from __future__ import annotations

from typing import Iterable

from .intelligence_semantics import (
    normalize_freshness,
    normalize_mode,
    normalize_score,
    normalize_source_tier,
    normalize_source_type,
    normalize_text,
    uniq,
)


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
        "linkedAssets": uniq(linked_assets),
        "linkedEvents": uniq(linked_events),
        "linkedRegions": uniq(linked_regions),
        "linkedNews": uniq(linked_news),
        "linkedReports": uniq(linked_reports),
        "linkedReactions": uniq(linked_reactions),
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
    outcome_coverage: float | None = None,
    outcome_sample_size: int | None = None,
    realization_horizon: str = "",
    outcome_grounded: bool | None = None,
    snapshot_ref: str = "",
) -> dict:
    return {
        "surface": normalize_text(surface),
        "signalType": normalize_text(signal_type),
        "signalRef": normalize_text(signal_ref),
        "sampleSize": max(0, int(sample_size or 0)),
        "coverage": normalize_score(coverage) if coverage is not None else None,
        "directionAccuracy": normalize_score(direction_accuracy) if direction_accuracy is not None else None,
        "magnitudeError": float(magnitude_error) if magnitude_error is not None else None,
        "falsePositiveRate": normalize_score(false_positive_rate) if false_positive_rate is not None else None,
        "calibrationQuality": normalize_score(calibration) if calibration is not None else None,
        "rankingUsefulness": normalize_score(ranking_usefulness) if ranking_usefulness is not None else None,
        "sourceQualityAlignment": normalize_score(source_quality_alignment) if source_quality_alignment is not None else None,
        "mode": normalize_mode(mode),
        "note": normalize_text(note),
        "outcomeCoverage": normalize_score(outcome_coverage) if outcome_coverage is not None else None,
        "outcomeSampleSize": max(0, int(outcome_sample_size or 0)) if outcome_sample_size is not None else None,
        "realizationHorizon": normalize_text(realization_horizon),
        "outcomeGrounded": bool(outcome_grounded) if outcome_grounded is not None else None,
        "snapshotRef": normalize_text(snapshot_ref),
    }


def _normalize_evaluation(
    evaluation: dict | None,
    *,
    fallback_surface: str = "",
    fallback_signal_type: str = "",
    fallback_signal_ref: str = "",
    fallback_mode: str = "replay",
) -> dict:
    if not isinstance(evaluation, dict):
        return build_evaluation_metadata(
            surface=fallback_surface,
            signal_type=fallback_signal_type,
            signal_ref=fallback_signal_ref,
            mode=fallback_mode,
            note="No evaluation history yet.",
        )

    return build_evaluation_metadata(
        surface=str(evaluation.get("surface") or fallback_surface),
        signal_type=str(evaluation.get("signalType") or fallback_signal_type),
        signal_ref=str(evaluation.get("signalRef") or fallback_signal_ref),
        sample_size=int(evaluation.get("sampleSize") or 0),
        coverage=evaluation.get("coverage"),
        direction_accuracy=evaluation.get("directionAccuracy"),
        magnitude_error=evaluation.get("magnitudeError"),
        false_positive_rate=evaluation.get("falsePositiveRate"),
        calibration=evaluation.get("calibrationQuality"),
        ranking_usefulness=evaluation.get("rankingUsefulness"),
        source_quality_alignment=evaluation.get("sourceQualityAlignment"),
        mode=str(evaluation.get("mode") or fallback_mode),
        note=str(evaluation.get("note") or ""),
        outcome_coverage=evaluation.get("outcomeCoverage"),
        outcome_sample_size=evaluation.get("outcomeSampleSize"),
        realization_horizon=str(evaluation.get("realizationHorizon") or ""),
        outcome_grounded=evaluation.get("outcomeGrounded"),
        snapshot_ref=str(evaluation.get("snapshotRef") or ""),
    )


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

    normalized_source = normalize_text(source) or "unknown-source"
    normalized_fallback_reason = normalize_text(fallback_reason)
    if normalized_mode == "live":
        normalized_fallback_reason = ""

    return {
        "source": normalized_source,
        "sourceType": normalize_source_type(source_type),
        "sourceUrl": normalize_text(source_url) or None,
        "sourceTier": normalize_source_tier(source_tier),
        "mode": normalized_mode,
        "freshness": normalized_freshness,
        "importance": normalize_score(scores.get("importanceScore")),
        "urgency": normalize_score(scores.get("urgencyScore")),
        "confidence": normalize_score(scores.get("confidenceScore")),
        "marketRelevance": normalize_score(scores.get("marketRelevanceScore")),
        "deskRelevance": normalize_score(scores.get("deskRelevanceScore")),
        "rankScore": normalize_score(scores.get("rankScore")),
        "scoreRationale": [normalize_text(item) for item in list(scores.get("rationale") or []) if normalize_text(item)],
        "scoreComponents": dict(scores.get("componentScores") or {}),
        "linkedAssets": list(links.get("linkedAssets") or []),
        "linkedEvents": list(links.get("linkedEvents") or []),
        "linkedRegions": list(links.get("linkedRegions") or []),
        "linkedNews": list(links.get("linkedNews") or []),
        "linkedReports": list(links.get("linkedReports") or []),
        "linkedReactions": list(links.get("linkedReactions") or []),
        "derivedFrom": uniq(derived_from),
        "fallbackReason": normalized_fallback_reason,
        "evaluation": _normalize_evaluation(
            evaluation,
            fallback_mode="replay" if normalized_mode == "live" else normalized_mode,
        ),
    }
