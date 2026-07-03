# Top of Mind - Command Desk

A unified AI command desk frontend built with React + Vite + Tailwind CSS. Dark theme inspired by [faiththruphysics.com](https://faiththruphysics.com/).

## Quick Start

```bash
npm install
npm run dev
```

The dev server will start (typically on `http://localhost:5173`).

## Build

```bash
npm run build
```

Output goes to `dist/` — static files ready to serve.

## API Configuration

The frontend connects to the Top of Mind API backend:

- **Default**: `http://127.0.0.1:10000`
- **Env override**: Set `VITE_TOP_OF_MIND_API=http://your-api:port`
- **Runtime override**: Change in Settings panel (saved to localStorage)

## Structure

```
src/
  components/
    sidebar/       IconRail + Sidebar (chats, prompts, agents, etc.)
    funnel/        FunnelSidebar (routing/control)
    chat/          ChatArea + CommandBar + Composer
    knowledge/     KnowledgePanel (memory search/add)
    markdown/      MarkdownWorkspace (editor + preview)
    files/         FileSearchPanel (cached file search)
    operator/      OperatorPanel (file actions + commands)
    settings/      SettingsPanel (API URL + integrations)
  store/
    AppContext.tsx  Global state + API loader functions
  lib/
    api/client.ts   API client (all endpoints)
    numbering/codes.ts  Source/type/priority/wall/folder codes
  types/index.ts   TypeScript types
```

## Wired API Endpoints

| Feature | Endpoints |
|---------|-----------|
| **Folders** | `GET /folders`, `POST /folders`, `GET /folders/{id}`, `PATCH /folders/{id}/archive` |
| **Messages** | `GET /top-of-mind/messages?limit=75`, `POST /top-of-mind/messages`, `PATCH /top-of-mind/messages/{id}`, `POST /top-of-mind/combine`, `POST /top-of-mind/controls/end-all` |
| **Sources** | `GET /top-of-mind/sources`, `POST /top-of-mind/sources` |
| **Knowledge** | `GET /memory/items`, `POST /memory/items`, `GET /memory/search?q=...`, `GET /memory/search?q=...&mode=vector`, `POST /memory/embed-pending` |
| **Files** | `GET /files/cache`, `GET /files/cache/search?q=...`, `GET /files/cache/by-path?path=...`, `POST /files/cache` |
| **Operator** | `POST /operator/file-actions`, `POST /operator/commands` |

## Layout

- **Far-left**: Skinny icon rail (10 views)
- **Second sidebar**: TypingMind-like (folders, search, content lists)
- **Third sidebar** (toggleable): Funnel for routing/control
- **Main area**: Chat / Knowledge / Markdown / Files / Operator / Settings
- **Bottom**: Command bar + Composer

## Integration Placeholders

- Syncthing (`http://127.0.0.1:8384`)
- Synology NAS
- Cloudflare R2
- AutoHotkey Bridge

## PWA Ready

The build produces static assets. Add a `manifest.json` and service worker when ready.
