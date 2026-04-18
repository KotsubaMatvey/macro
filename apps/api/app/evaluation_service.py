from __future__ import annotations

import json
import uuid
from typing import Any

from .db import fetch_all, fetch_one, get_connection
from .evaluation_metrics import calibration_quality, lift_score, mean, normalized_outcome_magnitude, top_slice
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
                    json.dumps(payload or {}),
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
    outcome_coverage: float | None = None,
    outcome_sample_size: int | None = None,
    realization_horizon: str | None = None,
    outcome_grounded: bool | None = None,
    snapshot_ref: str | None = None,
) -> str:
    evaluation_id = _id("seval")
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                insert into signal_evaluations
                (
                    id, surface, signal_type, signal_ref, evaluation_window,
                    sample_size, coverage, direction_accuracy, magnitude_error,
                    false_positive_rate, calibration, ranking_usefulness,
                    source_quality_alignment, realized_move, mode, note,
                    outcome_coverage, outcome_sample_size, realization_horizon,
                    outcome_grounded, snapshot_ref, created_at
                )
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now())
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
                    float(outcome_coverage) if outcome_coverage is not None else None,
                    int(outcome_sample_size) if outcome_sample_size is not None else None,
                    str(realization_horizon or ""),
                    bool(outcome_grounded) if outcome_grounded is not None else None,
                    str(snapshot_ref or ""),
                ),
            )
    return evaluation_id


def latest_evaluation(surface: str, signal_type: str, signal_ref: str) -> dict[str, Any] | None:
    return fetch_one(
        """
        select surface, signal_type, signal_ref, sample_size, coverage, direction_accuracy,
               magnitude_error, false_positive_rate, calibration, ranking_usefulness,
               source_quality_alignment, mode, note,
               outcome_coverage, outcome_sample_size, realization_horizon,
               outcome_grounded, snapshot_ref
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
        outcome_coverage=float(row.get("outcome_coverage")) if row.get("outcome_coverage") is not None else None,
        outcome_sample_size=int(row.get("outcome_sample_size")) if row.get("outcome_sample_size") is not None else None,
        realization_horizon=str(row.get("realization_horizon") or ""),
        outcome_grounded=row.get("outcome_grounded"),
        snapshot_ref=str(row.get("snapshot_ref") or ""),
    )


def _latest_snapshot_ref(surface: str, signal_type: str, signal_ref: str) -> str:
    row = fetch_one(
        """
        select id
        from signal_snapshots
        where surface = %s and signal_type = %s and signal_ref = %s
        order by created_at desc
        limit 1
        """,
        (surface, signal_type, signal_ref),
    )
    return str((row or {}).get("id") or "")


def _outcome_strength(value: float | None) -> float | None:
    return normalized_outcome_magnitude(value, scale=2.5)


def evaluate_news_ranking(*, lookback_hours: int = 168) -> dict:
    rows = fetch_all(
        """
        select n.rank_score, n.importance_score, n.urgency_score, n.confidence_score, n.source_type,
               outcome.avg_move_pct as realized_move_pct,
               outcome.consistency as realized_consistency
        from news_items n
        left join lateral (
            select avg(erw.avg_move_pct) as avg_move_pct,
                   avg(erw.consistency) as consistency
            from event_reaction_windows erw
            where erw.event_id = n.event_id
              and erw.reaction_window in ('1d', '5d')
        ) outcome on true
        where n.canonical = true
          and n.published_at >= now() - make_interval(hours => %s)
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
            outcome_coverage=0.0,
            outcome_sample_size=0,
            realization_horizon="",
            outcome_grounded=False,
            snapshot_ref="",
        )
        return meta

    ordered = sorted(rows, key=lambda row: float(row.get("rank_score") or 0.0), reverse=True)
    top_rows = top_slice(ordered, fraction=0.25, key="rank_score")

    all_signal = mean([
        (float(row.get("importance_score") or 0.0) + float(row.get("urgency_score") or 0.0) + float(row.get("confidence_score") or 0.0)) / 3.0
        for row in ordered
    ])
    top_signal = mean([
        (float(row.get("importance_score") or 0.0) + float(row.get("urgency_score") or 0.0) + float(row.get("confidence_score") or 0.0)) / 3.0
        for row in top_rows
    ])
    proxy_usefulness = lift_score(top_signal, all_signal)

    outcome_rows = [row for row in ordered if row.get("realized_move_pct") is not None]
    outcome_sample_size = len(outcome_rows)
    outcome_coverage = clamp01(float(outcome_sample_size) / float(max(1, sample_size)))
    all_outcome_strength = [
        value
        for value in [_outcome_strength(float(row.get("realized_move_pct"))) for row in outcome_rows]
        if value is not None
    ]
    top_outcome_rows = [row for row in top_rows if row.get("realized_move_pct") is not None]
    top_outcome_strength = [
        value
        for value in [_outcome_strength(float(row.get("realized_move_pct"))) for row in top_outcome_rows]
        if value is not None
    ]

    baseline_outcome = mean(all_outcome_strength)
    top_outcome = mean(top_outcome_strength)
    outcome_usefulness = lift_score(top_outcome, baseline_outcome) if outcome_sample_size else 0.5
    ranking_usefulness = clamp01((0.6 * proxy_usefulness) + (0.4 * outcome_usefulness))

    top_official_share = mean([1.0 if str(row.get("source_type") or "") == "official" else 0.0 for row in top_rows])
    all_official_share = mean([1.0 if str(row.get("source_type") or "") == "official" else 0.0 for row in ordered])
    source_alignment = clamp01(0.5 + (top_official_share - all_official_share))

    if top_outcome_strength:
        false_positive_rate = clamp01(len([value for value in top_outcome_strength if value < 0.15]) / float(max(1, len(top_outcome_strength))))
    else:
        false_positive_rate = clamp01(
            len([row for row in top_rows if float(row.get("urgency_score") or 0.0) < 0.35]) / float(max(1, len(top_rows))),
        )

    direction_values = [float(row.get("realized_consistency")) for row in top_outcome_rows if row.get("realized_consistency") is not None]
    direction_accuracy = mean(direction_values) if direction_values else None

    magnitude_error = None
    calibration = None
    if outcome_rows and all_outcome_strength:
        predicted_rank = [float(row.get("rank_score") or 0.0) for row in outcome_rows][: len(all_outcome_strength)]
        magnitude_error = mean([abs(pred - realized) for pred, realized in zip(predicted_rank, all_outcome_strength)])
        calibration = calibration_quality(
            [float(row.get("confidence_score") or 0.0) for row in outcome_rows][: len(all_outcome_strength)],
            all_outcome_strength,
        )
    else:
        calibration = clamp01(1.0 - abs(top_signal - all_signal))

    snapshot_row = fetch_one(
        """
        select id
        from signal_snapshots
        where surface = 'news' and signal_type = 'feed'
        order by created_at desc
        limit 1
        """
    )
    snapshot_ref = str((snapshot_row or {}).get("id") or "")

    note = (
        "News ranking evaluation combines proxy factor concentration with realized event-window outcomes when linked windows exist. "
        + f"Outcome coverage: {round(outcome_coverage * 100, 1)}% ({outcome_sample_size}/{sample_size})."
    )
    record_signal_evaluation(
        surface="news",
        signal_type="ranking",
        signal_ref="news-feed",
        window=f"{lookback_hours}h",
        sample_size=sample_size,
        coverage=outcome_coverage if outcome_sample_size else 1.0,
        direction_accuracy=direction_accuracy,
        magnitude_error=magnitude_error,
        false_positive_rate=false_positive_rate,
        calibration=calibration,
        ranking_usefulness=ranking_usefulness,
        source_quality_alignment=source_alignment,
        realized_move=mean([abs(float(row.get("realized_move_pct") or 0.0)) for row in outcome_rows]) if outcome_rows else None,
        mode="replay",
        note=note,
        outcome_coverage=outcome_coverage,
        outcome_sample_size=outcome_sample_size,
        realization_horizon="1d/5d event reaction windows" if outcome_sample_size else "",
        outcome_grounded=outcome_sample_size > 0,
        snapshot_ref=snapshot_ref,
    )
    return latest_evaluation_metadata("news", "ranking", "news-feed", fallback_note=note)


def evaluate_geoboard_ranking(*, lookback_hours: int = 168) -> dict:
    rows = fetch_all(
        """
        select s.rank_score, s.importance_score, s.urgency_score, s.confidence_score,
               s.market_relevance_score, s.desk_relevance_score,
               outcome.avg_move_pct as realized_move_pct,
               outcome.consistency as realized_consistency
        from intelligence_entities e
        join intelligence_scores s on s.entity_id = e.id
        left join lateral (
            select avg(erw.avg_move_pct) as avg_move_pct,
                   avg(erw.consistency) as consistency
            from intelligence_links l
            join intelligence_entities ev on ev.id = l.to_entity_id
            join event_reaction_windows erw on erw.event_id = ev.ref_id
            where l.from_entity_id = e.id
              and l.link_type = 'linked_event'
              and ev.entity_type = 'scheduled_event'
              and erw.reaction_window in ('1d', '5d')
        ) outcome on true
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
            outcome_coverage=0.0,
            outcome_sample_size=0,
            realization_horizon="",
            outcome_grounded=False,
            snapshot_ref="",
        )
        return latest_evaluation_metadata("geoboard", "ranking", "feed", fallback_note=note)

    ordered = sorted(rows, key=lambda row: float(row.get("rank_score") or 0.0), reverse=True)
    top_rows = top_slice(ordered, fraction=0.30, key="rank_score")

    top_context = mean([
        (float(row.get("market_relevance_score") or 0.0) + float(row.get("desk_relevance_score") or 0.0)) / 2.0
        for row in top_rows
    ])
    all_context = mean([
        (float(row.get("market_relevance_score") or 0.0) + float(row.get("desk_relevance_score") or 0.0)) / 2.0
        for row in ordered
    ])
    context_usefulness = lift_score(top_context, all_context)

    outcome_rows = [row for row in ordered if row.get("realized_move_pct") is not None]
    outcome_sample_size = len(outcome_rows)
    outcome_coverage = clamp01(float(outcome_sample_size) / float(max(1, sample_size)))

    all_outcome_strength = [
        value
        for value in [_outcome_strength(float(row.get("realized_move_pct"))) for row in outcome_rows]
        if value is not None
    ]
    top_outcome_rows = [row for row in top_rows if row.get("realized_move_pct") is not None]
    top_outcome_strength = [
        value
        for value in [_outcome_strength(float(row.get("realized_move_pct"))) for row in top_outcome_rows]
        if value is not None
    ]

    baseline_outcome = mean(all_outcome_strength)
    top_outcome = mean(top_outcome_strength)
    outcome_usefulness = lift_score(top_outcome, baseline_outcome) if outcome_sample_size else 0.5
    ranking_usefulness = clamp01((0.65 * context_usefulness) + (0.35 * outcome_usefulness))

    direction_values = [float(row.get("realized_consistency")) for row in top_outcome_rows if row.get("realized_consistency") is not None]
    direction_accuracy = mean(direction_values) if direction_values else None

    if top_outcome_strength:
        false_positive_rate = clamp01(len([value for value in top_outcome_strength if value < 0.15]) / float(max(1, len(top_outcome_strength))))
    else:
        false_positive_rate = clamp01(
            len([row for row in top_rows if float(row.get("urgency_score") or 0.0) < 0.30]) / float(max(1, len(top_rows))),
        )

    calibration = None
    magnitude_error = None
    if outcome_rows and all_outcome_strength:
        calibration = calibration_quality(
            [float(row.get("confidence_score") or 0.0) for row in outcome_rows][: len(all_outcome_strength)],
            all_outcome_strength,
        )
        magnitude_error = mean(
            [
                abs(float(row.get("rank_score") or 0.0) - realized)
                for row, realized in zip(outcome_rows, all_outcome_strength)
            ],
        )
    else:
        calibration = clamp01(1.0 - abs(top_context - all_context))

    snapshot_row = fetch_one(
        """
        select id
        from signal_snapshots
        where surface = 'geoboard' and signal_type = 'feed'
        order by created_at desc
        limit 1
        """
    )
    snapshot_ref = str((snapshot_row or {}).get("id") or "")

    note = (
        "Geoboard ranking evaluation measures context concentration and event-linked realized outcomes where link coverage exists. "
        + f"Outcome coverage: {round(outcome_coverage * 100, 1)}% ({outcome_sample_size}/{sample_size})."
    )

    record_signal_evaluation(
        surface="geoboard",
        signal_type="ranking",
        signal_ref="feed",
        window=f"{lookback_hours}h",
        sample_size=sample_size,
        coverage=outcome_coverage if outcome_sample_size else 1.0,
        direction_accuracy=direction_accuracy,
        magnitude_error=magnitude_error,
        false_positive_rate=false_positive_rate,
        calibration=calibration,
        ranking_usefulness=ranking_usefulness,
        source_quality_alignment=clamp01(mean([float(row.get("confidence_score") or 0.0) for row in top_rows])),
        realized_move=mean([abs(float(row.get("realized_move_pct") or 0.0)) for row in outcome_rows]) if outcome_rows else None,
        mode="replay",
        note=note,
        outcome_coverage=outcome_coverage,
        outcome_sample_size=outcome_sample_size,
        realization_horizon="1d/5d event reaction windows" if outcome_sample_size else "",
        outcome_grounded=outcome_sample_size > 0,
        snapshot_ref=snapshot_ref,
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
    magnitude_error = mean(magnitude_errors)
    calibration = clamp01(mean(calibration_terms))
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
