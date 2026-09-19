"""SQLite CaseStore: one file (var/atlas.sqlite), four tables, per candidate-2's sketch
(docs/arena/candidate-2/sketch/case.py) grafted into the T1-T3 design (DESIGN.md "Grafted from
candidate-2"). One writer process, so no locking beyond WAL.

Tonight's app.py only uses `cases` (pre-rendered QueueRow/CaseView JSON, read by /queue and
/cases/{id}) and `cache` (the tiny disk-cache interface federato.py already defines against). The
`events` and `outbox` tables are created now so T6 (DeskEvent log, SSE tail) and T11/T12 (actions,
Linq) don't need a schema migration later; their read/write methods are intentionally minimal
until those tasks give them a real shape to serve.
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any

DEFAULT_DB_PATH = Path(__file__).resolve().parents[3] / "var" / "atlas.sqlite"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    seq INTEGER NOT NULL,
    key TEXT NOT NULL,
    json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(case_id, key)
);
CREATE INDEX IF NOT EXISTS idx_events_case_seq ON events(case_id, seq);
CREATE TABLE IF NOT EXISTS cache (
    key TEXT PRIMARY KEY,
    json TEXT NOT NULL,
    ts TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS outbox (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    channel TEXT NOT NULL,
    status TEXT NOT NULL,
    json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


class CaseStore:
    def __init__(self, conn: sqlite3.Connection) -> None:
        self.conn = conn

    @classmethod
    def open(cls, path: Path = DEFAULT_DB_PATH) -> "CaseStore":
        path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(path, check_same_thread=False)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.executescript(_SCHEMA)
        conn.commit()
        return cls(conn)

    # ---- cases: pre-rendered {"queue": QueueRow, "case": CaseView} JSON, keyed by case id ------

    def put_case(self, case_id: str, data: dict[str, Any]) -> None:
        self.conn.execute(
            "INSERT INTO cases(id, json, updated_at) VALUES (?, ?, datetime('now')) "
            "ON CONFLICT(id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at",
            (case_id, json.dumps(data)),
        )
        self.conn.commit()

    def get_case(self, case_id: str) -> dict[str, Any] | None:
        row = self.conn.execute("SELECT json FROM cases WHERE id = ?", (case_id,)).fetchone()
        return json.loads(row[0]) if row else None

    def list_cases(self) -> list[dict[str, Any]]:
        rows = self.conn.execute("SELECT json FROM cases ORDER BY id").fetchall()
        return [json.loads(r[0]) for r in rows]

    # ---- disk cache: the Cache interface federato.JsonFileCache also implements ------------------

    def cache_get(self, key: str) -> Any | None:
        row = self.conn.execute("SELECT json FROM cache WHERE key = ?", (key,)).fetchone()
        return json.loads(row[0]) if row else None

    def cache_set(self, key: str, value: Any) -> None:
        self.conn.execute(
            "INSERT INTO cache(key, json, ts) VALUES (?, ?, datetime('now')) "
            "ON CONFLICT(key) DO UPDATE SET json = excluded.json, ts = excluded.ts",
            (key, json.dumps(value)),
        )
        self.conn.commit()

    # ---- events: append-only, idempotent by (case_id, key); T6 gives this a real payload shape --

    def post_event(self, case_id: str, key: str, payload: dict[str, Any]) -> int:
        seq_row = self.conn.execute(
            "SELECT COALESCE(MAX(seq), 0) + 1 FROM events WHERE case_id = ?", (case_id,)
        ).fetchone()
        seq = seq_row[0]
        event_id = f"{case_id}:{key}"
        self.conn.execute(
            "INSERT INTO events(id, case_id, seq, key, json) VALUES (?, ?, ?, ?, ?) "
            "ON CONFLICT(case_id, key) DO UPDATE SET json = excluded.json",
            (event_id, case_id, seq, key, json.dumps(payload)),
        )
        self.conn.commit()
        return seq

    def events(self, case_id: str, after_seq: int = 0) -> list[dict[str, Any]]:
        rows = self.conn.execute(
            "SELECT seq, key, json FROM events WHERE case_id = ? AND seq > ? ORDER BY seq",
            (case_id, after_seq),
        ).fetchall()
        return [{"seq": seq, "key": key, **json.loads(j)} for seq, key, j in rows]

    # ---- outbox: T11/T12's action log; append + list only until those tasks land -----------------

    def post_outbox(self, outbox_id: str, case_id: str, channel: str, status: str,
                     payload: dict[str, Any]) -> None:
        self.conn.execute(
            "INSERT INTO outbox(id, case_id, channel, status, json) VALUES (?, ?, ?, ?, ?) "
            "ON CONFLICT(id) DO UPDATE SET status = excluded.status, json = excluded.json",
            (outbox_id, case_id, channel, status, json.dumps(payload)),
        )
        self.conn.commit()

    def outbox_for(self, case_id: str) -> list[dict[str, Any]]:
        rows = self.conn.execute(
            "SELECT id, channel, status, json FROM outbox WHERE case_id = ? ORDER BY created_at",
            (case_id,),
        ).fetchall()
        return [{"id": i, "channel": c, "status": s, **json.loads(j)} for i, c, s, j in rows]
