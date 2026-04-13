from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import psycopg
import pytest

from app.settings import settings


def database_available():
 try:
  with psycopg.connect(settings.database_url, connect_timeout=1):
   return True
 except Exception:
  return False


_DB_AVAILABLE = database_available()
pytestmark = pytest.mark.skipif(not _DB_AVAILABLE, reason='Postgres unavailable for API integration tests')

if _DB_AVAILABLE:
 from fastapi.testclient import TestClient
 from app.main import app
 from app.seed import seed_demo_database
 from app import geoboard_service

 client = TestClient(app)
else:
 client = None
 geoboard_service = None


def reset_demo():
 seed_demo_database()
 client.cookies.clear()


def sign_in(email='demo@macroaccess.local', password='demo12345'):
 client.cookies.clear()
 response = client.post('/api/v1/auth/sign-in', json={'email': email, 'password': password})
 assert response.status_code == 200, response.text


def test_geoboard_feed_route_returns_ranked_integrated_payload(monkeypatch):
 reset_demo()
 sign_in()
 monkeypatch.setattr(geoboard_service, '_fetch_gdelt_rows', lambda: ([], False))

 response = client.get('/api/geoboard/feed?mode=RISK')
 assert response.status_code == 200, response.text
 payload = response.json()

 assert payload['modeState']['activeMode'] == 'RISK'
 assert payload['feed']
 assert any(item['feedType'] == 'MACRO_CATALYST' for item in payload['feed'])
 assert any(item['feedType'] == 'GEO_RISK' for item in payload['feed'])
 assert all('sourceMeta' in item and 'ranking' in item for item in payload['feed'])
 assert any(item['layer'] == 'feed' for item in payload['sourceStatus'])


def test_geoboard_legacy_routes_keep_contracts(monkeypatch):
 reset_demo()
 sign_in()
 monkeypatch.setattr(geoboard_service, '_fetch_gdelt_rows', lambda: ([], False))

 geo = client.get('/api/geoboard/gdelt-events')
 assert geo.status_code == 200, geo.text
 geo_rows = geo.json()
 assert geo_rows
 assert 'sourceMeta' in geo_rows[0]
 assert 'ranking' in geo_rows[0]

 macro = client.get('/api/geoboard/macro-events')
 assert macro.status_code == 200, macro.text
 macro_rows = macro.json()
 assert macro_rows
 assert 'sourceMeta' in macro_rows[0]
 assert 'ranking' in macro_rows[0]
