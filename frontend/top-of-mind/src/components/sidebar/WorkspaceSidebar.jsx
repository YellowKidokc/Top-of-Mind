import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Search, Folder, MessageSquare, Sparkles, SlidersHorizontal } from 'lucide-react';

const folderTree = [
  {
    id: 'inbox',
    name: 'Inbox',
    chats: ['Morning triage', 'Local API wiring'],
    children: [
      { id: 'research', name: 'Research', chats: ['Prompt patterns', 'RAG notes'], children: [] }
    ]
  },
  {
    id: 'projects',
    name: 'Projects',
    chats: ['Top of Mind MVP'],
    children: [
      { id: 'walls', name: 'Walls', chats: ['Wall 1 synthesis', 'Wall 2 critique', 'Wall 3 actions'], children: [] }
    ]
  },
  {
    id: 'archive',
    name: 'Archive',
    chats: ['Older experiments'],
    children: []
  }
];

function FolderNode({ node, depth = 0, query, selectedFolder, setSelectedFolder }) {
  const [open, setOpen] = useState(true);
  const chats = node.chats.filter((c) => c.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="folder-node" style={{ paddingLeft: `${depth * 10}px` }}>
      <button
        className={`folder-row ${selectedFolder === node.id ? 'selected' : ''}`}
        onClick={() => {
          setOpen(!open);
          setSelectedFolder(node.id);
        }}
      >
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <Folder size={14} className="folder-icon" />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.name}
        </span>
        <span style={{ fontSize: '10px', color: 'var(--tom-text-dim)' }}>
          {node.chats.length}
        </span>
      </button>

      {open && (
        <div>
          {chats.map((chat) => (
            <button className="chat-row" key={chat}>
              <MessageSquare size={12} style={{ opacity: 0.6 }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {chat}
              </span>
            </button>
          ))}
          {node.children.map((child) => (
            <FolderNode
              key={child.id}
              node={child}
              depth={depth + 1}
              query={query}
              selectedFolder={selectedFolder}
              setSelectedFolder={setSelectedFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function WorkspaceSidebar({
  collapsed,
  setCollapsed,
  activePanel,
  query,
  setQuery,
  selectedFolder,
  setSelectedFolder,
  onNewChat
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

  return (
    <aside className="workspace-sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">
          {activePanel === 'chats' ? 'Conversations' : activePanel}
        </span>
        <button
          className="sidebar-toggle-btn"
          title="Collapse Sidebar"
          onClick={() => setCollapsed(true)}
        >
          <span>⇤</span>
        </button>
      </div>

      {/* TypingMind Gold Pill: + New Chat */}
      <button className="new-chat" onClick={onNewChat || (() => {})}>
        <Plus size={16} />
        <span>New Chat</span>
      </button>

      {/* Search Bar with filter */}
      <div className="search-box">
        <Search size={14} style={{ color: 'var(--tom-text-dim)' }} />
        <input
          placeholder="Search chats & folders..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <SlidersHorizontal size={13} style={{ color: 'var(--tom-text-dim)', cursor: 'pointer' }} />
      </div>

      {/* Filter Tabs */}
      <div className="filter-pills">
        <button
          className={filterMode === 'all' ? 'active' : ''}
          onClick={() => setFilterMode('all')}
        >
          All
        </button>
        <button
          className={filterMode === 'pinned' ? 'active' : ''}
          onClick={() => setFilterMode('pinned')}
        >
          Pinned
        </button>
        <button
          className={filterMode === 'active' ? 'active' : ''}
          onClick={() => setFilterMode('active')}
        >
          Active
        </button>
      </div>

      {/* Folders Section */}
      {activePanel === 'chats' && (
        <section>
          <div className="sidebar-section-title">
            <span>Folders</span>
            <span>{folderTree.length}</span>
          </div>
          {folderTree.map((node) => (
            <FolderNode
              key={node.id}
              node={node}
              query={query}
              selectedFolder={selectedFolder}
              setSelectedFolder={setSelectedFolder}
            />
          ))}
        </section>
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
