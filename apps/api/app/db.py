from contextlib import contextmanager
from pathlib import Path

import psycopg
from psycopg.rows import dict_row

from .settings import settings

MIGRATIONS_DIR = Path(__file__).resolve().parent / "sql"

@contextmanager
def get_connection():
    conn = psycopg.connect(settings.database_url, row_factory=dict_row)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def apply_migrations():
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now())")
            for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
                version = path.name
                cur.execute("select version from schema_migrations where version = %s", (version,))
                if cur.fetchone():
                    continue
                cur.execute(path.read_text(encoding="utf-8"))
                cur.execute("insert into schema_migrations (version) values (%s)", (version,))

def fetch_all(query, params=None):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params or ())
            return cur.fetchall()

def fetch_one(query, params=None):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params or ())
            return cur.fetchone()

def execute(query, params=None):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params or ())


