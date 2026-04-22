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


def _unique_refs(values: Iterable[object]) -> list[str]:
    seen: set[str] = set()
    output: list[str] = []
    for value in values:
        item = str(value or "").strip()
        if not item or item in seen:
            continue
        seen.add(item)
        output.append(item)
    return output


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
               affected_assets, event_id, event_family, region, country, cluster_id
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
            factors={"materializedFrom": "news_items"},
        )

        for symbol in _unique_refs(row.get("affected_assets") if isinstance(row.get("affected_assets"), list) else []):
            asset_entity_id = upsert_entity(
                entity_type="asset",
                ref_id=symbol.upper(),
                title=symbol.upper(),
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

        event_family = str(row.get("event_family") or "").strip()
        if event_family:
            reaction_entity_id = upsert_entity(
                entity_type="reaction_family",
                ref_id=event_family,
                title=event_family,
                source="macro-core",
                source_type="derived",
                source_tier="secondary",
                source_url=None,
                mode="derived",
                freshness="degraded",
                confidence_score=0.60,
                metadata={"surface": "reactions"},
            )
            link_entities(
                from_entity_id=news_entity_id,
                to_entity_id=reaction_entity_id,
                link_type="linked_reaction",
                confidence_score=0.64,
                rationale="Reaction family mapped from normalized news event_family.",
            )
            link_count += 1

        for region_ref in _unique_refs([row.get("region"), row.get("country")]):
            region_entity_id = upsert_entity(
                entity_type="region",
                ref_id=region_ref,
                title=region_ref,
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

        report_entity_id = upsert_entity(
            entity_type="report",
            ref_id="weekly-macro-brief",
            title="Weekly Macro Brief",
            source="macro-core",
            source_type="derived",
            source_tier="secondary",
            source_url=None,
            mode="derived",
            freshness="degraded",
            confidence_score=0.56,
            metadata={"surface": "reports"},
        )
        link_entities(
            from_entity_id=news_entity_id,
            to_entity_id=report_entity_id,
            link_type="linked_report",
            confidence_score=0.50,
            rationale="News row linked to canonical weekly report context.",
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

        created_links: set[tuple[str, str, str]] = set()

        def link_ref(entity_type: str, ref_id: str, link_type: str, confidence: float, rationale: str, *, title: str | None = None, metadata: dict | None = None) -> None:
            nonlocal link_count
            normalized_ref = str(ref_id or "").strip()
            if not normalized_ref:
                return
            dedupe_key = (entity_type, normalized_ref, link_type)
            if dedupe_key in created_links:
                return
            created_links.add(dedupe_key)
            to_entity_id = upsert_entity(
                entity_type=entity_type,
                ref_id=normalized_ref,
                title=str(title or normalized_ref),
                source="macro-core",
                source_type="derived",
                source_tier="secondary",
                source_url=None,
                mode="derived",
                freshness="degraded",
                confidence_score=confidence,
                metadata=metadata or {},
            )
            link_entities(
                from_entity_id=signal_entity_id,
                to_entity_id=to_entity_id,
                link_type=link_type,
                confidence_score=confidence,
                rationale=rationale,
            )
            link_count += 1

        for symbol in _unique_refs(list(row.get("linkedAssetSymbols") or []) + list(row.get("linkedAssets") or [])):
            link_ref(
                "asset",
                symbol.upper(),
                "linked_asset",
                0.72,
                "Asset linked from geoboard ranked signal.",
                title=symbol.upper(),
            )

        linked_event_id = str(row.get("linkedEventId") or "").strip()
        if linked_event_id:
            link_ref(
                "scheduled_event",
                linked_event_id,
                "linked_event",
                0.76,
                "Event linked from geoboard feed payload.",
            )

        for news_ref in _unique_refs(
            list(row.get("relatedNewsIds") or [])
            + list(row.get("relatedNewsClusterIds") or [])
            + list(row.get("linkedNews") or [])
        ):
            news_type = "news_cluster" if str(news_ref).startswith("cluster-") else "news_item"
            link_ref(
                news_type,
                news_ref,
                "linked_news",
                0.65,
                "News linkage from geoboard signal context.",
            )

        for region_ref in _unique_refs(list(row.get("linkedRegions") or []) + [row.get("regionGroup"), row.get("regionCode")]):
            link_ref(
                "region",
                region_ref,
                "linked_region",
                0.60,
                "Region linkage from geoboard signal metadata.",
            )

        for report_ref in _unique_refs(row.get("linkedReports") or []):
            link_ref(
                "report",
                report_ref,
                "linked_report",
                0.58,
                "Report linkage from geoboard intelligence contract.",
            )

        for reaction_ref in _unique_refs(list(row.get("linkedReactions") or []) + [row.get("feedType")]):
            link_ref(
                "reaction_family",
                reaction_ref,
                "linked_reaction",
                0.56,
                "Reaction linkage from geoboard signal family.",
            )

    return {"entities": entity_count, "links": link_count}


def materialize_operator_links(user_id: str, *, limit: int = 320) -> dict[str, int]:
    if not user_id:
        return {"entities": 0, "links": 0}
    entity_count = 0
    link_count = 0

    watchlists = fetch_all(
        """
        select id, name, description
        from watchlists
        where user_id = %s
        order by created_at desc
        limit %s
        """,
        (user_id, max(1, limit // 4)),
    )
    watchlist_items = fetch_all(
        """
        select wi.watchlist_id, wi.item_type, wi.symbol
        from watchlist_items wi
        join watchlists w on w.id = wi.watchlist_id
        where w.user_id = %s
        order by wi.watchlist_id, wi.symbol
        limit %s
        """,
        (user_id, limit),
    )
    alerts = fetch_all(
        """
        select id, name, trigger_type, target_ref, status
        from alerts
        where user_id = %s
        order by created_at desc
        limit %s
        """,
        (user_id, max(1, limit // 3)),
    )

    watchlist_entities: dict[str, str] = {}
    for row in watchlists:
        watchlist_id = str(row.get("id") or "").strip()
        if not watchlist_id:
            continue
        watch_entity_id = upsert_entity(
            entity_type="watchlist",
            ref_id=watchlist_id,
            title=str(row.get("name") or watchlist_id),
            source="operator-desk",
            source_type="derived",
            source_tier="secondary",
            source_url=None,
            mode="derived",
            freshness="degraded",
            confidence_score=0.68,
            metadata={"description": str(row.get("description") or ""), "userId": user_id},
        )
        watchlist_entities[watchlist_id] = watch_entity_id
        entity_count += 1

    for item in watchlist_items:
        watchlist_id = str(item.get("watchlist_id") or "").strip()
        source_id = watchlist_entities.get(watchlist_id)
        if not source_id:
            continue
        symbol = str(item.get("symbol") or "").strip()
        item_type = str(item.get("item_type") or "").strip().lower()
        if not symbol:
            continue
        if item_type == "asset":
            target_entity = upsert_entity(
                entity_type="asset",
                ref_id=symbol.upper(),
                title=symbol.upper(),
                source="operator-desk",
                source_type="derived",
                source_tier="secondary",
                source_url=None,
                mode="derived",
                freshness="degraded",
                confidence_score=0.62,
                metadata={"watchlistId": watchlist_id},
            )
            link_entities(
                from_entity_id=source_id,
                to_entity_id=target_entity,
                link_type="linked_asset",
                confidence_score=0.72,
                rationale="Asset tracked inside user watchlist.",
            )
            link_count += 1
            continue
        target_entity = upsert_entity(
            entity_type="reaction_family",
            ref_id=symbol,
            title=symbol,
            source="operator-desk",
            source_type="derived",
            source_tier="secondary",
            source_url=None,
            mode="derived",
            freshness="degraded",
            confidence_score=0.58,
            metadata={"watchlistId": watchlist_id},
        )
        link_entities(
            from_entity_id=source_id,
            to_entity_id=target_entity,
            link_type="linked_reaction",
            confidence_score=0.60,
            rationale="Event family tracked inside user watchlist.",
        )
        link_count += 1

    for row in alerts:
        alert_id = str(row.get("id") or "").strip()
        if not alert_id:
            continue
        alert_entity_id = upsert_entity(
            entity_type="alert_rule",
            ref_id=alert_id,
            title=str(row.get("name") or alert_id),
            source="operator-desk",
            source_type="derived",
            source_tier="secondary",
            source_url=None,
            mode="derived",
            freshness="degraded",
            confidence_score=0.64,
            metadata={
                "triggerType": str(row.get("trigger_type") or ""),
                "status": str(row.get("status") or ""),
                "targetRef": str(row.get("target_ref") or ""),
            },
        )
        entity_count += 1
        target_ref = str(row.get("target_ref") or "").strip()
        if not target_ref:
            continue
        trigger_type = str(row.get("trigger_type") or "").strip().lower()
        if trigger_type == "event_reminder" or target_ref.startswith("event-"):
            target_entity = upsert_entity(
                entity_type="scheduled_event",
                ref_id=target_ref,
                title=target_ref,
                source="operator-desk",
                source_type="derived",
                source_tier="secondary",
                source_url=None,
                mode="derived",
                freshness="degraded",
                confidence_score=0.66,
                metadata={},
            )
            link_entities(
                from_entity_id=alert_entity_id,
                to_entity_id=target_entity,
                link_type="linked_event",
                confidence_score=0.74,
                rationale="Alert target references a scheduled event.",
            )
            link_count += 1
            continue
        target_entity = upsert_entity(
            entity_type="asset",
            ref_id=target_ref.upper(),
            title=target_ref.upper(),
            source="operator-desk",
            source_type="derived",
            source_tier="secondary",
            source_url=None,
            mode="derived",
            freshness="degraded",
            confidence_score=0.58,
            metadata={},
        )
        link_entities(
            from_entity_id=alert_entity_id,
            to_entity_id=target_entity,
            link_type="linked_asset",
            confidence_score=0.66,
            rationale="Alert target references an asset or symbol.",
        )
        link_count += 1

    return {"entities": entity_count, "links": link_count}
