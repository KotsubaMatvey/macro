from typing import List, Literal, Optional

from pydantic import BaseModel


class RegimeComponent(BaseModel):
    key: str
    value: float


class RegimeSnapshot(BaseModel):
    label: str
    score: float
    confidence: float
    trend: str
    interpretation: str
    components: List[RegimeComponent]


class AssetBias(BaseModel):
    asset: str
    state: str
    score: int
    dayChange: int
    weekChange: int
    confidence: float
    sources: List[str]


class EventItem(BaseModel):
    id: str
    family: str
    title: str
    country: str
    currency: str
    impact: Literal["High", "Medium", "Low"]
    category: str
    scheduledAt: str
    forecast: Optional[float] = None
    previous: Optional[float] = None
    actual: Optional[float] = None
    surprise: Optional[float] = None
    status: str
    whyItMatters: str
    assets: List[str]


class DashboardResponse(BaseModel):
    regime: RegimeSnapshot
    biases: List[AssetBias]
    events: List[EventItem]
