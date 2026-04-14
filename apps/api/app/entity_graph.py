from __future__ import annotations

import hashlib
import json
from typing import Any, Iterable

from .db import fetch_all, fetch_one, get_connection
from .intelligence_contracts import normalize_freshness, normalize_mode, normalize_source_tier, normalize_source_type


def _hash(*parts: str, length: int = 20) -> str:
    digest = hashlib.sha1("|".join(parts).encode("utf-8")).hexdigest()
    return digest[:length]


def _entity_id(entity_type: str, ref_id: str) -> str:
    return "ient-" + _hash(entity_type, ref_id)


def upsert_entity(
    *,
    entity_type: str,
    ref_id: str,
    title: str,
    source: str,
    source_type: str,
    source_tier: str,
    source_url: str | None,
    mode: str,
    freshness: str,
    confidence_score: float = 0.0,
    metadata: dict | None = None,
) -> str:
    entity_id = _entity_id(str(entity_type), str(ref_id))
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                insert into intelligence_entities
                (id, entity_type, ref_id, title, source, source_type, source_tier, source_url, mode, freshness, confidence_score, metadata, updated_at)
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, now())
                on conflict (entity_type, ref_id) do update set
                    title = excluded.title,
                    source = excluded.source,
                    source_type = excluded.source_type,
                    source_tier = excluded.source_tier,
                    source_url = excluded.source_url,
                    mode = excluded.mode,
                    freshness = excluded.freshness,
                    confidence_score = excluded.confidence_score,
                    metadata = excluded.metadata,
                    updated_at = now()
                """,
                (
                    entity_id,
                    str(entity_type),
                    str(ref_id),
                    str(title or ""),
                    str(source or ""),
                    normalize_source_type(source_type),
                    normalize_source_tier(source_tier),
                    str(source_url or "") or None,
                    normalize_mode(mode),
                    normalize_freshness(freshness, mode=normalize_mode(mode)),
                    float(confidence_score or 0.0),
                    json.dumps(metadata or {}),
                ),
            )
    return entity_id


def upsert_score(
    *,
    entity_id: str,
    importance_score: float,
    urgency_score: float,
    confidence_score: float,
    market_relevance_score: float,
    desk_relevance_score: float,
    rank_score: float,
    rationale: Iterable[str] = (),
    factors: dict | None = None,
) -> str:
    score_id = "iscore-" + _hash(entity_id, str(rank_score), length=18)
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                insert into intelligence_scores
                (id, entity_id, importance_score, urgency_score, confidence_score, market_relevance_score, desk_relevance_score, rank_score, rationale, factors, computed_at)
                values (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, now())
                on conflict (id) do update set
                    importance_score = excluded.importance_score,
                    urgency_score = excluded.urgency_score,
                    confidence_score = excluded.confidence_score,
                    market_relevance_score = excluded.market_relevance_score,
                    desk_relevance_score = excluded.desk_relevance_score,
                    rank_score = excluded.rank_score,
                    rationale = excluded.rationale,
                    factors = excluded.factors,
                    computed_at = now()
                """,
                (
                    score_id,
                    entity_id,
                    float(importance_score or 0.0),
                    float(urgency_score or 0.0),
                    float(confidence_score or 0.0),
                    float(market_relevance_score or 0.0),
                    float(desk_relevance_score or 0.0),
                    float(rank_score or 0.0),
                    json.dumps(list(rationale or [])),
                    json.dumps(factors or {}),
                ),
            )
    return score_id


def link_entities(
    *,
    from_entity_id: str,
    to_entity_id: str,
    link_type: str,
    confidence_score: float = 0.6,
    rationale: str = "",
    metadata: dict | None = None,
) -> str:
    link_id = "ilink-" + _hash(from_entity_id, to_entity_id, link_type, length=18)
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                insert into intelligence_links
                (id, from_entity_id, to_entity_id, link_type, confidence_score, rationale, metadata, created_at)
                values (%s, %s, %s, %s, %s, %s, %s::jsonb, now())
                on conflict (from_entity_id, to_entity_id, link_type) do update set
                    confidence_score = excluded.confidence_score,
                    rationale = excluded.rationale,
                    metadata = excluded.metadata
                """,
                (
                    link_id,
                    from_entity_id,
                    to_entity_id,
                    str(link_type),
                    float(confidence_score or 0.0),
                    str(rationale or ""),
                    json.dumps(metadata or {}),
                ),
            )
    return link_id


def link_entities_by_ref(
    *,
    from_entity_type: str,
    from_ref_id: str,
    to_entity_type: str,
    to_ref_id: str,
    link_type: str,
    confidence_score: float = 0.6,
    rationale: str = "",
) -> str:
    from_id = upsert_entity(
        entity_type=from_entity_type,
        ref_id=from_ref_id,
        title=from_ref_id,
        source="macro-core",
        source_type="derived",
        source_tier="secondary",
        source_url=None,
        mode="derived",
        freshness="degraded",
        confidence_score=confidence_score,
        metadata={"seeded": False},
    )
    to_id = upsert_entity(
        entity_type=to_entity_type,
        ref_id=to_ref_id,
        title=to_ref_id,
        source="macro-core",
        source_type="derived",
        source_tier="secondary",
        source_url=None,
        mode="derived",
        freshness="degraded",
        confidence_score=confidence_score,
        metadata={"seeded": False},
    )
    return link_entities(
        from_entity_id=from_id,
        to_entity_id=to_id,
        link_type=link_type,
        confidence_score=confidence_score,
        rationale=rationale,
    )


def linked_entities(entity_type: str, ref_id: str, *, limit: int = 64) -> list[dict[str, Any]]:
    return fetch_all(
        """
        select t.entity_type, t.ref_id, t.title, l.link_type, l.confidence_score
        from intelligence_entities f
        join intelligence_links l on l.from_entity_id = f.id
        join intelligence_entities t on t.id = l.to_entity_id
        where f.entity_type = %s and f.ref_id = %s
        order by l.confidence_score desc, t.entity_type asc
        limit %s
        """,
        (entity_type, ref_id, limit),
    )


def latest_scores(entity_type: str, ref_id: str) -> dict[str, Any] | None:
    return fetch_one(
        """
        select s.importance_score, s.urgency_score, s.confidence_score, s.market_relevance_score,
               s.desk_relevance_score, s.rank_score, s.rationale, s.factors, s.computed_at
        from intelligence_entities e
        join intelligence_scores s on s.entity_id = e.id
        where e.entity_type = %s and e.ref_id = %s
        order by s.computed_at desc
        limit 1
        """,
        (entity_type, ref_id),
    )


def materialize_news_links(*, limit: int = 240) -> dict[str, int]:
    rows = fetch_all(
        """
        select id, title, source, source_type, source_tier, source_url, mode, freshness,
               confidence_score, importance_score, urgency_score,
               coalesce(market_relevance_score, 0) as market_relevance_score,
               coalesce(desk_relevance_score, 0) as desk_relevance_score,
               coalesce(rank_score, 0) as rank_score,
               affected_assets, event_id, region, cluster_id
        from news_items
        where canonical = true
        order by published_at desc
        limit %s
        """,
        (limit,),
    )
    entity_count = 0
    link_count = 0
    for row in rows:
        news_entity_id = upsert_entity(
            entity_type="news_item",
            ref_id=str(row.get("id")),
            title=str(row.get("title") or ""),
            source=str(row.get("source") or ""),
            source_type=str(row.get("source_type") or "discovery"),
            source_tier=str(row.get("source_tier") or "secondary"),
            source_url=str(row.get("source_url") or "") or None,
            mode=str(row.get("mode") or "fallback"),
            freshness=str(row.get("freshness") or "degraded"),
            confidence_score=float(row.get("confidence_score") or 0.0),
            metadata={"surface": "news"},
        )
        entity_count += 1
        upsert_score(
            entity_id=news_entity_id,
            importance_score=float(row.get("importance_score") or 0.0),
            urgency_score=float(row.get("urgency_score") or 0.0),
            confidence_score=float(row.get("confidence_score") or 0.0),
            market_relevance_score=float(row.get("market_relevance_score") or 0.0),
            desk_relevance_score=float(row.get("desk_relevance_score") or 0.0),
            rank_score=float(row.get("rank_score") or 0.0),
            rationale=["Materialized from canonical news row."],
            factors={},
        )

        assets = row.get("affected_assets") if isinstance(row.get("affected_assets"), list) else []
        for symbol in assets:
            asset_entity_id = upsert_entity(
                entity_type="asset",
                ref_id=str(symbol).upper(),
                title=str(symbol).upper(),
                source="macro-core",
                source_type="derived",
                source_tier="secondary",
                source_url=None,
                mode="derived",
                freshness="degraded",
                confidence_score=0.65,
                metadata={"surface": "news"},
            )
            link_entities(
                from_entity_id=news_entity_id,
                to_entity_id=asset_entity_id,
                link_type="linked_asset",
                confidence_score=0.70,
                rationale="Asset extracted from normalized news item.",
            )
            link_count += 1

        event_id = row.get("event_id")
        if event_id:
            event_entity_id = upsert_entity(
                entity_type="scheduled_event",
                ref_id=str(event_id),
                title=str(event_id),
                source="macro-core",
                source_type="derived",
                source_tier="secondary",
                source_url=None,
                mode="derived",
                freshness="degraded",
                confidence_score=0.70,
                metadata={"surface": "calendar"},
            )
            link_entities(
                from_entity_id=news_entity_id,
                to_entity_id=event_entity_id,
                link_type="linked_event",
                confidence_score=0.78,
                rationale="Event link materialized from news_items.event_id.",
            )
            link_count += 1

        region = str(row.get("region") or "").strip()
        if region:
            region_entity_id = upsert_entity(
                entity_type="region",
                ref_id=region,
                title=region,
                source="macro-core",
                source_type="derived",
                source_tier="secondary",
                source_url=None,
                mode="derived",
                freshness="degraded",
                confidence_score=0.60,
                metadata={},
            )
            link_entities(
                from_entity_id=news_entity_id,
                to_entity_id=region_entity_id,
                link_type="linked_region",
                confidence_score=0.66,
                rationale="Region mapped from normalized news item.",
            )
            link_count += 1

        cluster_id = str(row.get("cluster_id") or "").strip()
        if cluster_id:
            cluster_entity_id = upsert_entity(
                entity_type="news_cluster",
                ref_id=cluster_id,
                title=cluster_id,
                source="macro-core",
                source_type="derived",
                source_tier="secondary",
                source_url=None,
                mode="derived",
                freshness="degraded",
                confidence_score=0.58,
                metadata={},
            )
            link_entities(
                from_entity_id=news_entity_id,
                to_entity_id=cluster_entity_id,
                link_type="linked_news_cluster",
                confidence_score=0.62,
                rationale="Cluster mapped from canonical cluster_id.",
            )
            link_count += 1

    return {"entities": entity_count, "links": link_count}


def materialize_event_links(*, limit: int = 240) -> dict[str, int]:
    rows = fetch_all(
        """
        select e.id, e.title, e.status, e.scheduled_at,
               ef.name as family,
               ef.country,
               ef.currency,
               coalesce(array_agg(a.symbol) filter (where a.symbol is not null), '{}') as assets
        from events e
        join event_families ef on ef.id = e.family_id
        left join event_release_assets era on era.event_id = e.id
        left join assets a on a.id = era.asset_id
        group by e.id, e.title, e.status, e.scheduled_at, ef.name, ef.country, ef.currency
        order by e.scheduled_at desc
        limit %s
        """,
        (limit,),
    )
    entity_count = 0
    link_count = 0
    for row in rows:
        event_entity_id = upsert_entity(
            entity_type="scheduled_event",
            ref_id=str(row.get("id")),
            title=str(row.get("title") or ""),
            source="calendar",
            source_type="official",
            source_tier="primary",
            source_url=None,
            mode="live",
            freshness="fresh",
            confidence_score=0.72,
            metadata={
                "status": row.get("status"),
                "family": row.get("family"),
                "country": row.get("country"),
                "currency": row.get("currency"),
            },
        )
        entity_count += 1

        assets = row.get("assets") if isinstance(row.get("assets"), list) else []
        for symbol in assets:
            if not symbol:
                continue
            asset_entity_id = upsert_entity(
                entity_type="asset",
                ref_id=str(symbol).upper(),
                title=str(symbol).upper(),
                source="macro-core",
                source_type="derived",
                source_tier="secondary",
                source_url=None,
                mode="derived",
                freshness="degraded",
                confidence_score=0.66,
                metadata={},
            )
            link_entities(
                from_entity_id=event_entity_id,
                to_entity_id=asset_entity_id,
                link_type="linked_asset",
                confidence_score=0.80,
                rationale="Asset linked from event_release_assets mapping.",
            )
            link_count += 1

    return {"entities": entity_count, "links": link_count}


def materialize_geoboard_links(feed: list[dict[str, Any]]) -> dict[str, int]:
    entity_count = 0
    link_count = 0
    for row in feed:
        source_id = str(row.get("sourceId") or row.get("id") or "")
        if not source_id:
            continue
        source_meta = row.get("sourceMeta") if isinstance(row.get("sourceMeta"), dict) else {}
        ranking = row.get("ranking") if isinstance(row.get("ranking"), dict) else {}
        signal_entity_id = upsert_entity(
            entity_type="geoboard_signal",
            ref_id=source_id,
            title=str(row.get("title") or source_id),
            source=str(source_meta.get("label") or source_meta.get("providerKey") or "geoboard"),
            source_type=str(source_meta.get("sourceType") or "derived"),
            source_tier=str(source_meta.get("sourceTier") or "secondary"),
            source_url=str(source_meta.get("sourceUrl") or "") or None,
            mode=str(source_meta.get("mode") or "derived"),
            freshness=str(source_meta.get("freshness") or "degraded"),
            confidence_score=float(ranking.get("confidenceScore") or 0.0),
            metadata={"feedType": row.get("feedType"), "sourceLayer": row.get("sourceLayer")},
        )
        upsert_score(
            entity_id=signal_entity_id,
            importance_score=float(ranking.get("importanceScore") or 0.0),
            urgency_score=float(ranking.get("urgencyScore") or 0.0),
            confidence_score=float(ranking.get("confidenceScore") or 0.0),
            market_relevance_score=float(ranking.get("marketRelevanceScore") or ranking.get("regimeRelevanceScore") or 0.0),
            desk_relevance_score=float(ranking.get("deskRelevanceScore") or ranking.get("watchlistOverlapScore") or 0.0),
            rank_score=float(ranking.get("rankScore") or 0.0),
            rationale=list(ranking.get("rationale") or []),
            factors=ranking,
        )
        entity_count += 1

        for symbol in list(row.get("linkedAssetSymbols") or []):
            asset_entity_id = upsert_entity(
                entity_type="asset",
                ref_id=str(symbol).upper(),
                title=str(symbol).upper(),
                source="macro-core",
                source_type="derived",
                source_tier="secondary",
                source_url=None,
                mode="derived",
                freshness="degraded",
                confidence_score=0.62,
                metadata={},
            )
            link_entities(
                from_entity_id=signal_entity_id,
                to_entity_id=asset_entity_id,
                link_type="linked_asset",
                confidence_score=0.72,
                rationale="Asset linked from geoboard ranked signal.",
            )
            link_count += 1

        linked_event_id = str(row.get("linkedEventId") or "").strip()
        if linked_event_id:
            event_entity_id = upsert_entity(
                entity_type="scheduled_event",
                ref_id=linked_event_id,
                title=linked_event_id,
                source="macro-core",
                source_type="derived",
                source_tier="secondary",
                source_url=None,
                mode="derived",
                freshness="degraded",
                confidence_score=0.70,
                metadata={},
            )
            link_entities(
                from_entity_id=signal_entity_id,
                to_entity_id=event_entity_id,
                link_type="linked_event",
                confidence_score=0.76,
                rationale="Event linked from geoboard feed payload.",
            )
            link_count += 1

        for news_id in list(row.get("relatedNewsIds") or []):
            news_entity_id = upsert_entity(
                entity_type="news_item",
                ref_id=str(news_id),
                title=str(news_id),
                source="macro-core",
                source_type="derived",
                source_tier="secondary",
                source_url=None,
                mode="derived",
                freshness="degraded",
                confidence_score=0.60,
                metadata={},
            )
            link_entities(
                from_entity_id=signal_entity_id,
                to_entity_id=news_entity_id,
                link_type="linked_news",
                confidence_score=0.65,
                rationale="News linkage from geoboard signal context.",
            )
            link_count += 1

    return {"entities": entity_count, "links": link_count}
