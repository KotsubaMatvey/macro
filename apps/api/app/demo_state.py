import json
from pathlib import Path


DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "demo_state.json"


def seed_state():
    return {
        "regime": {
            "label": "Expansionary",
            "score": 0.42,
            "confidence": 0.74,
            "trend": "Improving",
            "interpretation": "Growth is resilient, disinflation is uneven, and liquidity is modestly supportive.",
            "components": [
                {"key": "growth", "value": 0.60},
                {"key": "inflation", "value": -0.10},
                {"key": "liquidity", "value": 0.30},
                {"key": "rates", "value": -0.20},
                {"key": "volatility", "value": 0.10},
                {"key": "usd", "value": -0.05},
            ],
        },
        "biases": [
            {"asset": "SPX", "state": "Bullish", "score": 68, "dayChange": 4, "weekChange": 9, "confidence": 0.70, "sources": ["soft landing", "liquidity", "breadth"]},
            {"asset": "BTC", "state": "Bullish", "score": 63, "dayChange": 5, "weekChange": 12, "confidence": 0.65, "sources": ["liquidity beta", "ETF flows"]},
        ],
        "events": [
            {"id": "us-cpi-mar", "family": "CPI", "title": "US CPI YoY", "country": "United States", "currency": "USD", "impact": "High", "category": "Inflation", "scheduledAt": "2026-04-10T12:30:00Z", "forecast": 2.9, "previous": 3.1, "actual": 2.8, "surprise": -3.4, "status": "Released", "whyItMatters": "Inflation surprise reprices the front end, the USD, and duration-sensitive risk.", "assets": ["SPX", "DXY", "XAU", "BTC"]},
            {"id": "ecb-rate-apr", "family": "Rate Decision", "title": "ECB Main Refinancing Rate", "country": "Euro Area", "currency": "EUR", "impact": "High", "category": "Rates", "scheduledAt": "2026-04-11T11:15:00Z", "forecast": 3.5, "previous": 3.5, "actual": None, "surprise": None, "status": "Upcoming", "whyItMatters": "Rates guidance reprices EUR crosses and regional equities.", "assets": ["EURUSD", "DAX", "BTP"]},
        ],
    }


def save_state(state):
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    DATA_PATH.write_text(json.dumps(state, indent=2), encoding="utf-8")


def load_state():
    if not DATA_PATH.exists():
        save_state(seed_state())
    return json.loads(DATA_PATH.read_text(encoding="utf-8"))
