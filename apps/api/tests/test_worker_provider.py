from pathlib import Path
import importlib.util
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import psycopg
import pytest

from app import providers

from app.settings import settings

def database_available():
    try:
        with psycopg.connect(settings.database_url, connect_timeout=1):
            return True
    except Exception:
        return False

_DB_AVAILABLE = database_available()

if _DB_AVAILABLE:
    from fastapi.testclient import TestClient
    from app.main import app
    from app.seed import seed_demo_database
    from app.services import create_job

    client = TestClient(app)
else:
    client = None


def reset_demo():
	seed_demo_database()
	client.cookies.clear()


def sign_in(email="demo@macroaccess.local", password="demo12345"):
	response = client.post("/api/v1/auth/sign-in", json={"email": email, "password": password})
	assert response.status_code == 200, response.text
	return response


def load_worker_module():
	worker_path = Path(__file__).resolve().parents[2] / "worker" / "main.py"
	spec = importlib.util.spec_from_file_location("worker_main", worker_path)
	assert spec and spec.loader
	worker = importlib.util.module_from_spec(spec)
	spec.loader.exec_module(worker)
	return worker


@pytest.mark.skipif(not _DB_AVAILABLE, reason='Postgres unavailable for API integration tests')
def test_refresh_dashboard_cache_job_only_rebuilds_live_dashboard(monkeypatch):
	reset_demo()
	worker = load_worker_module()
	calls = []

	monkeypatch.setattr(worker, "invalidate_provider_payload", lambda key: calls.append(("provider", key)))
	monkeypatch.setattr(worker, "recompute_signal_evaluations_service", lambda: calls.append(("eval",)))
	monkeypatch.setattr(worker, "workstation_payload", lambda user, prefer_cache=False, force_refresh=False: calls.append(("workstation", user["id"], force_refresh)))
	monkeypatch.setattr(worker, "dashboard_payload", lambda user, prefer_cache=False, force_refresh=False: calls.append(("dashboard", user["id"], force_refresh)))

	job_id = create_job("refresh_dashboard_cache", {"source": "test", "userId": "user-demo"}, run_now=False)
	worker.run_job(job_id)

	assert calls == [("dashboard", "user-demo", True)]


@pytest.mark.skipif(not _DB_AVAILABLE, reason='Postgres unavailable for API integration tests')
def test_evaluate_alerts_defaults_to_alert_scoped_users(monkeypatch):
	reset_demo()
	worker = load_worker_module()
	calls = []

	monkeypatch.setattr(worker, "_users_with_active_alerts", lambda: [
	{"id": "user-demo", "email": "demo@macroaccess.local", "name": "Demo", "role": "user", "onboardingCompleted": True, "emailVerified": True},
	{"id": "user-analyst", "email": "analyst@macroaccess.local", "name": "Analyst", "role": "analyst", "onboardingCompleted": True, "emailVerified": True},
	])
	monkeypatch.setattr(worker, "invalidate_provider_payload", lambda key: calls.append(("provider", key)))
	monkeypatch.setattr(worker, "recompute_signal_evaluations_service", lambda: calls.append(("eval",)))
	monkeypatch.setattr(worker, "workstation_payload", lambda user, prefer_cache=False, force_refresh=False: calls.append(("workstation", user["id"], force_refresh)))
	monkeypatch.setattr(worker, "dashboard_payload", lambda user, prefer_cache=False, force_refresh=False: calls.append(("dashboard", user["id"], force_refresh)))

	job_id = create_job("evaluate_alerts", {"source": "test"}, run_now=False)
	worker.run_job(job_id)

	assert not [item for item in calls if item[0] == "provider"]
	assert [item for item in calls if item[0] == "workstation"] == [
	("workstation", "user-demo", True),
	("workstation", "user-analyst", True),
	]
	assert [item for item in calls if item[0] == "dashboard"] == [
	("dashboard", "user-demo", True),
	("dashboard", "user-analyst", True),
	]


class FakeResponse:
	def __init__(self, text):
		self.text = text

	def raise_for_status(self):
		return None


class FakeClient:
	def __init__(self, text):
		self._text = text

	def __enter__(self):
		return self

	def __exit__(self, exc_type, exc, tb):
		return False

	def get(self, url):
		return FakeResponse(self._text)


def test_load_rss_feed_strips_html_and_supports_atom_entries(monkeypatch):
	feed = """<?xml version=\"1.0\" encoding=\"utf-8\"?>
	<feed xmlns=\"http://www.w3.org/2005/Atom\">
	<entry>
	<title>Older note</title>
	<link href=\"https://example.com/one\" />
	<updated>2026-04-01T10:00:00Z</updated>
	<summary><![CDATA[<p>First <strong>desk</strong> note</p>]]></summary>
	</entry>
	<entry>
	<title>Fresh note</title>
	<link href=\"https://example.com/two\" />
	<updated>2026-04-02T11:30:00Z</updated>
	<summary><![CDATA[<div>Second<br/>desk&nbsp;update</div>]]></summary>
	</entry>
	</feed>"""

	monkeypatch.setattr(providers, "_client", lambda: FakeClient(feed))

	payload = providers.load_rss_feed("atom-provider-test", "Atom desk feed", "https://example.com/feed", ttl=1, item_limit=2)

	assert payload["items"][0]["title"] == "Fresh note"
	assert payload["items"][0]["link"] == "https://example.com/two"
	assert payload["items"][0]["summary"] == "Second desk update"
	assert payload["items"][0]["publishedAt"] == "2026-04-02T11:30:00+00:00"


@pytest.mark.skipif(not _DB_AVAILABLE, reason='Postgres unavailable for API integration tests')
def test_watchlist_and_alert_mutations_invalidate_live_dashboard_cache():
	reset_demo()
	sign_in()

	first = client.get("/api/v1/dashboard").json()
	assert not any(item["title"] == "FX Desk" for item in first["linkedIntelligence"]["watchlists"])

	created = client.post("/api/v1/watchlists", json={"name": "FX Desk", "description": "Dollar and euro"})
	assert created.status_code == 200, created.text

	second = client.get("/api/v1/dashboard").json()
	assert any(item["title"] == "FX Desk" for item in second["linkedIntelligence"]["watchlists"])

	sign_in()
	alert = client.post("/api/v1/alerts", json={"name": "EURUSD dashboard alert", "triggerType": "asset_threshold", "targetRef": "EURUSD", "thresholdValue": "1.10", "deliveryChannel": "In-app"})
	assert alert.status_code == 200, alert.text

	third = client.get("/api/v1/dashboard").json()
	assert any(item["title"] == "EURUSD dashboard alert" for item in third["linkedIntelligence"]["alerts"])
