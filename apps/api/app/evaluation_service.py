from __future__ import annotations

import uuid
from typing import Any

from .db import fetch_all, fetch_one, get_connection
from .intelligence_contracts import build_evaluation_metadata
from .intelligence_scoring import clamp01
from .security import utc_now


def _id(prefix: str) -> str:
    return prefix + "-" + uuid.uuid4().hex[:12]


def record_signal_snapshot(
    *,
    surface: str,
    signal_type: str,
    signal_ref: str,
    payload: dict,
    mode: str,
    freshness: str,
    as_of: str | None = None,
) -> str:
    snapshot_id = _id("ssnap")
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                insert into signal_snapshots
                (id, surface, signal_type, signal_ref, as_of, payload, mode, freshness, created_at)
                values (%s, %s, %s, %s, %s, %s::jsonb, %s, %s, now())
                """,
                (
                    snapshot_id,
                    str(surface),
                    str(signal_type),
                    str(signal_ref),
                    str(as_of or utc_now().isoformat()),
                    __import__("json").dumps(payload or {}),
                    str(mode or "fallback"),
                    str(freshness or "degraded"),
                ),
            )
    return snapshot_id


def record_signal_evaluation(
    *,
    surface: str,
    signal_type: str,
    signal_ref: str,
    window: str,
    sample_size: int,
    coverage: float | None,
    direction_accuracy: float | None,
    magnitude_error: float | None,
    false_positive_rate: float | None,
    calibration: float | None,
    ranking_usefulness: float | None,
    source_quality_alignment: float | None,
    realized_move: float | None = None,
    mode: str = "replay",
    note: str = "",
) -> str:
    evaluation_id = _id("seval")
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                insert into signal_evaluations
                (
                    id, surface, signal_type, signal_ref, window,
                    sample_size, coverage, direction_accuracy, magnitude_error,
                    false_positive_rate, calibration, ranking_usefulness,
                    source_quality_alignment, realized_move, mode, note, created_at
                )
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now())
                """,
                (
                    evaluation_id,
                    str(surface),
                    str(signal_type),
                    str(signal_ref),
                    str(window),
                    int(sample_size or 0),
                    float(coverage) if coverage is not None else None,
                    float(direction_accuracy) if direction_accuracy is not None else None,
                    float(magnitude_error) if magnitude_error is not None else None,
                    float(false_positive_rate) if false_positive_rate is not None else None,
                    float(calibration) if calibration is not None else None,
                    float(ranking_usefulness) if ranking_usefulness is not None else None,
                    float(source_quality_alignment) if source_quality_alignment is not None else None,
                    float(realized_move) if realized_move is not None else None,
                    str(mode),
                    str(note or ""),
                ),
            )
    return evaluation_id


def latest_evaluation(surface: str, signal_type: str, signal_ref: str) -> dict[str, Any] | None:
    return fetch_one(
        """
        select surface, signal_type, signal_ref, sample_size, coverage, direction_accuracy,
               magnitude_error, false_positive_rate, calibration, ranking_usefulness,
               source_quality_alignment, mode, note
        from signal_evaluations
        where surface = %s and signal_type = %s and signal_ref = %s
        order by created_at desc
        limit 1
        """,
        (surface, signal_type, signal_ref),
    )


def latest_evaluation_metadata(surface: str, signal_type: str, signal_ref: str, *, fallback_note: str = "") -> dict:
    try:
        row = latest_evaluation(surface, signal_type, signal_ref)
    except Exception:
        row = None
    if not row:
        return build_evaluation_metadata(
            surface=surface,
            signal_type=signal_type,
            signal_ref=signal_ref,
            sample_size=0,
            mode="replay",
            note=fallback_note or "No evaluation history yet.",
        )
    return build_evaluation_metadata(
        surface=surface,
        signal_type=signal_type,
        signal_ref=signal_ref,
        sample_size=int(row.get("sample_size") or 0),
        coverage=float(row.get("coverage")) if row.get("coverage") is not None else None,
        direction_accuracy=float(row.get("direction_accuracy")) if row.get("direction_accuracy") is not None else None,
        magnitude_error=float(row.get("magnitude_error")) if row.get("magnitude_error") is not None else None,
        false_positive_rate=float(row.get("false_positive_rate")) if row.get("false_positive_rate") is not None else None,
        calibration=float(row.get("calibration")) if row.get("calibration") is not None else None,
        ranking_usefulness=float(row.get("ranking_usefulness")) if row.get("ranking_usefulness") is not None else None,
        source_quality_alignment=float(row.get("source_quality_alignment")) if row.get("source_quality_alignment") is not None else None,
        mode=str(row.get("mode") or "replay"),
        note=str(row.get("note") or ""),
    )


def _mean(values: list[float]) -> float:
    if not values:
        return 0.0
    return sum(values) / len(values)


def evaluate_news_ranking(*, lookback_hours: int = 168) -> dict:
    rows = fetch_all(
        """
        select rank_score, importance_score, urgency_score, confidence_score, source_type
        from news_items
        where canonical = true
          and published_at >= now() - make_interval(hours => %s)
        """,
        (lookback_hours,),
    )
    sample_size = len(rows)
    if sample_size == 0:
        meta = build_evaluation_metadata(
            surface="news",
            signal_type="ranking",
            signal_ref="news-feed",
            sample_size=0,
            mode="replay",
            note="No canonical news rows were available for evaluation.",
        )
        record_signal_evaluation(
            surface="news",
            signal_type="ranking",
            signal_ref="news-feed",
            window=f"{lookback_hours}h",
            sample_size=0,
            coverage=0.0,
            direction_accuracy=None,
            magnitude_error=None,
            false_positive_rate=None,
            calibration=None,
            ranking_usefulness=0.0,
            source_quality_alignment=0.0,
            mode="replay",
            note=meta["note"],
        )
        return meta

    ordered = sorted(rows, key=lambda row: float(row.get("rank_score") or 0.0), reverse=True)
    top_n = max(1, int(round(sample_size * 0.25)))
    top_rows = ordered[:top_n]

    all_signal = _mean([
        (float(row.get("importance_score") or 0.0) + float(row.get("urgency_score") or 0.0) + float(row.get("confidence_score") or 0.0)) / 3.0
        for row in ordered
    ])
    top_signal = _mean([
        (float(row.get("importance_score") or 0.0) + float(row.get("urgency_score") or 0.0) + float(row.get("confidence_score") or 0.0)) / 3.0
        for row in top_rows
    ])

    ranking_usefulness = clamp01(0.5 + (top_signal - all_signal))
    top_official_share = _mean([1.0 if str(row.get("source_type") or "") == "official" else 0.0 for row in top_rows])
    all_official_share = _mean([1.0 if str(row.get("source_type") or "") == "official" else 0.0 for row in ordered])
    source_alignment = clamp01(0.5 + (top_official_share - all_official_share))
    high_rank_low_urgency = len([row for row in top_rows if float(row.get("urgency_score") or 0.0) < 0.35])
    false_positive_rate = clamp01(float(high_rank_low_urgency) / float(max(1, len(top_rows))))

    note = "News ranking evaluation reflects whether top-ranked rows concentrate stronger cross-factor signals and source quality."
    record_signal_evaluation(
        surface="news",
        signal_type="ranking",
        signal_ref="news-feed",
        window=f"{lookback_hours}h",
        sample_size=sample_size,
        coverage=1.0,
        direction_accuracy=None,
        magnitude_error=None,
        false_positive_rate=false_positive_rate,
        calibration=clamp01(1.0 - abs(top_signal - all_signal)),
        ranking_usefulness=ranking_usefulness,
        source_quality_alignment=source_alignment,
        mode="replay",
        note=note,
    )
    return latest_evaluation_metadata("news", "ranking", "news-feed", fallback_note=note)


def evaluate_geoboard_ranking(*, lookback_hours: int = 168) -> dict:
    rows = fetch_all(
        """
        select s.rank_score, s.importance_score, s.urgency_score, s.confidence_score,
               s.market_relevance_score, s.desk_relevance_score
        from intelligence_entities e
        join intelligence_scores s on s.entity_id = e.id
        where e.entity_type = 'geoboard_signal'
          and s.computed_at >= now() - make_interval(hours => %s)
        order by s.computed_at desc
        """,
        (lookback_hours,),
    )
    sample_size = len(rows)
    if sample_size == 0:
        note = "No geoboard ranked signal history was available for evaluation."
        record_signal_evaluation(
            surface="geoboard",
            signal_type="ranking",
            signal_ref="feed",
            window=f"{lookback_hours}h",
            sample_size=0,
            coverage=0.0,
            direction_accuracy=None,
            magnitude_error=None,
            false_positive_rate=None,
            calibration=None,
            ranking_usefulness=0.0,
            source_quality_alignment=0.0,
            mode="replay",
            note=note,
        )
        return latest_evaluation_metadata("geoboard", "ranking", "feed", fallback_note=note)

    top_n = max(1, int(round(sample_size * 0.30)))
    ordered = sorted(rows, key=lambda row: float(row.get("rank_score") or 0.0), reverse=True)
    top_rows = ordered[:top_n]

    top_context = _mean([
        (float(row.get("market_relevance_score") or 0.0) + float(row.get("desk_relevance_score") or 0.0)) / 2.0
        for row in top_rows
    ])
    all_context = _mean([
        (float(row.get("market_relevance_score") or 0.0) + float(row.get("desk_relevance_score") or 0.0)) / 2.0
        for row in ordered
    ])
    ranking_usefulness = clamp01(0.5 + (top_context - all_context))
    note = "Geoboard ranking evaluation measures concentration of context-relevant scored signals at the top of the feed."

    record_signal_evaluation(
        surface="geoboard",
        signal_type="ranking",
        signal_ref="feed",
        window=f"{lookback_hours}h",
        sample_size=sample_size,
        coverage=1.0,
        direction_accuracy=None,
        magnitude_error=None,
        false_positive_rate=clamp01(
            len([row for row in top_rows if float(row.get("urgency_score") or 0.0) < 0.30]) / float(max(1, len(top_rows))),
        ),
        calibration=clamp01(1.0 - abs(top_context - all_context)),
        ranking_usefulness=ranking_usefulness,
        source_quality_alignment=clamp01(_mean([float(row.get("confidence_score") or 0.0) for row in top_rows])),
        mode="replay",
        note=note,
    )
    return latest_evaluation_metadata("geoboard", "ranking", "feed", fallback_note=note)


def evaluate_alert_usefulness(*, lookback_days: int = 30) -> dict:
    row = fetch_one(
        """
        select
          count(distinct a.id) as alerts,
          count(d.id) as deliveries,
          count(case when a.status = 'Triggered' then 1 end) as triggered
        from alerts a
        left join alert_deliveries d on d.alert_id = a.id
          and d.delivered_at >= now() - make_interval(days => %s)
        where a.created_at <= now()
        """,
        (lookback_days,),
    )
    alerts = int((row or {}).get("alerts") or 0)
    deliveries = int((row or {}).get("deliveries") or 0)
    triggered = int((row or {}).get("triggered") or 0)
    coverage = clamp01(float(deliveries) / float(max(1, alerts)))
    false_positive_rate = clamp01(float(max(0, triggered - deliveries)) / float(max(1, triggered)))
    ranking_usefulness = clamp01(0.5 + (coverage - false_positive_rate) * 0.5)
    note = "Alert usefulness reflects delivered signal coverage versus triggered-without-delivery drift."

    record_signal_evaluation(
        surface="alerts",
        signal_type="usefulness",
        signal_ref="alert-engine",
        window=f"{lookback_days}d",
        sample_size=alerts,
        coverage=coverage,
        direction_accuracy=None,
        magnitude_error=None,
        false_positive_rate=false_positive_rate,
        calibration=None,
        ranking_usefulness=ranking_usefulness,
        source_quality_alignment=None,
        mode="replay",
        note=note,
    )
    return latest_evaluation_metadata("alerts", "usefulness", "alert-engine", fallback_note=note)


def evaluate_reactions_quality() -> dict:
    row = fetch_one(
        """
        select count(*) as sample_size,
               avg(consistency) as direction_accuracy,
               avg(abs(avg_move_pct)) as realized_move
        from event_reaction_windows
        """,
    )
    sample_size = int((row or {}).get("sample_size") or 0)
    direction_accuracy = float(row.get("direction_accuracy") or 0.0) if row else 0.0
    realized_move = float(row.get("realized_move") or 0.0) if row else 0.0
    note = "Reaction quality uses stored event-reaction windows and remains replay-only when live windows are unavailable."

    record_signal_evaluation(
        surface="reactions",
        signal_type="quality",
        signal_ref="event-reaction-windows",
        window="all",
        sample_size=sample_size,
        coverage=1.0 if sample_size else 0.0,
        direction_accuracy=direction_accuracy,
        magnitude_error=None,
        false_positive_rate=None,
        calibration=clamp01(direction_accuracy),
        ranking_usefulness=clamp01(0.5 + direction_accuracy * 0.5),
        source_quality_alignment=None,
        realized_move=realized_move,
        mode="replay",
        note=note,
    )
    return latest_evaluation_metadata("reactions", "quality", "event-reaction-windows", fallback_note=note)


def evaluate_bias_quality() -> dict:
    rows = fetch_all(
        """
        select score, confidence, change_5d
        from market_bias_snapshots
        order by created_at desc
        limit 240
        """,
    )
    sample_size = len(rows)
    if sample_size == 0:
        note = "No market bias snapshots available for evaluation."
        record_signal_evaluation(
            surface="bias",
            signal_type="quality",
            signal_ref="market-bias",
            window="all",
            sample_size=0,
            coverage=0.0,
            direction_accuracy=None,
            magnitude_error=None,
            false_positive_rate=None,
            calibration=None,
            ranking_usefulness=0.0,
            source_quality_alignment=0.0,
            mode="replay",
            note=note,
        )
        return latest_evaluation_metadata("bias", "quality", "market-bias", fallback_note=note)

    hits = 0
    magnitude_errors: list[float] = []
    calibration_terms: list[float] = []
    for row in rows:
        score = float(row.get("score") or 0.0)
        confidence = clamp01(float(row.get("confidence") or 0.0))
        realized = float(row.get("change_5d") or 0.0)
        predicted_sign = 1 if score >= 50.0 else -1
        realized_sign = 1 if realized >= 0.0 else -1
        if predicted_sign == realized_sign:
            hits += 1
        predicted_magnitude = abs(score - 50.0) / 50.0
        realized_magnitude = min(1.0, abs(realized) / 10.0)
        magnitude_errors.append(abs(predicted_magnitude - realized_magnitude))
        calibration_terms.append(1.0 - abs(confidence - realized_magnitude))

    direction_accuracy = clamp01(float(hits) / float(max(1, sample_size)))
    magnitude_error = _mean(magnitude_errors)
    calibration = clamp01(_mean(calibration_terms))
    note = "Bias quality compares directional bias scores and confidence against realized 5d moves in replay." 

    record_signal_evaluation(
        surface="bias",
        signal_type="quality",
        signal_ref="market-bias",
        window="all",
        sample_size=sample_size,
        coverage=1.0,
        direction_accuracy=direction_accuracy,
        magnitude_error=magnitude_error,
        false_positive_rate=clamp01(1.0 - direction_accuracy),
        calibration=calibration,
        ranking_usefulness=clamp01(0.5 + direction_accuracy * 0.4),
        source_quality_alignment=clamp01(calibration),
        mode="replay",
        note=note,
    )
    return latest_evaluation_metadata("bias", "quality", "market-bias", fallback_note=note)


def recompute_signal_evaluations() -> dict:
    return {
        "newsRanking": evaluate_news_ranking(),
        "geoboardRanking": evaluate_geoboard_ranking(),
        "alertUsefulness": evaluate_alert_usefulness(),
        "reactionsQuality": evaluate_reactions_quality(),
        "biasQuality": evaluate_bias_quality(),
    }
