"""Storage layer for the Learn Engine.

Uses PostgreSQL when DATABASE_URL is set (production / docker-compose), otherwise
falls back to a local SQLite DB seeded from content/lessons/*.yaml so the service
runs with zero external infra (per the hybrid approach for local dev).

The public API is DB-agnostic: get_lessons, get_lesson, record_completion,
upsert_toolkit, get_toolkit.
"""
from __future__ import annotations

import json
import os
import sqlite3
import uuid
from pathlib import Path
from typing import Any, Optional

import yaml

ROOT = Path(__file__).resolve().parents[2]
LESSONS_DIR = ROOT / "content" / "lessons"

USE_PG = bool(os.getenv("DATABASE_URL"))


# ── YAML loading ────────────────────────────────────────────────────────────
def _load_lessons_from_yaml() -> list[dict]:
    lessons = []
    for path in sorted(LESSONS_DIR.glob("*.yaml")):
        raw = yaml.safe_load(path.read_text())
        snippet = raw.get("snippet", {})
        lessons.append(
            {
                "slug": raw["slug"],
                "title": raw["title"],
                "prerequisite_slugs": raw.get("prerequisites", []),
                "estimated_minutes": raw.get("estimated_minutes", 10),
                "concept_content": raw.get("concept", []),
                "snippet_prompt": snippet.get("prompt", ""),
                "snippet_starter_code": snippet.get("starter_code", ""),
                "snippet_test_cases": snippet.get("test_cases", []),
                "hint_levels": snippet.get("hints", []),
                "toolkit_key": raw.get("toolkit_key"),
                "order_index": raw.get("order_index", 0),
            }
        )
    lessons.sort(key=lambda x: x["order_index"])
    return lessons


# ── SQLite backend (default for local dev) ──────────────────────────────────
class _SqliteStore:
    def __init__(self) -> None:
        self.db_path = os.getenv("LEARN_SQLITE_PATH", "/tmp/cascade_learn.db")
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._init_schema()
        self._seed()

    def _init_schema(self) -> None:
        c = self.conn
        c.executescript(
            """
            CREATE TABLE IF NOT EXISTS lessons (
                slug TEXT PRIMARY KEY, title TEXT, prerequisite_slugs TEXT,
                estimated_minutes INT, concept_content TEXT, snippet_prompt TEXT,
                snippet_starter_code TEXT, snippet_test_cases TEXT,
                hint_levels TEXT, toolkit_key TEXT, order_index INT
            );
            CREATE TABLE IF NOT EXISTS lesson_completions (
                id TEXT PRIMARY KEY, user_id TEXT, lesson_slug TEXT,
                snippet_code TEXT, tests_passed INT, tests_total INT,
                hints_used INT, completed_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS user_toolkit (
                id TEXT PRIMARY KEY, user_id TEXT, toolkit_key TEXT, code TEXT,
                is_active INT DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, toolkit_key)
            );
            """
        )
        c.commit()

    def _seed(self) -> None:
        for L in _load_lessons_from_yaml():
            self.conn.execute(
                """INSERT OR REPLACE INTO lessons
                   (slug,title,prerequisite_slugs,estimated_minutes,concept_content,
                    snippet_prompt,snippet_starter_code,snippet_test_cases,hint_levels,
                    toolkit_key,order_index)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    L["slug"], L["title"], json.dumps(L["prerequisite_slugs"]),
                    L["estimated_minutes"], json.dumps(L["concept_content"]),
                    L["snippet_prompt"], L["snippet_starter_code"],
                    json.dumps(L["snippet_test_cases"]), json.dumps(L["hint_levels"]),
                    L["toolkit_key"], L["order_index"],
                ),
            )
        self.conn.commit()

    @staticmethod
    def _row_to_lesson(r: sqlite3.Row) -> dict:
        return {
            "slug": r["slug"], "title": r["title"],
            "prerequisite_slugs": json.loads(r["prerequisite_slugs"]),
            "estimated_minutes": r["estimated_minutes"],
            "concept_content": json.loads(r["concept_content"]),
            "snippet_prompt": r["snippet_prompt"],
            "snippet_starter_code": r["snippet_starter_code"],
            "snippet_test_cases": json.loads(r["snippet_test_cases"]),
            "hint_levels": json.loads(r["hint_levels"]),
            "toolkit_key": r["toolkit_key"], "order_index": r["order_index"],
        }

    def get_lessons(self) -> list[dict]:
        rows = self.conn.execute("SELECT * FROM lessons ORDER BY order_index").fetchall()
        return [self._row_to_lesson(r) for r in rows]

    def get_lesson(self, slug: str) -> Optional[dict]:
        r = self.conn.execute("SELECT * FROM lessons WHERE slug=?", (slug,)).fetchone()
        return self._row_to_lesson(r) if r else None

    def record_completion(self, user_id, lesson_slug, code, passed, total, hints):
        self.conn.execute(
            """INSERT INTO lesson_completions
               (id,user_id,lesson_slug,snippet_code,tests_passed,tests_total,hints_used)
               VALUES (?,?,?,?,?,?,?)""",
            (str(uuid.uuid4()), user_id, lesson_slug, code, passed, total, hints),
        )
        self.conn.commit()

    def upsert_toolkit(self, user_id, toolkit_key, code):
        self.conn.execute(
            """INSERT INTO user_toolkit (id,user_id,toolkit_key,code)
               VALUES (?,?,?,?)
               ON CONFLICT(user_id,toolkit_key) DO UPDATE SET code=excluded.code""",
            (str(uuid.uuid4()), user_id, toolkit_key, code),
        )
        self.conn.commit()

    def get_toolkit(self, user_id) -> list[dict]:
        rows = self.conn.execute(
            "SELECT toolkit_key, code FROM user_toolkit WHERE user_id=? AND is_active=1",
            (user_id,),
        ).fetchall()
        return [{"toolkit_key": r["toolkit_key"], "code": r["code"]} for r in rows]


# ── Postgres backend (used when DATABASE_URL is set) ────────────────────────
class _PgStore:  # pragma: no cover - requires a live database
    def __init__(self) -> None:
        import psycopg  # type: ignore

        self.psycopg = psycopg
        self.dsn = os.environ["DATABASE_URL"]
        self._seed()

    def _conn(self):
        return self.psycopg.connect(self.dsn, autocommit=True, row_factory=self.psycopg.rows.dict_row)

    def _seed(self) -> None:
        with self._conn() as conn, conn.cursor() as cur:
            for L in _load_lessons_from_yaml():
                cur.execute(
                    """INSERT INTO lessons
                       (slug,title,prerequisite_slugs,estimated_minutes,concept_content,
                        snippet_prompt,snippet_starter_code,snippet_test_cases,hint_levels,
                        toolkit_key,order_index)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                       ON CONFLICT (slug) DO UPDATE SET
                         title=EXCLUDED.title, concept_content=EXCLUDED.concept_content,
                         snippet_test_cases=EXCLUDED.snippet_test_cases,
                         hint_levels=EXCLUDED.hint_levels""",
                    (
                        L["slug"], L["title"], L["prerequisite_slugs"], L["estimated_minutes"],
                        json.dumps(L["concept_content"]), L["snippet_prompt"],
                        L["snippet_starter_code"], json.dumps(L["snippet_test_cases"]),
                        json.dumps(L["hint_levels"]), L["toolkit_key"], L["order_index"],
                    ),
                )

    def get_lessons(self):
        with self._conn() as conn, conn.cursor() as cur:
            cur.execute("SELECT * FROM lessons ORDER BY order_index")
            return cur.fetchall()

    def get_lesson(self, slug):
        with self._conn() as conn, conn.cursor() as cur:
            cur.execute("SELECT * FROM lessons WHERE slug=%s", (slug,))
            return cur.fetchone()

    def record_completion(self, user_id, lesson_slug, code, passed, total, hints):
        with self._conn() as conn, conn.cursor() as cur:
            cur.execute("SELECT id FROM lessons WHERE slug=%s", (lesson_slug,))
            row = cur.fetchone()
            lesson_id = row["id"] if row else None
            cur.execute(
                """INSERT INTO lesson_completions
                   (user_id,lesson_id,snippet_code,tests_passed,tests_total,hints_used)
                   VALUES (%s,%s,%s,%s,%s,%s)""",
                (user_id, lesson_id, code, passed, total, hints),
            )

    def upsert_toolkit(self, user_id, toolkit_key, code):
        with self._conn() as conn, conn.cursor() as cur:
            cur.execute(
                """INSERT INTO user_toolkit (user_id,toolkit_key,code) VALUES (%s,%s,%s)""",
                (user_id, toolkit_key, code),
            )

    def get_toolkit(self, user_id):
        with self._conn() as conn, conn.cursor() as cur:
            cur.execute(
                "SELECT toolkit_key, code FROM user_toolkit WHERE user_id=%s AND is_active=true",
                (user_id,),
            )
            return cur.fetchall()


_store: Any = None


def get_store():
    global _store
    if _store is None:
        _store = _PgStore() if USE_PG else _SqliteStore()
    return _store
