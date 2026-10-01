# Top-of-Mind

One app for all your AIs. Send once, every model in view answers; invite any
reply into another chat, or combine replies into one answer. Every reply is
saved permanently with the model that wrote it and the folder it arrived in.

## Try it

You need **Python 3.10+** and **Node.js (LTS)** installed.

- **Windows:** double-click `Start-Top-of-Mind.bat`
- **Mac / Linux:** run `./start-top-of-mind.sh`

The first run installs everything (a minute or two); after that it starts in
seconds. Your browser opens **http://localhost:8000** (or 8001, 8002… if 8000 is
already taken — the window says which). Close the window
(or Ctrl+C) to stop.

**API keys:** the first run creates `hub/.env` — open it and paste in the keys
you have (Anthropic, OpenAI, DeepSeek, Moonshot, Gemini), then restart.
Without keys you can still try everything with the **Echo** lane: pick
"Echo (test lane)" in any column header.

Your data lives in `hub/data/topofmind.db` — back that file up.

More detail: [hub/README.md](hub/README.md).
