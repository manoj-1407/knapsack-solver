"""
database/db.py

Lightweight SQLite persistence layer.

Stores solved knapsack problems so users can revisit past work,
compare across sessions, and build up a personal problem library.

Schema
------
problems
    id            INTEGER PRIMARY KEY AUTOINCREMENT
    name          TEXT
    created_at    TEXT    (ISO-8601)
    items         TEXT    (JSON)
    capacity      INTEGER
    dp_result     TEXT    (JSON)
    greedy_result TEXT    (JSON)
"""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any

# Database lives next to this file in the database/ folder
DB_PATH = Path(__file__).parent / "knapsack.db"


# ---------------------------------------------------------------------------
# Connection helper
# ---------------------------------------------------------------------------

def _get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row     # lets us access columns by name
    return conn


# ---------------------------------------------------------------------------
# Init
# ---------------------------------------------------------------------------

def init_db() -> None:
    """Create tables if they don't exist. Called once at startup."""
    with _get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS problems (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                name          TEXT    NOT NULL,
                created_at    TEXT    NOT NULL,
                items         TEXT    NOT NULL,
                capacity      INTEGER NOT NULL,
                dp_result     TEXT    NOT NULL,
                greedy_result TEXT    NOT NULL
            )
        """)
        conn.commit()


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

def save_problem(
    name          : str,
    items         : list[dict],
    capacity      : int,
    dp_result     : dict,
    greedy_result : dict,
) -> int:
    """Persist a solved problem. Returns the new row id."""
    with _get_conn() as conn:
        cursor = conn.execute(
            """
            INSERT INTO problems (name, created_at, items, capacity, dp_result, greedy_result)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                name,
                datetime.now().isoformat(timespec="seconds"),
                json.dumps(items),
                capacity,
                json.dumps(dp_result),
                json.dumps(greedy_result),
            ),
        )
        conn.commit()
        return cursor.lastrowid


def get_history() -> list[dict[str, Any]]:
    """Return all saved problems, newest first, without full result blobs."""
    with _get_conn() as conn:
        rows = conn.execute(
            """
            SELECT id, name, created_at, capacity,
                   json_array_length(items) AS item_count
            FROM problems
            ORDER BY id DESC
            """
        ).fetchall()
    return [dict(row) for row in rows]


def get_problem_by_id(problem_id: int) -> dict[str, Any] | None:
    """Return a full problem record including result blobs."""
    with _get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM problems WHERE id = ?", (problem_id,)
        ).fetchone()

    if row is None:
        return None

    d = dict(row)
    d["items"]         = json.loads(d["items"])
    d["dp_result"]     = json.loads(d["dp_result"])
    d["greedy_result"] = json.loads(d["greedy_result"])
    return d


def delete_problem(problem_id: int) -> None:
    """Hard-delete a problem record."""
    with _get_conn() as conn:
        conn.execute("DELETE FROM problems WHERE id = ?", (problem_id,))
        conn.commit()
