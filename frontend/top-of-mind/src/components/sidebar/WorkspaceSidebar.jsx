import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Search, Folder, FolderPlus, MessageSquare, Sparkles, Bot } from 'lucide-react';

// What a lane is doing in a chat's latest round
function laneState(chat, laneId) {
  const round = chat.round;
  if (!round) return null;
  if (round.pending?.includes(laneId)) return 'pending';
  if (round.failed?.includes(laneId)) return 'failed';
  return 'answered';
}

function LaneRow({ chat, laneId, sources, onSelectChat }) {
  const name = sources.find((s) => s.id === laneId)?.name || laneId;
  const unread = chat.unread?.[laneId] || 0;
  const state = laneState(chat, laneId);
  return (
    <button className="lane-row" onClick={() => onSelectChat(chat.id)} title={`${name} in “${chat.title}”`}>
      <span className={`lane-state ${state || ''}`} />
      <span className="lane-name">{name}</span>
      {state === 'pending' && <span className="lane-tag">thinking…</span>}
      {state === 'failed' && <span className="lane-tag failed">failed</span>}
      {unread > 0 && <span className="unread-dot" title={`${unread} new`}>{unread}</span>}
    </button>
  );
}

function ChatRow({ chat, active, sources, onSelectChat }) {
  const [open, setOpen] = useState(false);
  const expanded = open || active;
  const unread = Object.values(chat.unread || {}).reduce((a, b) => a + b, 0);
  const round = chat.round;
  const Icon = chat.kind === 'combine' ? Sparkles : MessageSquare;

  return (
    <div className="chat-node">
      <div className={`chat-row ${active ? 'selected' : ''}`}>
        <button
          className="chat-expand"
          title={expanded ? 'Hide models' : 'Show models in this chat'}
          onClick={() => setOpen(!open)}
          disabled={active}
        >
          {chat.lanes.length > 0 && (expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />)}
        </button>
        <button className="chat-title" onClick={() => onSelectChat(chat.id)}>
          <Icon size={12} style={{ opacity: 0.6, flexShrink: 0, color: chat.kind === 'combine' ? 'var(--tom-gold)' : undefined }} />
          <span className="chat-title-text">{chat.title}</span>
          {round && round.pending.length > 0 && (
            <span className="round-badge" title="Models that have answered the latest message">
              {round.answered}/{round.total}
            </span>
          )}
          {unread > 0 && !active && <span className="unread-dot">{unread}</span>}
        </button>
      </div>
      {expanded &&
        chat.lanes.map((laneId) => (
          <LaneRow key={laneId} chat={chat} laneId={laneId} sources={sources} onSelectChat={onSelectChat} />
        ))}
    </div>
  );
}

function FolderNode({ folder, folders, chats, depth, ...rest }) {
  const [open, setOpen] = useState(true);
  const { selectedFolder, setSelectedFolder, onNewChat, query, filterMode } = rest;
  const children = folders.filter((f) => f.parent_id === folder.id);
  const q = query.trim().toLowerCase();
  const mine = chats
    .filter((c) => c.folder === folder.id)
    .filter((c) => !q || c.title.toLowerCase().includes(q))
    .filter((c) => {
      if (filterMode === 'unread') return Object.keys(c.unread || {}).length > 0;
      if (filterMode === 'active') return c.round && c.round.pending.length > 0;
      return true;
    });

  return (
    <div className="folder-node" style={{ paddingLeft: `${depth * 10}px` }}>
      <div className={`folder-row ${selectedFolder === folder.id ? 'selected' : ''}`}>
        <button
          className="folder-toggle"
          onClick={() => {
            setOpen(!open);
            setSelectedFolder(folder.id);
          }}
        >
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          <Folder size={14} className="folder-icon" />
          <span className="chat-title-text">{folder.name}</span>
          <span style={{ fontSize: '10px', color: 'var(--tom-text-dim)' }}>{mine.length}</span>
        </button>
        <button className="folder-add" title={`New chat in ${folder.name}`} onClick={() => onNewChat(folder.id)}>
          <Plus size={12} />
        </button>
      </div>
      {open && (
        <div>
          {mine.map((chat) => (
            <ChatRow
              key={chat.id}
              chat={chat}
              active={rest.activeChatId === chat.id}
              sources={rest.sources}
              onSelectChat={rest.onSelectChat}
            />
          ))}
          {children.map((child) => (
            <FolderNode key={child.id} folder={child} folders={folders} chats={chats} depth={depth + 1} {...rest} />
          ))}
        </div>
      )}
    </div>
  );
}

export function WorkspaceSidebar({
  collapsed,
  setCollapsed,
  wide,
  setWide,
  activePanel,
  query,
  setQuery,
  selectedFolder,
  setSelectedFolder,
  folders = [],
  chats = [],
  sources = [],
  activeChatId,
  activeModel,
  onNewChat,
  onNewFolder,
  onSelectChat,
  onSelectModel
}) {
  const [filterMode, setFilterMode] = useState('all');

  if (collapsed) {
    return (
      <button
        className="sidebar-toggle-btn floating"
        title="Open Sidebar"
        onClick={() => setCollapsed(false)}
        style={{ position: 'absolute', left: '56px', top: '12px', zIndex: 10 }}
      >
        <span>⇥</span>
      </button>
    );
  }

  const roots = folders.filter((f) => !f.parent_id || !folders.some((p) => p.id === f.parent_id));
  const shared = { selectedFolder, setSelectedFolder, onNewChat, query, filterMode, activeChatId, sources, onSelectChat };

  return (
    <aside className={`workspace-sidebar ${wide ? 'wide' : ''}`}>
      <div className="sidebar-header">
        <span className="sidebar-title">
          {activePanel === 'chats' ? 'Conversations' : activePanel}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {setWide && (
            <button
              className="sidebar-toggle-btn"
              title={wide ? 'Shrink sidebar back to normal width' : 'Open sidebar further (wide)'}
              onClick={() => setWide(!wide)}
            >
              <span>⇹</span>
            </button>
          )}
          <button
            className="sidebar-toggle-btn"
            title="Shut sidebar all the way to the slim bar"
            onClick={() => setCollapsed(true)}
          >
            <span>⇤</span>
          </button>
        </div>
      </div>

      <button className="new-chat" onClick={() => onNewChat(selectedFolder)}>
        <Plus size={16} />
        <span>New Chat</span>
      </button>

      <div className="search-box">
        <Search size={14} style={{ color: 'var(--tom-text-dim)' }} />
        <input placeholder="Search chats..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="filter-pills">
        {[
          ['all', 'All'],
          ['unread', 'Unread'],
          ['active', 'Answering']
        ].map(([key, label]) => (
          <button key={key} className={filterMode === key ? 'active' : ''} onClick={() => setFilterMode(key)}>
            {label}
          </button>
        ))}
      </div>

      {activePanel === 'chats' && (
        <>
          <section>
            <div className="sidebar-section-title">
              <span>Folders</span>
              <button
                className="folder-add"
                title="New folder"
                onClick={() => {
                  const name = prompt('Folder name');
                  if (name && name.trim()) onNewFolder(name.trim());
                }}
              >
                <FolderPlus size={12} />
              </button>
            </div>
            {roots.map((folder) => (
              <FolderNode key={folder.id} folder={folder} folders={folders} chats={chats} depth={0} {...shared} />
            ))}
          </section>

          <section>
            <div className="sidebar-section-title">
              <span>Models</span>
              <span>{sources.length}</span>
            </div>
            {sources.map((s) => (
              <button
                key={s.id}
                className={`chat-row model-row ${activeModel === s.id ? 'selected' : ''}`}
                title={`Everything ${s.name} has written, from every chat`}
                onClick={() => onSelectModel(s.id)}
              >
                <Bot size={12} style={{ opacity: 0.6 }} />
                <span className="chat-title-text">{s.name}</span>
                <span className={`lane-state ${s.status === 'online' ? 'answered' : 'failed'}`} />
              </button>
            ))}
          </section>
        </>
      )}

      {activePanel === 'prompts' && (
        <section>
          <div className="sidebar-section-title">Quick Prompts</div>
          {['Summarize thread', 'Extract actions', 'Compare AIs', 'Draft reply'].map((p) => (
            <button className="panel-row" key={p}>
              <Sparkles size={13} style={{ color: 'var(--tom-gold)' }} />
              <span>{p}</span>
            </button>
          ))}
        </section>
      )}

      {activePanel === 'knowledge' && (
        <section>
          <div className="sidebar-section-title">Knowledge Base</div>
          <p style={{ fontSize: '12px', color: 'var(--tom-text-dim)', margin: '8px 0' }}>
            Reference sources, embeddings, and vault notes.
          </p>
        </section>
      )}
    </aside>
  );
}
