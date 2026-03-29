import json
from datetime import datetime, timezone
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parents[1] / "api" / "data" / "demo_state.json"


def run_once():
    if not DATA_PATH.exists():
        print("demo state not found, run seed first")
        return
    state = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    state["workerLastRun"] = datetime.now(timezone.utc).isoformat()
    DATA_PATH.write_text(json.dumps(state, indent=2), encoding="utf-8")
    print("worker run completed")


if __name__ == "__main__":
    run_once()
