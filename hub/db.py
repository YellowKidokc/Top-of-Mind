"""Top of Mind Hub — SQLite storage layer.

Everything the hub remembers lives in one file: hub/data/topofmind.db

The model in one paragraph: a message is written once, into one chat, and
never moves. Its provenance (which model wrote it, which chat and folder it
arrived in) is locked by a trigger. Everything else — inviting a reply into
another chat, combining replies, a model's "folder" — is a pointer or a
query over that one record, so nothing can fall out of sync.

  folders  — where chats live
  chats    — a conversation: title, folder, the lanes taking part
  messages — written once; chat_id / folder / model are permanent
  links    — "this message also appears in that chat" (invite, combine)
"""

import json
import os
import sqlite3
import threading
import time
import uuid

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "topofmind.db")
_lock = threading.Lock()


def _conn():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def _id(prefix):
    return f"{prefix}_{uuid.uuid4().hex[:10]}"


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

            CREATE TABLE IF NOT EXISTS folders (
              id TEXT PRIMARY KEY,
              name TEXT,
              parent_id TEXT,
              ts REAL
            );

            CREATE TABLE IF NOT EXISTS chats (
              id TEXT PRIMARY KEY,
              title TEXT,
              folder TEXT,
              lanes TEXT DEFAULT '[]',
              kind TEXT DEFAULT 'chat',
              created_ts REAL,
              updated_ts REAL,
              last_read_ts REAL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS links (
              chat_id TEXT,
              message_id TEXT,
              ts REAL,
              PRIMARY KEY (chat_id, message_id)
            );

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
        # Older databases: add the columns that came later
        cols = [r[1] for r in c.execute("PRAGMA table_info(messages)")]
        added = {
            "error": "INTEGER DEFAULT 0",
            "model": "TEXT",
            "chat_id": "TEXT",
            "parent_id": "TEXT",
            "targets": "TEXT",
            "kind": "TEXT DEFAULT 'message'",
        }
        c.execute("DROP TRIGGER IF EXISTS messages_provenance_locked")
        for col, decl in added.items():
            if col not in cols:
                c.execute(f"ALTER TABLE messages ADD COLUMN {col} {decl}")
        c.execute("UPDATE messages SET model = source WHERE role = 'assistant' AND model IS NULL")

        if not c.execute("SELECT 1 FROM folders LIMIT 1").fetchone():
            c.execute("INSERT INTO folders (id, name, parent_id, ts) VALUES ('inbox', 'Inbox', NULL, ?)", (time.time(),))

        # Messages from before chats existed go to a 'General' chat in their folder
        for (folder,) in c.execute("SELECT DISTINCT folder FROM messages WHERE chat_id IS NULL").fetchall():
            folder = folder or "inbox"
            chat_id = _ensure_default_chat(c, folder)
            c.execute("UPDATE messages SET chat_id = ? WHERE chat_id IS NULL AND (folder = ? OR folder IS NULL)",
                      (chat_id, folder))

        # Provenance is write-once: the model that wrote a message and the chat
        # and folder it arrived in can never change, whatever happens later.
        c.executescript(
            """
            CREATE TRIGGER messages_provenance_locked
            BEFORE UPDATE OF model, folder, source, role, chat_id ON messages
            BEGIN
              SELECT RAISE(ABORT, 'message provenance (model/chat/folder) is permanent');
            END;
            """
        )


# ------------------------------ folders ------------------------------

def list_folders():
    with _lock, _conn() as c:
        rows = c.execute("SELECT id, name, parent_id FROM folders ORDER BY ts").fetchall()
    return [dict(r) for r in rows]


def add_folder(name, parent_id=None):
    folder_id = _id("fld")
    with _lock, _conn() as c:
        c.execute("INSERT INTO folders (id, name, parent_id, ts) VALUES (?,?,?,?)",
                  (folder_id, name, parent_id, time.time()))
    return {"id": folder_id, "name": name, "parent_id": parent_id}


def _ensure_folder(c, folder_id):
    if not c.execute("SELECT 1 FROM folders WHERE id = ?", (folder_id,)).fetchone():
        c.execute("INSERT INTO folders (id, name, parent_id, ts) VALUES (?,?,NULL,?)",
                  (folder_id, folder_id.replace("_", " ").title(), time.time()))


# ------------------------------ chats ------------------------------

def _ensure_default_chat(c, folder):
    chat_id = f"chat_general_{folder}"
    _ensure_folder(c, folder)
    if not c.execute("SELECT 1 FROM chats WHERE id = ?", (chat_id,)).fetchone():
        now = time.time()
        c.execute(
            "INSERT INTO chats (id, title, folder, lanes, kind, created_ts, updated_ts) VALUES (?,?,?,?,?,?,?)",
            (chat_id, "General", folder, "[]", "chat", now, now),
        )
    return chat_id


def ensure_default_chat(folder="inbox"):
    with _lock, _conn() as c:
        return _ensure_default_chat(c, folder or "inbox")


def create_chat(title, folder="inbox", lanes=None, kind="chat"):
    chat_id = _id("chat")
    now = time.time()
    with _lock, _conn() as c:
        _ensure_folder(c, folder or "inbox")
        c.execute(
            "INSERT INTO chats (id, title, folder, lanes, kind, created_ts, updated_ts, last_read_ts)"
            " VALUES (?,?,?,?,?,?,?,?)",
            (chat_id, title or "New chat", folder or "inbox", json.dumps(lanes or []), kind, now, now, now),
        )
    return get_chat(chat_id)


def _chat_row(r):
    d = dict(r)
    d["lanes"] = json.loads(d.get("lanes") or "[]")
    return d


def get_chat(chat_id):
    with _lock, _conn() as c:
        r = c.execute("SELECT * FROM chats WHERE id = ?", (chat_id,)).fetchone()
    return _chat_row(r) if r else None


def update_chat(chat_id, title=None, lanes=None):
    sets, vals = ["updated_ts = ?"], [time.time()]
    if title is not None:
        sets.append("title = ?")
        vals.append(title)
    if lanes is not None:
        sets.append("lanes = ?")
        vals.append(json.dumps(lanes))
    vals.append(chat_id)
    with _lock, _conn() as c:
        c.execute(f"UPDATE chats SET {', '.join(sets)} WHERE id = ?", vals)
    return get_chat(chat_id)


def mark_read(chat_id):
    with _lock, _conn() as c:
        c.execute("UPDATE chats SET last_read_ts = ? WHERE id = ?", (time.time(), chat_id))


def _round(c, chat_id):
    """Latest user turn in a chat and how many of its lanes have answered."""
    u = c.execute(
        "SELECT id, targets FROM messages WHERE chat_id = ? AND role = 'user' AND targets IS NOT NULL"
        " ORDER BY ts DESC LIMIT 1",
        (chat_id,),
    ).fetchone()
    if not u:
        return None
    targets = json.loads(u["targets"] or "[]")
    replies = c.execute(
        "SELECT model, error FROM messages WHERE parent_id = ? AND role = 'assistant'", (u["id"],)
    ).fetchall()
    answered = {r["model"]: bool(r["error"]) for r in replies}
    return {
        "message_id": u["id"],
        "total": len(targets),
        "answered": len([t for t in targets if t in answered]),
        "failed": [t for t in targets if answered.get(t)],
        "pending": [t for t in targets if t not in answered],
    }


def list_chats():
    """Every chat with what the sidebar needs: unread per lane and round status."""
    with _lock, _conn() as c:
        chats = [_chat_row(r) for r in c.execute("SELECT * FROM chats ORDER BY updated_ts DESC").fetchall()]
        for ch in chats:
            unread = c.execute(
                "SELECT model, COUNT(*) AS n FROM messages WHERE chat_id = ? AND role = 'assistant'"
                " AND ts > ? GROUP BY model",
                (ch["id"], ch["last_read_ts"] or 0),
            ).fetchall()
            ch["unread"] = {r["model"]: r["n"] for r in unread}
            ch["round"] = _round(c, ch["id"])
            ch["message_count"] = c.execute(
                "SELECT COUNT(*) FROM messages WHERE chat_id = ?", (ch["id"],)
            ).fetchone()[0] + c.execute(
                "SELECT COUNT(*) FROM links WHERE chat_id = ?", (ch["id"],)
            ).fetchone()[0]
    return chats


def chat_round(chat_id):
    with _lock, _conn() as c:
        return _round(c, chat_id)


# ------------------------------ messages ------------------------------

_MSG_COLS = (
    "m.id, m.role, m.source, m.model, m.content, m.content AS body, m.folder, m.chat_id,"
    " m.parent_id, m.kind, m.created_at, m.ts, m.error"
)


def add_message(msg_id, role, source, content, folder=None, client_id=None, created_at="",
                error=False, model=None, chat_id=None, parent_id=None, targets=None, kind="message"):
    """Write a message into its permanent home. Returns False on a duplicate client_id.

    The folder always comes from the chat, and model defaults to source for
    assistant messages, so every AI-written message is stamped with both.
    """
    if role == "assistant" and not model:
        model = source
    with _lock, _conn() as c:
        if not chat_id:
            chat_id = _ensure_default_chat(c, folder or "inbox")
        chat = c.execute("SELECT folder FROM chats WHERE id = ?", (chat_id,)).fetchone()
        if chat:
            folder = chat["folder"]
        cur = c.execute(
            "INSERT OR IGNORE INTO messages (id, role, source, content, folder, client_id, created_at, ts,"
            " error, model, chat_id, parent_id, targets, kind) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (msg_id, role, source, content, folder or "inbox", client_id, created_at, time.time(),
             int(error), model, chat_id, parent_id,
             json.dumps(targets) if targets is not None else None, kind),
        )
        if cur.rowcount == 1:
            c.execute("UPDATE chats SET updated_ts = ? WHERE id = ?", (time.time(), chat_id))
        return cur.rowcount == 1


def get_message(msg_id):
    with _lock, _conn() as c:
        r = c.execute(f"SELECT {_MSG_COLS} FROM messages m WHERE m.id = ?", (msg_id,)).fetchone()
    return dict(r) if r else None


def get_message_by_client_id(client_id):
    with _lock, _conn() as c:
        r = c.execute(f"SELECT {_MSG_COLS} FROM messages m WHERE m.client_id = ?", (client_id,)).fetchone()
    return dict(r) if r else None


def get_messages(limit=75):
    with _lock, _conn() as c:
        rows = c.execute(f"SELECT {_MSG_COLS} FROM messages m ORDER BY m.ts DESC LIMIT ?", (limit,)).fetchall()
    return [dict(r) for r in reversed(rows)]


def count_messages():
    with _lock, _conn() as c:
        return c.execute("SELECT COUNT(*) FROM messages").fetchone()[0]


def chat_messages(chat_id, limit=500):
    """A chat's own messages plus the ones linked into it, in the order they joined the chat.

    Linked messages keep their real provenance and carry linked=True and the
    title of the chat they actually live in.
    """
    with _lock, _conn() as c:
        rows = c.execute(
            f"SELECT {_MSG_COLS}, m.ts AS sort_ts, 0 AS linked, NULL AS origin_title"
            " FROM messages m WHERE m.chat_id = ?"
            " UNION ALL "
            f"SELECT {_MSG_COLS}, l.ts AS sort_ts, 1 AS linked, oc.title AS origin_title"
            " FROM links l JOIN messages m ON m.id = l.message_id"
            " LEFT JOIN chats oc ON oc.id = m.chat_id WHERE l.chat_id = ?"
            " ORDER BY sort_ts DESC LIMIT ?",
            (chat_id, chat_id, limit),
        ).fetchall()
    out = []
    for r in reversed(rows):
        d = dict(r)
        d["linked"] = bool(d["linked"])
        out.append(d)
    return out


def model_messages(model, limit=200):
    """Everything one model has ever written, across every chat — its 'folder'."""
    with _lock, _conn() as c:
        rows = c.execute(
            f"SELECT {_MSG_COLS}, ch.title AS chat_title FROM messages m"
            " LEFT JOIN chats ch ON ch.id = m.chat_id"
            " WHERE m.model = ? AND m.role = 'assistant' ORDER BY m.ts DESC LIMIT ?",
            (model, limit),
        ).fetchall()
    return [dict(r) for r in reversed(rows)]


def add_links(chat_id, message_ids):
    now = time.time()
    with _lock, _conn() as c:
        for i, mid in enumerate(message_ids):
            home = c.execute("SELECT chat_id FROM messages WHERE id = ?", (mid,)).fetchone()
            if not home or home["chat_id"] == chat_id:
                continue  # unknown, or already lives here
            c.execute("INSERT OR IGNORE INTO links (chat_id, message_id, ts) VALUES (?,?,?)",
                      (chat_id, mid, now + i * 1e-6))
        c.execute("UPDATE chats SET updated_ts = ? WHERE id = ?", (now, chat_id))


def get_context_for_lane(lane_id, chat_id, exclude_id=None, limit=30):
    """What a lane remembers of one chat, oldest first.

    Your messages, this lane's own successful replies, and anything invited
    into the chat (shown to the lane as quoted material). Error replies never
    go back to a model, and same-role turns are merged so strict providers
    accept the history.
    """
    rows = [m for m in chat_messages(chat_id, limit=limit * 3) if m["id"] != exclude_id]
    out = []
    for m in rows:
        if m["linked"]:
            if m["error"]:
                continue
            who = m["model"] or m["source"]
            role, text = "user", f"[Shared into this chat — {who}, from “{m['origin_title']}”]\n{m['content']}"
        elif m["role"] == "user":
            role, text = "user", m["content"]
        elif m["model"] == lane_id and not m["error"]:
            role, text = "assistant", m["content"]
        else:
            continue
        if out and out[-1]["role"] == role:
            out[-1]["content"] += "\n\n" + text
        else:
            out.append({"role": role, "content": text})
    out = out[-limit:]
    while out and out[0]["role"] != "user":
        out.pop(0)
    return out


def update_message(msg_id, patch):
    # chat/folder/model/source are provenance and never change — see the trigger in init_db
    if "content" not in patch:
        return
    with _lock, _conn() as c:
        c.execute("UPDATE messages SET content = ? WHERE id = ?", (patch["content"], msg_id))


def clear_messages():
    with _lock, _conn() as c:
        c.execute("DELETE FROM messages")
        c.execute("DELETE FROM links")


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
