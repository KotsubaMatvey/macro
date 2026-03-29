import time
import uuid

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from .demo_state import load_state, save_state, seed_state
from .models import DashboardResponse, EventItem, RegimeSnapshot, AssetBias

app = FastAPI(title="Northstar Macro API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_request_context(request: Request, call_next):
    request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
    started = time.perf_counter()
    response = await call_next(request)
    response.headers["x-request-id"] = request_id
    response.headers["x-response-time-ms"] = str(round((time.perf_counter() - started) * 1000, 2))
    return response


@app.get("/health")
def health():
    return {"status": "ok", "mode": "demo"}


@app.get("/api/v1/dashboard", response_model=DashboardResponse)
def dashboard():
    state = load_state()
    return {
        "regime": state["regime"],
        "biases": state["biases"],
        "events": state["events"],
    }


@app.get("/api/v1/regime", response_model=RegimeSnapshot)
def regime():
    return load_state()["regime"]


@app.get("/api/v1/market-bias", response_model=list[AssetBias])
def market_bias():
    return load_state()["biases"]


@app.get("/api/v1/events", response_model=list[EventItem])
def events():
    return load_state()["events"]


@app.get("/api/v1/events/{event_id}", response_model=EventItem)
def event_detail(event_id: str):
    for event in load_state()["events"]:
      if event["id"] == event_id:
          return event
    raise HTTPException(status_code=404, detail="Event not found")


@app.post("/api/v1/admin/reset-demo")
def reset_demo():
    state = seed_state()
    save_state(state)
    return {"status": "reset"}
