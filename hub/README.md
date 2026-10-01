# Top of Mind Hub

The missing middle layer. One server that every AI talks to through APIs —
no more AutoHotkey poking desktop apps for any provider that has an API.

```
You type in the Top-of-Mind page (or the AHK input ring)
        │
        ▼
   THE HUB (this program)  ── API call ──▶  Claude / GPT / DeepSeek / Kimi / ...
        │                                      │
        │◀────────────── API reply ────────────┘
        ▼
  Answers appear in your lanes. Everything stored in SQLite.
```

## Run it tonight

```bash
cd Top-of-Mind
pip install -r hub/requirements.txt
cp hub/.env.example hub/.env     # then fill in whatever keys you have
uvicorn hub.app:app --host 0.0.0.0 --port 8000
```

Open the frontend as usual. The status dot goes from `○ Local Bridge` to
`● Live`. **With zero API keys it still works** — the `echo` lane answers so
you can prove the plumbing end-to-end.

Lanes without keys show `offline` and break nothing. Add keys as you get them.

## Lanes

Lanes are defined in `hub/lanes.yaml` — id, name, provider type, model,
which env var holds its key. The file is re-read on every send, so edits
take effect without a restart.

- `openai_compat` covers OpenAI, DeepSeek, Kimi/Moonshot, xAI, and local Ollama
- `anthropic` and `gemini` have their own adapters
- `ahk` is the holdout lane for any AI with no API: messages land in the
  bridge job queue and your AHK worker polls `GET /bridge/jobs` for them.
  That lane only runs on the server machine — never on your daily driver.

## Each AI gets its own persistent space

Every lane has three API corners it (or you) can read and write:

| Endpoint | What it is |
|---|---|
| `GET/POST /lanes/{id}/notes` | the lane's own notebook |
| `GET/PUT /lanes/{id}/clipboard` | the lane's clipboard |
| `GET/POST /lanes/{id}/knowledge?q=...` | the lane's knowledge bank (full-text search) |

Use lane id `shared` in the knowledge bank for chunks every lane can find.

## Moving to the other computer

1. Copy the repo (or just `hub/`) to the second machine
2. Run the same uvicorn command there
3. On your main machine set one variable: `VITE_TOP_OF_MIND_API=http://OTHER-MACHINE:8000`

That's the whole migration. Your computer carries nothing but a browser tab.

## How messages move

One rule underneath everything: **a message is written once, into one chat,
and never moves.** The model that wrote it and the chat and folder it arrived
in are locked by the database itself. Everything else is a pointer:

- **Send** — your message goes into the open chat with the lanes in view.
  That's a *round*; the UI shows `2/3 answered` until every lane is back.
- **Reply** — each lane answers in the background into the same chat,
  stamped with its model. Unread dots appear per model in the sidebar.
- **Invite** — put any reply into another chat. It's a link, not a copy:
  the reply still lives where it was born, and the other chat's models now
  see it as context.
- **Combine** — select replies (from any chats) or take the latest round.
  You get a new Combine chat that links exactly those replies plus the
  synthesizer lane's merged answer.
- **Model folders** — "everything Claude ever wrote" is a query, so it can
  never fall out of sync.

## Endpoints

| Endpoint | What it does |
|---|---|
| `GET/POST /folders` | list / create folders |
| `GET/POST /chats` | list chats (with unread per lane and round status) / create one |
| `PATCH /chats/{id}` | rename, change lanes |
| `GET/POST /chats/{id}/messages` | read a chat (own + invited messages) / send into it |
| `POST /chats/{id}/read` | clear unread dots |
| `POST /chats/{id}/links` | invite messages into this chat |
| `POST /combine` | `{message_ids}` or `{chat_id}` → new Combine chat |
| `GET /models/{id}/messages` | a model's folder |

Older contract, kept working: `GET /top-of-mind/sources` ·
`GET/POST /top-of-mind/messages` (no `chat_id` → the folder's *General* chat;
the AHK worker posts replies here with `role: assistant`, `chat_id`,
`parent_id` from the job payload) · `POST /top-of-mind/combine` ·
`POST /top-of-mind/controls/end-all` · `GET /health` · `GET /jobs/stats` ·
bridge endpoints.
