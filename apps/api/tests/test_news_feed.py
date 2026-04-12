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

    client = TestClient(app)
else:
    client = None


def reset_demo():
    seed_demo_database()
    client.cookies.clear()


def sign_in(email='demo@macroaccess.local', password='demo12345'):
    client.cookies.clear()
    response = client.post('/api/v1/auth/sign-in', json={'email': email, 'password': password})
    assert response.status_code == 200, response.text


def test_news_endpoint_modes_and_source_honesty():
    reset_demo()
    sign_in()

    wire_response = client.get('/api/v1/news?mode=wire&limit=40')
    assert wire_response.status_code == 200, wire_response.text
    wire = wire_response.json()
    assert wire['mode'] == 'wire'
    assert wire['items']
    assert any(item['sourceType'] == 'official' for item in wire['items'])
    assert any(item['sourceType'] in ['discovery', 'seeded'] for item in wire['items'])
    assert 'deterministic' in wire['sourceMeta']['note'].lower()

    macro_response = client.get('/api/v1/news?mode=macro&limit=40')
    assert macro_response.status_code == 200, macro_response.text
    macro = macro_response.json()
    assert macro['mode'] == 'macro'
    assert all(item['category'] in {'Central bank', 'Inflation', 'Labor', 'Growth', 'Liquidity', 'Funding', 'Policy', 'Regulation', 'Treasury', 'Macro'} or item['sourceType'] == 'official' for item in macro['items'])

    watchlist_response = client.get('/api/v1/news?mode=watchlist&watchlist_only=true&limit=40')
    assert watchlist_response.status_code == 200, watchlist_response.text
    watchlist = watchlist_response.json()
    assert watchlist['mode'] == 'watchlist'
    assert watchlist['summary']['watchlistHits'] >= 1
    assert all(int(item.get('watchOverlap', 0)) > 0 for item in watchlist['items'])


def test_news_endpoint_exposes_clustering_and_links():
    reset_demo()
    sign_in()

    response = client.get('/api/v1/news?mode=wire&limit=30')
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload['summary']['clusters'] >= 1
    assert 'sourceStatus' in payload['rails']

    first = payload['items'][0]
    assert 'links' in first
    assert first['links']['calendar'] == '/app/macro-calendar'
    assert first['links']['reactions'] == '/app/live-reactions'
    assert first['links']['bias'] == '/app/market-bias'
