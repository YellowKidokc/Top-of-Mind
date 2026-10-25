# BUILD PACKAGE: One System (Top-of-Mind on the OpenCovibe fork)
POF 2828 | Oct 25, 2026 | hand this whole file to Claude Code

## The goal in one sentence
One desktop app David talks to instead of five or six: every AI in it, conversation rooms with real turn rules, a knowledge base underneath, and Top-of-Mind's panels and prompts on the side.

## Repos
- **Base (already forked):** github.com/YellowKidokc/OpenCovibe, from AnyiWang/OpenCovibe (Apache-2.0; Tauri v2 + Svelte 5 + Rust). Keep LICENSE and NOTICE; credit OpenCovibe in the README. Do not remove OpenCovibe features.
- **Feature source:** github.com/YellowKidokc/Top-of-Mind (local: D:\GitHub\Top-of-Mind). Carry over its design, panels, prompts, and docs. Its React code is reference; rebuild it in the fork's Svelte style.
- Work on a new branch `tom2` in the fork. Small commits, one per panel or feature.

## Architecture rules (non-negotiable)
1. Agent sessions (Claude Code, Codex) run exactly as OpenCovibe runs them.
2. **Every new model/API call goes through Forge** at http://127.0.0.1:2829 (David's AI-call service, repo Rust_AI_API). No API keys stored in this app; grep must confirm.
3. Background/overnight jobs belong to Rust_Idle_Runner. This app may show and queue them; it runs no scheduler of its own.
4. Vectors live in CocoIndex -> NAS Postgres (192.168.1.177:2665). This app only queries them.
5. App data lives in ~/.top-of-mind/ with JSONL event logs as the source of truth (OpenCovibe's pattern).

## STEP 0: Read receipt, then STOP
List: OpenCovibe's module map (src-tauri commands, Svelte routes, storage); every Top-of-Mind panel and what it does (from the files below); which Top-of-Mind features OpenCovibe already covers; which are new. Propose the panel layout. **Stop for David's approval.**

Top-of-Mind files to read:
- docs/UI_ARCHITECTURE_BLUEPRINT.md (layout and look: keep it)
- docs/ahk-react-api-contract.md (the existing AutoHotkey relay contract)
- docs/SYSTEM_ARCHITECTURE_SPEC.md if present (routing, workspaces, RAG, canon)
- frontend/top-of-mind/src/components/: sidebar/IconRail, sidebar/WorkspaceSidebar, prompts/PromptsPanel, agents/AgentsPanel, knowledge/KnowledgePanel, rag/RagVectorPanel, models/ModelsPanel, plugins/PluginsPanel, notepad/NotepadPanel, settings/SettingsPanel, chat/MessageCard
- hub_bridge.py and any prompt data files

## STEP 1: Top-of-Mind's shell on the side
Rebuild Top-of-Mind's **icon rail and workspace sidebar** in the fork, with these side panels, each matching the blueprint's look:
- **Prompts:** David's full prompt library carried over intact, with tags, search, variables, and one-click insert into any room.
- **Agents:** saved AI personas/roles (merge with OpenCovibe's agent editor rather than duplicating it).
- **Knowledge / RAG:** real search over the CocoIndex collections via Forge (replace the old mocked RagVectorPanel behavior); attach results to a message or a room.
- **Models:** which AIs are available and how each is reached (CLI, Forge API, or relay).
- **Plugins / MCP:** fold into OpenCovibe's MCP and plugin manager.
- **Notepad:** a scratch pad per room and a global one, saved locally.
- **Settings.**

## STEP 2: Conversation rooms (the heart of it)
A room has members (any mix of AIs, plus David), a mode, an optional knowledge base, and a full log.
- **Add or remove an AI from a room at any moment,** by drag-and-drop from the Models panel. Removing an AI keeps its past messages in the log.
- **Modes** (switchable mid-room):
  - **Round:** David posts; each AI answers once, in a set order. Toggle: each AI sees the earlier answers, or not.
  - **Blind panel:** all AIs answer in parallel without seeing each other; answers reveal together. Then optional second round where each sees the others.
  - **Open floor:** any AI may answer any message, including other AIs'. Hard cap on AI-to-AI turns per David message (default 6) so nothing loops.
  - **Debate:** two named AIs alternate N rounds; the rest judge at the end.
  - **Relay:** output of AI 1 becomes input to AI 2, and so on (draft, critique, revise).
  - **Side room:** pull one AI into a private thread; bring a summary back if David chooses.
- **Room templates:** save a room's members, mode, knowledge base, and opening prompt as a reusable type ("Canon panel," "Paper review," "Debate prep").
- **Per-AI memory:** each AI keeps its own notes across rooms, private by default.
- **Export:** any room to Markdown, or straight into Forge's paper pipeline INBOX.
- Model calls for rooms go through Forge, or through the relay (step 3) for apps reached that way.

## STEP 3: The relay to the second laptop (replaces screen-typing)
A small relay service that runs on the second laptop, so subscription apps can join rooms without per-token API cost.
- **HTTP endpoint** (LAN only, token-protected): POST {ai, message, room_id} -> returns {reply}.
- **Preferred path, official CLIs:** Claude Code (`claude -p`), Codex (`codex exec`), Gemini CLI, and any other AI with a CLI, logged in with David's subscriptions. Two-way: the reply comes back automatically.
- **Second path, browser:** for AIs with no CLI, a logged-in browser driven by Playwright that types into the page's input element (not screen coordinates) and reads the finished reply from the page. Note in the README that automating consumer web apps may conflict with some providers' terms; prefer the CLI path wherever one exists.
- **Fallback:** the existing AutoHotkey relay, per docs/ahk-react-api-contract.md, upgraded to target the input box through Windows UI Automation (not screen position). One-way unless reply-reading is solved.
- The Models panel shows, per AI, which path it uses and whether the relay is reachable.

## STEP 4: Package
- Windows MSI via the fork's existing Tauri build; GitHub Actions on tag v* attaches it to a Release.
- The relay ships as its own small installer for the second laptop.

## Acceptance
- All OpenCovibe features still pass `npm run verify`.
- Every carried-over panel works; the prompt library is complete (count before and after).
- A Blind panel room with Claude (via CLI on the laptop), GPT and DeepSeek (via Forge) returns three hidden answers and reveals them together.
- An Open floor room stops at the turn cap.
- An AI can be added to and removed from a live room without losing history.
- RAG search returns real CocoIndex results inside a room.
- No API keys in the app; grep confirms.
- If any service (Forge, NAS, relay) is down, the app says which one and keeps working otherwise.

## Rules
- Delete nothing from Top-of-Mind; it stays as the reference.
- Do not re-add API calls outside Forge under another name.
- If something can't be done, say exactly what and keep building the rest.
