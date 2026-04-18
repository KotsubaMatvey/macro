from __future__ import annotations

import math

from typing import Iterable

VALID_SOURCE_TYPES = {"official", "discovery", "derived", "static", "fallback", "seeded"}
VALID_SOURCE_TIERS = {"primary", "secondary"}
VALID_MODES = {"live", "demo", "fallback", "static", "derived", "mixed", "replay"}
VALID_FRESHNESS = {"fresh", "aging", "stale", "degraded"}


def normalize_text(value: object) -> str:
    return str(value or "").strip()


def normalize_source_type(value: object) -> str:
    normalized = normalize_text(value).lower()
    if normalized in VALID_SOURCE_TYPES:
        return normalized
    return "discovery"


def normalize_source_tier(value: object) -> str:
    normalized = normalize_text(value).lower()
    if normalized in VALID_SOURCE_TIERS:
        return normalized
    return "secondary"


def normalize_mode(value: object) -> str:
    normalized = normalize_text(value).lower()
    if normalized in VALID_MODES:
        return normalized
    return "fallback"


def normalize_freshness(value: object, *, mode: str = "fallback") -> str:
    raw = normalize_text(value)
    normalized = raw.lower()
    if normalized in VALID_FRESHNESS:
        return normalized
    if raw:
        # Invalid explicit freshness must not silently promote to fresh.
        return "degraded"
    normalized_mode = normalize_mode(mode)
    if normalized_mode in {"demo", "fallback", "derived", "static", "replay"}:
        return "degraded"
    return "fresh"


def _clamp01(value: float) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return 0.0
    if not math.isfinite(parsed):
        if parsed == float("inf"):
            return 1.0
        return 0.0
    if parsed < 0.0:
        return 0.0
    if parsed > 1.0:
        return 1.0
    return parsed


def normalize_score(value: object, *, default: float = 0.0) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        parsed = float(default)
    return round(_clamp01(parsed), 4)


def uniq(values: Iterable[object]) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for value in values:
        item = normalize_text(value)
        if not item or item in seen:
            continue
        seen.add(item)
        out.append(item)
    return out
