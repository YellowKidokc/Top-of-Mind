"""Top of Mind Hub — the FastAPI app.

One server that every AI talks to through APIs, so the desktop apps and
AutoHotkey window-poking go away for every provider that offers an API.

How a message moves:
  1. You send into a chat. Your message is stored there, with the lanes it
     went to (that's a "round").
  2. Each lane answers in the background. Its reply is written into the
     same chat, stamped with the lane's model — permanently.
  3. From there a reply can be invited into other chats (a link, never a
     copy) or combined with others into a new Combine chat that links back
     to exactly the replies it was built from.

Run it:
    pip install -r hub/requirements.txt
    uvicorn hub.app:app --host 0.0.0.0 --port 8000
"""

import os
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import adapters, db

load_dotenv(Path(__file__).parent / ".env")
db.init_db()

HUB_DIR = Path(__file__).parent
LANES_FILE = HUB_DIR / "lanes.yaml"

app = FastAPI(title="Top of Mind Hub API", version="3.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

executor = ThreadPoolExecutor(max_workers=8)

# lane_id -> 'online' | 'degraded' | 'offline' (updated after every real call)
LANE_STATUS: Dict[str, str] = {}


def load_lanes() -> List[Dict[str, Any]]:
    with open(LANES_FILE, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f) or {}
    return [l for l in cfg.get("lanes", []) if l.get("enabled", True)]


def _now():
    return time.strftime("%I:%M %p")


# ------------------------------ models ------------------------------

class MessageCreate(BaseModel):
    body: str
    folder: Optional[str] = "inbox"
    chat_id: Optional[str] = None
    parent_id: Optional[str] = None
    sources: Optional[List[str]] = None
    role: Optional[str] = "user"
    client_id: Optional[str] = None


class ChatSend(BaseModel):
    body: str
    sources: Optional[List[str]] = None
    client_id: Optional[str] = None


class ChatCreate(BaseModel):
    title: Optional[str] = "New chat"
    folder: Optional[str] = "inbox"
    lanes: Optional[List[str]] = None


class ChatUpdate(BaseModel):
    title: Optional[str] = None
    lanes: Optional[List[str]] = None


class FolderCreate(BaseModel):
    name: str
    parent_id: Optional[str] = None


class LinkCreate(BaseModel):
    message_ids: List[str]


class CombineRequest(BaseModel):
    message_ids: Optional[List[str]] = None  # explicit replies to combine...
    chat_id: Optional[str] = None            # ...or the latest round of this chat
    folder: Optional[str] = None
    title: Optional[str] = None


class NoteCreate(BaseModel):
    title: Optional[str] = ""
    body: str


class ClipboardSet(BaseModel):
    text: str


class KnowledgeAdd(BaseModel):
    path: Optional[str] = ""
    chunk: str


class BridgeJobCreate(BaseModel):
    worker: str = "ahk-main"
    action: str
    target: Optional[Dict[str, Any]] = None
    payload: Optional[Dict[str, Any]] = None
    source: Optional[str] = "react-controlbar"


class BridgeEvent(BaseModel):
    worker: str = "ahk-main"
    job_id: Optional[str] = None
    event: str
    detail: Optional[str] = None
    ok: bool = True


class BridgeHeartbeat(BaseModel):
    worker: str = "ahk-main"
    profile: Optional[str] = "TopMind"
    active_window: Optional[str] = "Top of Mind"
    version: Optional[str] = "ahk-v2"
    ts: Optional[str] = None


# ------------------------------ lane fan-out ------------------------------

def _store_reply(lane_id, chat_id, parent_id, ok, reply, kind="message"):
    db.add_message(
        msg_id=f"ai_{uuid.uuid4().hex[:10]}",
        role="assistant",
        source=lane_id,
        model=lane_id,
        content=reply,
        chat_id=chat_id,
        parent_id=parent_id,
        created_at=_now(),
        error=not ok,
        kind=kind,
    )


def _run_lane(lane: Dict[str, Any], chat_id: str, text: str, user_msg_id: str):
    """Background worker: call one AI, store its reply in the chat it was asked from."""
    try:
        context = db.get_context_for_lane(lane["id"], chat_id, exclude_id=user_msg_id)
        ok, reply = adapters.send({**lane, "_chat_id": chat_id, "_parent_id": user_msg_id}, context, text)
    except Exception as e:  # never let a lane die silently in the thread pool
        ok, reply = False, f"{type(e).__name__}: {e}"
    LANE_STATUS[lane["id"]] = "online" if ok else "degraded"
    if lane.get("type") == "ahk" and ok:
        return  # the desktop worker posts the real reply back with this chat_id/parent_id
    _store_reply(lane["id"], chat_id, user_msg_id, ok, reply)


def _fan_out(source_ids: List[str], chat_id: str, text: str, user_msg_id: str):
    lanes = {l["id"]: l for l in load_lanes()}
    for src in source_ids:
        lane = lanes.get(src)
        if not lane:
            _store_reply(src, chat_id, user_msg_id, False, f"[unknown lane '{src}' — add it to hub/lanes.yaml]")
            continue
        executor.submit(_run_lane, lane, chat_id, text, user_msg_id)


def _send_in_chat(chat_id: str, body: str, sources: Optional[List[str]], client_id: Optional[str]):
    chat = db.get_chat(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail=f"no chat '{chat_id}'")
    targets = sources or chat["lanes"] or [l["id"] for l in load_lanes() if l.get("default")]
    targets = list(dict.fromkeys(t for t in targets if t))  # de-dupe, keep order
    msg_id = f"msg_{uuid.uuid4().hex[:8]}"
    # Idempotent: a double-fired Enter with the same client_id stores once
    # and fans out once — the retry gets the original message back.
    inserted = db.add_message(
        msg_id=msg_id, role="user", source="User", content=body, chat_id=chat_id,
        client_id=client_id, created_at=_now(), targets=targets,
    )
    if not inserted:
        return db.get_message_by_client_id(client_id)

    # The chat remembers every lane that has taken part; a fresh chat takes
    # its title from the first thing you said.
    lanes = list(dict.fromkeys(chat["lanes"] + targets))
    title = body.strip().splitlines()[0][:48] if chat["title"] == "New chat" and body.strip() else None
    db.update_chat(chat_id, title=title, lanes=lanes)

    _fan_out(targets, chat_id, body, msg_id)
    return db.get_message(msg_id)


# ------------------------------ combine ------------------------------

def _combine(req: CombineRequest):
    """Make a Combine chat that links the chosen replies and asks the synthesizer to merge them."""
    if req.message_ids:
        inputs = [m for m in (db.get_message(i) for i in req.message_ids) if m]
    elif req.chat_id:
        rnd = db.chat_round(req.chat_id)
        inputs = []
        if rnd:
            inputs = [m for m in db.chat_messages(req.chat_id)
                      if m["parent_id"] == rnd["message_id"] and m["role"] == "assistant"]
    else:
        raise HTTPException(status_code=400, detail="pass message_ids or chat_id")

    inputs = [m for m in inputs if m["role"] == "assistant" and not m["error"]]
    if not inputs:
        raise HTTPException(status_code=400, detail="Nothing to combine yet — no successful replies.")

    origin = db.get_chat(inputs[0]["chat_id"]) or {}
    folder = req.folder or origin.get("folder") or "inbox"
    title = req.title or f"Combine: {origin.get('title', 'replies')}"[:60]
    synth = next((l for l in load_lanes() if l.get("synthesizer")), None)
    synth_id = synth["id"] if synth else "synthesis"

    chat = db.create_chat(title, folder=folder, lanes=[synth_id], kind="combine")
    db.add_links(chat["id"], [m["id"] for m in inputs])

    names = ", ".join(dict.fromkeys(m["model"] or m["source"] for m in inputs))
    request_id = f"msg_{uuid.uuid4().hex[:8]}"
    db.add_message(
        msg_id=request_id, role="user", source="User", chat_id=chat["id"], created_at=_now(),
        content=f"Combine {len(inputs)} replies ({names}) into one answer.", targets=[synth_id],
        kind="combine_request",
    )

    joined = "\n\n".join(f"--- {m['model'] or m['source']} ---\n{m['content']}" for m in inputs)
    prompt = (
        "Combine these AI replies into one answer: points of agreement first, "
        "then disagreements, then a single merged conclusion.\n\n" + joined
    )

    def run():
        if not synth:
            _store_reply(synth_id, chat["id"], request_id, False,
                         "No synthesizer lane — mark one lane `synthesizer: true` in hub/lanes.yaml.",
                         kind="synthesis")
            return
        try:
            ok, reply = adapters.send(synth, [], prompt)
        except Exception as e:
            ok, reply = False, f"{type(e).__name__}: {e}"
        _store_reply(synth_id, chat["id"], request_id, ok, reply, kind="synthesis")

    executor.submit(run)
    return db.get_chat(chat["id"])


# ------------------------------ health / lanes ------------------------------

@app.get("/health")
def health():
    return {"status": "ok", "ts": time.time()}


@app.get("/top-of-mind/sources")
def get_sources():
    lanes = load_lanes()
    out = []
    for lane in lanes:
        has_key = bool(os.environ.get(lane.get("api_key_env", ""), ""))
        if lane.get("type") in ("echo", "ahk"):
            status = "online"
        elif not has_key:
            status = "offline"
        else:
            status = LANE_STATUS.get(lane["id"], "online")
        out.append(
            {
                "id": lane["id"],
                "name": lane.get("name", lane["id"]),
                "status": status,
                "mode": "api" if lane.get("type") != "ahk" else "desktop",
                "synthesizer": bool(lane.get("synthesizer")),
            }
        )
    return {"sources": out}


@app.post("/top-of-mind/sources")
def create_source(source: Dict[str, Any]):
    # Runtime-added lane — written back to lanes.yaml so it survives restarts
    if not str(source.get("id", "")).strip():
        raise HTTPException(status_code=400, detail="source needs an id")
    if any(l.get("id") == source["id"] for l in load_lanes()):
        raise HTTPException(status_code=409, detail=f"lane '{source['id']}' already exists")
    lane = {
        "id": source["id"],
        "name": source.get("name", source["id"]),
        "type": source.get("type", "echo"),
        "enabled": True,
    }
    with open(LANES_FILE, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f) or {}
    cfg.setdefault("lanes", []).append(lane)
    with open(LANES_FILE, "w", encoding="utf-8") as f:
        yaml.safe_dump(cfg, f, sort_keys=False)
    return source


# ------------------------------ folders & chats ------------------------------

@app.get("/folders")
def get_folders():
    return {"folders": db.list_folders()}


@app.post("/folders")
def create_folder(req: FolderCreate):
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="folder needs a name")
    return db.add_folder(req.name.strip(), req.parent_id)


@app.get("/chats")
def get_chats():
    return {"chats": db.list_chats()}


@app.post("/chats")
def create_chat(req: ChatCreate):
    return db.create_chat(req.title, folder=req.folder, lanes=req.lanes)


@app.patch("/chats/{chat_id}")
def patch_chat(chat_id: str, req: ChatUpdate):
    if not db.get_chat(chat_id):
        raise HTTPException(status_code=404, detail=f"no chat '{chat_id}'")
    return db.update_chat(chat_id, title=req.title, lanes=req.lanes)


@app.get("/chats/{chat_id}/messages")
def get_chat_messages(chat_id: str, limit: int = 500):
    chat = db.get_chat(chat_id)
    if not chat:
        raise HTTPException(status_code=404, detail=f"no chat '{chat_id}'")
    return {"chat": chat, "round": db.chat_round(chat_id), "messages": db.chat_messages(chat_id, limit)}


@app.post("/chats/{chat_id}/messages")
def send_chat_message(chat_id: str, req: ChatSend):
    return _send_in_chat(chat_id, req.body, req.sources, req.client_id)


@app.post("/chats/{chat_id}/read")
def read_chat(chat_id: str):
    db.mark_read(chat_id)
    return {"status": "ok"}


@app.post("/chats/{chat_id}/links")
def invite_into_chat(chat_id: str, req: LinkCreate):
    """Invite existing messages into this chat. They stay where they live; this chat points at them."""
    if not db.get_chat(chat_id):
        raise HTTPException(status_code=404, detail=f"no chat '{chat_id}'")
    db.add_links(chat_id, req.message_ids)
    return {"status": "ok", "chat_id": chat_id, "linked": len(req.message_ids)}


@app.post("/combine")
def combine(req: CombineRequest):
    return _combine(req)


@app.get("/models/{model_id}/messages")
def get_model_messages(model_id: str, limit: int = 200):
    """A model's folder: every reply it has written, from every chat."""
    return {"model": model_id, "messages": db.model_messages(model_id, limit)}


# ------------------------------ legacy contract ------------------------------
# Kept so older clients and the AHK worker keep working. Messages without a
# chat land in the 'General' chat of their folder.

@app.get("/top-of-mind/messages")
def get_messages(limit: int = 75):
    return {"messages": db.get_messages(limit)}


@app.post("/top-of-mind/messages")
def create_message(msg: MessageCreate):
    chat_id = msg.chat_id or db.ensure_default_chat(msg.folder or "inbox")
    if msg.role == "user":
        return _send_in_chat(chat_id, msg.body, msg.sources, msg.client_id)
    # An assistant reply posted from outside (e.g. the AHK desktop worker)
    lane_id = (msg.sources or ["AI"])[0]
    msg_id = f"ai_{uuid.uuid4().hex[:10]}"
    inserted = db.add_message(
        msg_id=msg_id, role="assistant", source=lane_id, model=lane_id, content=msg.body,
        chat_id=chat_id, parent_id=msg.parent_id, client_id=msg.client_id, created_at=_now(),
    )
    if not inserted:
        return db.get_message_by_client_id(msg.client_id)
    return db.get_message(msg_id)


@app.patch("/top-of-mind/messages/{msg_id}")
def patch_message(msg_id: str, patch: Dict[str, Any]):
    db.update_message(msg_id, patch)
    return {"status": "ok", "id": msg_id}


@app.post("/top-of-mind/combine")
def combine_legacy(payload: Dict[str, Any]):
    chat_id = payload.get("chat_id") or db.ensure_default_chat(payload.get("folder") or "inbox")
    return _combine(CombineRequest(chat_id=chat_id, message_ids=payload.get("message_ids")))


@app.post("/top-of-mind/controls/end-all")
def end_all():
    adapters.JOB_QUEUE.clear()
    return {"status": "ok", "message": "All pending jobs cleared"}


# ------------------------------ per-lane spaces ------------------------------
# Every AI gets its own persistent corner of the hub: notes it can write,
# a clipboard, and a searchable knowledge bank. Any lane (or you) can API in.

@app.get("/lanes/{lane_id}/notes")
def lane_notes(lane_id: str, limit: int = 50):
    return {"notes": db.get_notes(lane_id, limit)}


@app.post("/lanes/{lane_id}/notes")
def lane_add_note(lane_id: str, note: NoteCreate):
    note_id = db.add_note(lane_id, note.title, note.body)
    return {"status": "ok", "id": note_id}


@app.delete("/lanes/{lane_id}/notes/{note_id}")
def lane_delete_note(lane_id: str, note_id: int):
    db.delete_note(lane_id, note_id)
    return {"status": "ok"}


@app.get("/lanes/{lane_id}/clipboard")
def lane_get_clipboard(lane_id: str):
    return db.get_clipboard(lane_id)


@app.put("/lanes/{lane_id}/clipboard")
def lane_set_clipboard(lane_id: str, body: ClipboardSet):
    db.set_clipboard(lane_id, body.text)
    return {"status": "ok"}


@app.post("/lanes/{lane_id}/knowledge")
def lane_add_knowledge(lane_id: str, item: KnowledgeAdd):
    chunk_id = db.add_knowledge(lane_id, item.path, item.chunk)
    return {"status": "ok", "id": chunk_id}


@app.get("/lanes/{lane_id}/knowledge")
def lane_search_knowledge(lane_id: str, q: str = "", limit: int = 10):
    return {"results": db.search_knowledge(lane_id, q, limit)}


# ------------------------------ AHK bridge (holdout lanes) ------------------------------
# Only used by lanes of type 'ahk' — desktop apps with no API.
# The worker polls /bridge/jobs, does its thing, and posts the AI's reply
# back through POST /top-of-mind/messages with role='assistant'.

@app.post("/bridge/jobs")
def create_bridge_job(job_req: BridgeJobCreate):
    job_id = f"bridge_{uuid.uuid4().hex[:8]}"
    adapters.JOB_QUEUE.append(
        {
            "id": job_id,
            "worker": job_req.worker,
            "action": job_req.action,
            "target": job_req.target,
            "payload": job_req.payload,
            "status": "pending",
            "created_at": time.time(),
        }
    )
    return {"status": "queued", "job_id": job_id, "worker": job_req.worker}


@app.get("/bridge/jobs")
def get_bridge_jobs(worker: str = "ahk-main"):
    for job in adapters.JOB_QUEUE:
        if job["worker"] == worker and job["status"] == "pending":
            job["status"] = "in_progress"
            return {"status": "ok", "job": job}
    return {"status": "idle", "job": None}


@app.post("/bridge/events")
def post_bridge_event(evt: BridgeEvent):
    return {"status": "recorded"}


@app.post("/bridge/heartbeat")
def bridge_heartbeat(hb: BridgeHeartbeat):
    return {"status": "ok", "lease_seconds": 30}


@app.get("/jobs/stats")
def job_stats():
    pending = sum(1 for j in adapters.JOB_QUEUE if j["status"] == "pending")
    return {
        "status": "online",
        "queue_depth": pending,
        "total_messages": db.count_messages(),
        "total_jobs": len(adapters.JOB_QUEUE),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
