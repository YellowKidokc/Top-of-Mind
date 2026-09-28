"""Top of Mind Hub — the FastAPI app.

This is the missing piece: one server that every AI talks to through APIs,
so the desktop apps and AutoHotkey window-poking go away for every provider
that offers an API.

Your React frontend already speaks this exact contract — run this and the
app goes from 'Local Bridge' to 'Live' with zero frontend changes.

Run it:
    pip install -r requirements.txt
    uvicorn hub.app:app --host 0.0.0.0 --port 8000
"""

import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import adapters, db

load_dotenv(Path(__file__).parent / ".env")
db.init_db()

HUB_DIR = Path(__file__).parent
LANES_FILE = HUB_DIR / "lanes.yaml"

app = FastAPI(title="Top of Mind Hub API", version="2.0.0")
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


# ------------------------------ models ------------------------------

class MessageCreate(BaseModel):
    body: str
    folder: Optional[str] = "inbox"
    sources: Optional[List[str]] = None
    role: Optional[str] = "user"
    client_id: Optional[str] = None


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

def _run_lane(lane: Dict[str, Any], folder: str, text: str):
    """Background worker: call one AI, store its reply."""
    context = db.get_context_for_lane(lane["id"])
    ok, reply = adapters.send(lane, context, text)
    LANE_STATUS[lane["id"]] = "online" if ok else "degraded"
    db.add_message(
        msg_id=f"ai_{uuid.uuid4().hex[:10]}",
        role="assistant",
        source=lane["id"],
        content=reply,
        folder=folder,
        created_at=time.strftime("%I:%M %p"),
    )


def _fan_out(source_ids: List[str], folder: str, text: str):
    lanes = {l["id"]: l for l in load_lanes()}
    for src in source_ids:
        lane = lanes.get(src)
        if not lane:
            db.add_message(
                msg_id=f"ai_{uuid.uuid4().hex[:10]}",
                role="assistant",
                source=src,
                content=f"[unknown lane '{src}' — add it to hub/lanes.yaml]",
                folder=folder,
                created_at=time.strftime("%I:%M %p"),
            )
            continue
        if lane.get("type") == "ahk":
            # Desktop holdout: hand to the bridge worker synchronously so the
            # job id comes back in the reply text.
            _run_lane(lane, folder, text)
        else:
            executor.submit(_run_lane, lane, folder, text)


# ------------------------------ core contract ------------------------------

@app.get("/health")
def health():
    return {"status": "ok", "ts": time.time()}


@app.get("/top-of-mind/sources")
def get_sources():
    import os
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
            }
        )
    return {"sources": out}


@app.post("/top-of-mind/sources")
def create_source(source: Dict[str, Any]):
    # Runtime-added lane — written back to lanes.yaml so it survives restarts
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


@app.get("/top-of-mind/messages")
def get_messages(limit: int = 75):
    return {"messages": db.get_messages(limit)}


@app.post("/top-of-mind/messages")
def create_message(msg: MessageCreate):
    msg_id = f"msg_{uuid.uuid4().hex[:8]}"
    new_msg = {
        "id": msg_id,
        "role": msg.role,
        "body": msg.body,
        "content": msg.body,
        "folder": msg.folder,
        "client_id": msg.client_id,
        "created_at": time.strftime("%I:%M %p"),
        "source": "User" if msg.role == "user" else ((msg.sources or ["AI"])[0]),
    }
    # Idempotent: a double-fired Enter with the same client_id stores once
    db.add_message(
        msg_id=msg_id,
        role=msg.role,
        source=new_msg["source"],
        content=msg.body,
        folder=msg.folder,
        client_id=msg.client_id,
        created_at=new_msg["created_at"],
    )

    if msg.role == "user":
        targets = msg.sources or [l["id"] for l in load_lanes() if l.get("default")]
        _fan_out(targets, msg.folder, msg.body)

    return new_msg


@app.patch("/top-of-mind/messages/{msg_id}")
def patch_message(msg_id: str, patch: Dict[str, Any]):
    db.update_message(msg_id, patch)
    return {"status": "ok", "id": msg_id}


@app.post("/top-of-mind/combine")
def combine_messages(payload: Dict[str, Any]):
    folder = payload.get("folder", "inbox")
    recent = [m for m in db.get_messages(50) if m["role"] == "assistant"
              and m["source"] not in ("Synthesis Engine", "Synthesis Hub")][-12:]

    if not recent:
        summary = {
            "id": f"synth_{uuid.uuid4().hex[:8]}",
            "role": "assistant",
            "source": "Synthesis Engine",
            "content": "Nothing to combine yet — send a broadcast first.",
            "created_at": time.strftime("%I:%M %p"),
        }
        return summary

    joined = "\n\n".join(f"--- {m['source']} ---\n{m['content']}" for m in recent)
    prompt = (
        "You are the synthesis lane. Combine these AI replies into one answer: "
        "points of agreement first, then disagreements, then a single merged conclusion.\n\n"
        + joined
    )

    synth = next((l for l in load_lanes() if l.get("synthesizer")), None)
    if synth:
        ok, reply = adapters.send(synth, [], prompt)
        content = reply if ok else f"[synthesis lane offline: {reply}]\n\n{joined}"
    else:
        content = joined

    summary = {
        "id": f"synth_{uuid.uuid4().hex[:8]}",
        "role": "assistant",
        "source": "Synthesis Engine",
        "content": content,
        "created_at": time.strftime("%I:%M %p"),
    }
    db.add_message(
        msg_id=summary["id"], role="assistant", source="Synthesis Engine",
        content=content, folder=folder, created_at=summary["created_at"],
    )
    return summary


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
        "total_messages": len(db.get_messages(100000)),
        "total_jobs": len(adapters.JOB_QUEUE),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
