"""Top of Mind Hub — lane adapters.

One adapter per provider type. Each takes (lane_config, context, text)
and returns (ok: bool, reply_text_or_error: str).

Lane types:
  openai_compat  — OpenAI, DeepSeek, Kimi/Moonshot, xAI, local Ollama, anything
                   that speaks /v1/chat/completions
  anthropic      — Claude via the Messages API
  gemini         — Google Gemini via generateContent
  echo           — offline test lane, no key needed, always answers
  ahk            — desktop holdout: leaves the message in the bridge job queue
                   for the AutoHotkey worker on the server machine
"""

import os
import time
import uuid

import httpx

TIMEOUT = httpx.Timeout(90.0, connect=15.0)

# The AHK job queue lives here so both the adapter and the FastAPI app share it.
JOB_QUEUE = []


def send(lane, context, text):
    lane_type = lane.get("type", "echo")
    key = os.environ.get(lane.get("api_key_env", ""), "")

    if lane_type == "echo":
        return True, f"[{lane.get('name', lane['id'])}] lane online — received: {text[:300]}"

    if lane_type == "ahk":
        job = {
            "id": f"job_{uuid.uuid4().hex[:8]}",
            "worker": lane.get("worker", "ahk-main"),
            "action": "send_to_active",
            "target": {"id": lane["id"], "name": lane.get("name", lane["id"])},
            # The worker posts its reply to POST /top-of-mind/messages with
            # role='assistant', sources=[lane id] and these ids, so the reply
            # lands in the right chat and answers the right round.
            "payload": {"text": text, "chat_id": lane.get("_chat_id"), "parent_id": lane.get("_parent_id")},
            "status": "pending",
            "created_at": time.time(),
        }
        JOB_QUEUE.append(job)
        return True, f"[queued to desktop bridge — job {job['id']}]"

    # History can end on a user turn the lane never answered (e.g. it was
    # offline); fold it into this turn so roles keep alternating.
    context = list(context)
    if context and context[-1]["role"] == "user":
        text = context.pop()["content"] + "\n\n" + text

    if not key:
        return False, f"offline — set {lane.get('api_key_env', 'API_KEY')} in hub/.env"

    try:
        if lane_type == "openai_compat":
            return _openai_compat(lane, key, context, text)
        if lane_type == "anthropic":
            return _anthropic(lane, key, context, text)
        if lane_type == "gemini":
            return _gemini(lane, key, context, text)
        return False, f"unknown lane type '{lane_type}'"
    except httpx.HTTPStatusError as e:
        return False, f"HTTP {e.response.status_code}: {e.response.text[:200]}"
    except Exception as e:  # network down, timeout, bad JSON — lane is degraded, hub stays up
        return False, f"{type(e).__name__}: {e}"


def _openai_compat(lane, key, context, text):
    base = lane.get("base_url", "https://api.openai.com/v1").rstrip("/")
    resp = httpx.post(
        f"{base}/chat/completions",
        headers={"Authorization": f"Bearer {key}"},
        json={
            "model": lane["model"],
            "messages": context + [{"role": "user", "content": text}],
        },
        timeout=TIMEOUT,
    )
    resp.raise_for_status()
    return True, resp.json()["choices"][0]["message"]["content"]


def _anthropic(lane, key, context, text):
    messages = context + [{"role": "user", "content": text}]
    resp = httpx.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        },
        json={
            "model": lane["model"],
            "max_tokens": lane.get("max_tokens", 16000),
            "messages": messages,
        },
        timeout=TIMEOUT,
    )
    resp.raise_for_status()
    data = resp.json()
    if data.get("stop_reason") == "refusal":
        return False, "refused by model"
    # Current models think by default, so content can open with a thinking
    # block — collect only the text blocks.
    text = "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text")
    return True, text


def _gemini(lane, key, context, text):
    model = lane["model"]
    history = [
        {
            "role": "user" if m["role"] == "user" else "model",
            "parts": [{"text": m["content"]}],
        }
        for m in context
    ]
    history.append({"role": "user", "parts": [{"text": text}]})
    resp = httpx.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        params={"key": key},
        json={"contents": history},
        timeout=TIMEOUT,
    )
    resp.raise_for_status()
    return True, resp.json()["candidates"][0]["content"]["parts"][0]["text"]
