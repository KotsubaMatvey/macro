from pathlib import Path
import sys
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import services


def test_list_watchlists_batches_items_and_alert_count_once(monkeypatch):
    calls = {"fetch_all": [], "fetch_one": []}

    def fake_fetch_all(query, params=()):
        calls["fetch_all"].append((query, params))
        if "from watchlists where user_id" in query:
            return [
                {"id": "wl-1", "name": "FX", "description": "desk"},
                {"id": "wl-2", "name": "Rates", "description": "front-end"},
            ]
        if "from watchlist_items wi join watchlists w" in query:
            return [
                {"id": "it-1", "watchlist_id": "wl-1", "symbol": "EURUSD", "item_type": "asset", "note": "ecb"},
                {"id": "it-2", "watchlist_id": "wl-1", "symbol": "DXY", "item_type": "asset", "note": ""},
            ]
        raise AssertionError("unexpected query: " + query)

    def fake_fetch_one(query, params=()):
        calls["fetch_one"].append((query, params))
        if "from alerts where user_id" in query:
            return {"count": 4}
        raise AssertionError("unexpected query: " + query)

    monkeypatch.setattr(services, "fetch_all", fake_fetch_all)
    monkeypatch.setattr(services, "fetch_one", fake_fetch_one)

    payload = services.list_watchlists("user-1")
    assert len(payload) == 2
    assert payload[0]["itemCount"] == 2
    assert payload[0]["alertCount"] == 4
    assert payload[1]["itemCount"] == 0
    assert payload[1]["alertCount"] == 4
    assert len(calls["fetch_one"]) == 1
    assert len(calls["fetch_all"]) == 2


def test_add_watchlist_item_rejects_unowned_watchlist(monkeypatch):
    monkeypatch.setattr(services, "_watchlist_owned_by_user", lambda user_id, watchlist_id: False)
    payload = SimpleNamespace(symbol="EURUSD", itemType="asset", note="ecb")
    try:
        services.add_watchlist_item("user-a", "wl-x", payload)
    except LookupError as exc:
        assert "Watchlist not found" in str(exc)
        return
    raise AssertionError("expected LookupError")


def test_add_watchlist_item_rejects_blank_and_duplicate_symbols(monkeypatch):
    monkeypatch.setattr(services, "_watchlist_owned_by_user", lambda user_id, watchlist_id: True)

    def fake_fetch_one(query, params=()):
        if "from watchlist_items where watchlist_id" in query:
            return {"id": "it-1"}
        return None

    monkeypatch.setattr(services, "fetch_one", fake_fetch_one)

    blank_payload = SimpleNamespace(symbol="   ", itemType="asset", note="")
    try:
        services.add_watchlist_item("user-a", "wl-1", blank_payload)
    except ValueError as exc:
        assert "required" in str(exc)
    else:
        raise AssertionError("expected ValueError for blank symbol")

    duplicate_payload = SimpleNamespace(symbol="EURUSD", itemType="asset", note="")
    try:
        services.add_watchlist_item("user-a", "wl-1", duplicate_payload)
    except ValueError as exc:
        assert "already exists" in str(exc)
        return
    raise AssertionError("expected ValueError for duplicate symbol")


def test_add_watchlist_item_normalizes_inserted_payload(monkeypatch):
    executed = []

    class DummyCursor:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def execute(self, query, params):
            executed.append((query, params))

    class DummyConnection:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def cursor(self):
            return DummyCursor()

    monkeypatch.setattr(services, "_watchlist_owned_by_user", lambda user_id, watchlist_id: True)
    monkeypatch.setattr(services, "fetch_one", lambda query, params=(): None)
    monkeypatch.setattr(services, "get_connection", lambda: DummyConnection())
    monkeypatch.setattr(services, "audit", lambda *args, **kwargs: None)
    monkeypatch.setattr(services, "_invalidate_user_cache", lambda *args, **kwargs: None)

    item_id = services.add_watchlist_item("user-a", "wl-1", SimpleNamespace(symbol=" eurusd ", itemType="asset", note="  carry "))
    assert item_id.startswith("watch-item-")
    insert_rows = [item for item in executed if "insert into watchlist_items" in item[0]]
    assert len(insert_rows) == 1
    _, params = insert_rows[0]
    assert params[1] == "wl-1"
    assert params[2] == "asset"
    assert params[3] == "EURUSD"
    assert params[4] == "carry"
