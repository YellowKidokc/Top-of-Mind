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
              ts REAL,
              error INTEGER DEFAULT 0,
              model TEXT
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
        # Databases created before these columns existed
        cols = [r[1] for r in c.execute("PRAGMA table_info(messages)")]
        if "error" not in cols:
            c.execute("ALTER TABLE messages ADD COLUMN error INTEGER DEFAULT 0")
        if "model" not in cols:
            c.execute("ALTER TABLE messages ADD COLUMN model TEXT")
            c.execute("UPDATE messages SET model = source WHERE role = 'assistant'")
        # Provenance is write-once: whichever model wrote a message and the
        # folder it arrived in can never be changed afterwards.
        c.executescript(
            """
            CREATE TRIGGER IF NOT EXISTS messages_provenance_locked
            BEFORE UPDATE OF model, folder, source, role ON messages
            BEGIN
              SELECT RAISE(ABORT, 'message provenance (model/folder) is permanent');
            END;
            """
        )


# ------------------------------ messages ------------------------------

def add_message(msg_id, role, source, content, folder="inbox", client_id=None, created_at="", error=False, model=None):
    """Returns False when a message with this client_id already exists.

    model is the lane that actually generated the text; it defaults to source
    for assistant messages so every AI-written message is stamped.
    """
    if role == "assistant" and not model:
        model = source
    with _lock, _conn() as c:
        cur = c.execute(
            "INSERT OR IGNORE INTO messages (id, role, source, content, folder, client_id, created_at, ts, error, model)"
            " VALUES (?,?,?,?,?,?,?,?,?,?)",
            (msg_id, role, source, content, folder or "inbox", client_id, created_at, time.time(), int(error), model),
        )
        return cur.rowcount == 1


def get_message_by_client_id(client_id):
    with _lock, _conn() as c:
        row = c.execute(
            "SELECT id, role, source, content, content AS body, folder, client_id, created_at"
            " FROM messages WHERE client_id = ?",
            (client_id,),
        ).fetchone()
    return dict(row) if row else None


def get_messages(limit=75):
    with _lock, _conn() as c:
        rows = c.execute(
            "SELECT id, role, source, model, content, content AS body, folder, created_at, error"
            " FROM messages ORDER BY ts DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [dict(r) for r in reversed(rows)]


def get_context_for_lane(lane_id, exclude_id=None, limit=20):
    """User messages + this lane's own successful replies, oldest first — the lane's memory of the chat.

    Error replies are skipped so they never get fed back to the model, and
    consecutive same-role turns are merged so strict providers accept the history.
    """
    with _lock, _conn() as c:
        rows = c.execute(
            "SELECT role, content FROM messages"
            " WHERE (role = 'user' OR (source = ? AND error = 0)) AND id != ?"
            " ORDER BY ts DESC LIMIT ?",
            (lane_id, exclude_id or "", limit),
        ).fetchall()
    out = []
    for r in reversed(rows):
        role = "user" if r["role"] == "user" else "assistant"
        if out and out[-1]["role"] == role:
            out[-1]["content"] += "\n\n" + r["content"]
        else:
            out.append({"role": role, "content": r["content"]})
    while out and out[0]["role"] != "user":
        out.pop(0)
    return out


def update_message(msg_id, patch):
    # folder/model/source are provenance and never change — see the trigger in init_db
    allowed = {"content": "content"}
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


def count_messages():
    with _lock, _conn() as c:
        return c.execute("SELECT COUNT(*) FROM messages").fetchone()[0]


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
        # Quote each word so punctuation (apostrophes, hyphens) can't break FTS5 syntax
        terms = " ".join('"' + w.replace('"', '""') + '"' for w in query.split())
        if terms:
            rows = c.execute(
                "SELECT k.id, k.lane, k.path, k.chunk, k.ts FROM knowledge k"
                " JOIN knowledge_fts f ON k.id = f.rowid"
                " WHERE knowledge_fts MATCH ? AND (k.lane = ? OR k.lane = 'shared')"
                " ORDER BY rank LIMIT ?",
                (terms, lane, limit),
            ).fetchall()
        else:
            rows = c.execute(
                "SELECT id, lane, path, chunk, ts FROM knowledge"
                " WHERE lane = ? OR lane = 'shared' ORDER BY ts DESC LIMIT ?",
                (lane, limit),
            ).fetchall()
    return [dict(r) for r in rows]
