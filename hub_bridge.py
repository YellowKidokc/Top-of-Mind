import time
import uuid
from typing import List, Optional, Dict, Any
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Top of Mind Hub API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SOURCES = [
    {"id": "claude", "name": "Claude 3.7 Sonnet", "status": "online", "mode": "desktop"},
    {"id": "deepseek", "name": "DeepSeek R1 / V3", "status": "online", "mode": "desktop"},
    {"id": "kimi", "name": "Kimi 2.5", "status": "online", "mode": "desktop"},
    {"id": "gpt", "name": "GPT-5.4", "status": "online", "mode": "desktop"},
    {"id": "ollama", "name": "Local Ollama", "status": "online", "mode": "api"},
    {"id": "ahk", "name": "AutoHotkey Bridge", "status": "online", "mode": "desktop"},
]

MESSAGES: List[Dict[str, Any]] = []
JOB_QUEUE: List[Dict[str, Any]] = []
BRIDGE_EVENTS: List[Dict[str, Any]] = []

class MessageCreate(BaseModel):
    body: str
    folder: Optional[str] = "inbox"
    sources: Optional[List[str]] = ["claude"]
    role: Optional[str] = "user"

class AgentSendRequest(BaseModel):
    action: str = "send_to_active"
    target: Dict[str, Any]
    message: str
    folder_code: Optional[int] = 60002
    wall: Optional[str] = "main"
    route_only: Optional[bool] = False
    dry_run: Optional[bool] = False

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

@app.get("/top-of-mind/sources")
def get_sources():
    return {"sources": SOURCES}

@app.post("/top-of-mind/sources")
def create_source(source: Dict[str, Any]):
    SOURCES.append(source)
    return source

@app.get("/top-of-mind/messages")
def get_messages(limit: int = 75):
    return {"messages": MESSAGES[-limit:]}

@app.post("/top-of-mind/messages")
def create_message(msg: MessageCreate):
    msg_id = f"msg_{uuid.uuid4().hex[:8]}"
    created_at = time.strftime("%I:%M %p")
    new_msg = {
        "id": msg_id,
        "role": msg.role,
        "body": msg.body,
        "content": msg.body,
        "folder": msg.folder,
        "sources": msg.sources,
        "created_at": created_at,
        "source": "User" if msg.role == "user" else (msg.sources[0] if msg.sources else "AI"),
    }
    MESSAGES.append(new_msg)

    # Queue an AHK job for each target so AHK can paste & press enter in the respective app window
    for src in (msg.sources or ["claude"]):
        job = {
            "id": f"job_{uuid.uuid4().hex[:8]}",
            "worker": "ahk-main",
            "action": "send_to_active",
            "target": {"id": src, "name": src.capitalize()},
            "payload": {"text": msg.body},
            "status": "pending",
            "created_at": time.time(),
        }
        JOB_QUEUE.append(job)

    return new_msg

@app.post("/top-of-mind/combine")
def combine_messages(payload: Dict[str, Any]):
    summary_id = f"ai_synth_{uuid.uuid4().hex[:8]}"
    summary_msg = {
        "id": summary_id,
        "role": "assistant",
        "source": "Synthesis Hub",
        "content": "Combined synthesis across active lanes: Prompt received and coordinated.",
        "created_at": time.strftime("%I:%M %p"),
    }
    MESSAGES.append(summary_msg)
    return summary_msg

@app.post("/top-of-mind/controls/end-all")
def end_all():
    global JOB_QUEUE
    JOB_QUEUE.clear()
    return {"status": "ok", "message": "All pending jobs cleared"}

@app.post("/agents/send")
def agents_send(req: AgentSendRequest):
    job_id = f"job_{uuid.uuid4().hex[:8]}"
    job = {
        "id": job_id,
        "worker": "ahk-main",
        "action": req.action,
        "target": req.target,
        "payload": {"text": req.message},
        "status": "pending",
        "created_at": time.time(),
    }
    JOB_QUEUE.append(job)
    return {"status": "queued", "job_id": job_id, "route": "desktop", "target": req.target.get("id")}

@app.post("/bridge/jobs")
def create_bridge_job(job_req: BridgeJobCreate):
    job_id = f"bridge_{uuid.uuid4().hex[:8]}"
    job = {
        "id": job_id,
        "worker": job_req.worker,
        "action": job_req.action,
        "target": job_req.target,
        "payload": job_req.payload,
        "status": "pending",
        "created_at": time.time(),
    }
    JOB_QUEUE.append(job)
    return {"status": "queued", "job_id": job_id, "worker": job_req.worker}

@app.get("/bridge/jobs")
def get_bridge_jobs(worker: str = "ahk-main"):
    for job in JOB_QUEUE:
        if job["worker"] == worker and job["status"] == "pending":
            job["status"] = "in_progress"
            return {"status": "ok", "job": job}
    return {"status": "idle", "job": None}

@app.post("/bridge/events")
def post_bridge_event(evt: BridgeEvent):
    BRIDGE_EVENTS.append(evt.dict())
    return {"status": "recorded"}

@app.post("/bridge/heartbeat")
def bridge_heartbeat(hb: BridgeHeartbeat):
    return {"status": "ok", "lease_seconds": 30}

@app.get("/jobs/stats")
def job_stats():
    pending = sum(1 for j in JOB_QUEUE if j["status"] == "pending")
    return {
        "status": "online",
        "queue_depth": pending,
        "total_messages": len(MESSAGES),
        "total_jobs": len(JOB_QUEUE),
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
