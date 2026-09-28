"""Top of Mind Hub — SQLite storage layer.

Everything the hub remembers lives in one file: hub/data/topofmind.db
Messages, per-lane notes, per-lane clipboard, and a searchable knowledge bank.
"""

import os
import sqlite3
import threading
import time

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "topofmind.db")
_lock = threading.Lock()


def _conn():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with _lock, _conn() as c:
        c.executescript(
            """
            CREATE TABLE IF NOT EXISTS messages (
              id TEXT PRIMARY KEY,
              role TEXT,
              source TEXT,
              content TEXT,
              folder TEXT DEFAULT 'inbox',
              client_id TEXT,
              created_at TEXT,
              ts REAL
            );
            CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_client
              ON messages(client_id) WHERE client_id IS NOT NULL;

            CREATE TABLE IF NOT EXISTS lane_notes (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              lane TEXT,
              title TEXT,
              body TEXT,
              ts REAL
            );

            CREATE TABLE IF NOT EXISTS lane_clipboard (
              lane TEXT PRIMARY KEY,
              text TEXT,
              ts REAL
            );

            CREATE TABLE IF NOT EXISTS knowledge (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              lane TEXT,
              path TEXT,
              chunk TEXT,
              ts REAL
            );
            CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts
              USING fts5(chunk, content='knowledge', content_rowid='id');
            """
        )


# ------------------------------ messages ------------------------------

def add_message(msg_id, role, source, content, folder="inbox", client_id=None, created_at=""):
    with _lock, _conn() as c:
        c.execute(
            "INSERT OR IGNORE INTO messages (id, role, source, content, folder, client_id, created_at, ts)"
            " VALUES (?,?,?,?,?,?,?,?)",
            (msg_id, role, source, content, folder, client_id, created_at, time.time()),
        )


def get_messages(limit=75):
    with _lock, _conn() as c:
        rows = c.execute(
            "SELECT id, role, source, content, content AS body, folder, created_at"
            " FROM messages ORDER BY ts DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [dict(r) for r in reversed(rows)]


def get_context_for_lane(lane_id, limit=20):
    """User messages + this lane's own replies, oldest first — the lane's memory of the chat."""
    with _lock, _conn() as c:
        rows = c.execute(
            "SELECT role, source, content FROM messages"
            " WHERE role = 'user' OR source = ? ORDER BY ts DESC LIMIT ?",
            (lane_id, limit),
        ).fetchall()
    out = []
    for r in reversed(rows):
        out.append({"role": "user" if r["role"] == "user" else "assistant", "content": r["content"]})
    return out


def update_message(msg_id, patch):
    allowed = {"folder": "folder", "content": "content"}
    sets, vals = [], []
    for k, col in allowed.items():
        if k in patch:
            sets.append(f"{col} = ?")
            vals.append(patch[k])
    if not sets:
        return
    vals.append(msg_id)
    with _lock, _conn() as c:
        c.execute(f"UPDATE messages SET {', '.join(sets)} WHERE id = ?", vals)


def clear_messages():
    with _lock, _conn() as c:
        c.execute("DELETE FROM messages")


# ------------------------------ lane notes ------------------------------

def add_note(lane, title, body):
    with _lock, _conn() as c:
        cur = c.execute(
            "INSERT INTO lane_notes (lane, title, body, ts) VALUES (?,?,?,?)",
            (lane, title, body, time.time()),
        )
        return cur.lastrowid


def get_notes(lane, limit=50):
    with _lock, _conn() as c:
        rows = c.execute(
            "SELECT id, lane, title, body, ts FROM lane_notes WHERE lane = ? ORDER BY ts DESC LIMIT ?",
            (lane, limit),
        ).fetchall()
    return [dict(r) for r in rows]


def delete_note(lane, note_id):
    with _lock, _conn() as c:
        c.execute("DELETE FROM lane_notes WHERE lane = ? AND id = ?", (lane, note_id))


# ------------------------------ lane clipboard ------------------------------

def set_clipboard(lane, text):
    with _lock, _conn() as c:
        c.execute(
            "INSERT INTO lane_clipboard (lane, text, ts) VALUES (?,?,?)"
            " ON CONFLICT(lane) DO UPDATE SET text = excluded.text, ts = excluded.ts",
            (lane, text, time.time()),
        )


def get_clipboard(lane):
    with _lock, _conn() as c:
        row = c.execute("SELECT text, ts FROM lane_clipboard WHERE lane = ?", (lane,)).fetchone()
    return dict(row) if row else {"text": "", "ts": None}


# ------------------------------ knowledge bank ------------------------------

def add_knowledge(lane, path, chunk):
    with _lock, _conn() as c:
        cur = c.execute(
            "INSERT INTO knowledge (lane, path, chunk, ts) VALUES (?,?,?,?)",
            (lane, path, chunk, time.time()),
        )
        c.execute("INSERT INTO knowledge_fts (rowid, chunk) VALUES (?,?)", (cur.lastrowid, chunk))
        return cur.lastrowid


def search_knowledge(lane, query, limit=10):
    with _lock, _conn() as c:
        if query:
            rows = c.execute(
                "SELECT k.id, k.lane, k.path, k.chunk, k.ts FROM knowledge k"
                " JOIN knowledge_fts f ON k.id = f.rowid"
                " WHERE knowledge_fts MATCH ? AND (k.lane = ? OR k.lane = 'shared')"
                " ORDER BY rank LIMIT ?",
                (query, lane, limit),
            ).fetchall()
        else:
            rows = c.execute(
                "SELECT id, lane, path, chunk, ts FROM knowledge"
                " WHERE lane = ? OR lane = 'shared' ORDER BY ts DESC LIMIT ?",
                (lane, limit),
            ).fetchall()
    return [dict(r) for r in rows]
