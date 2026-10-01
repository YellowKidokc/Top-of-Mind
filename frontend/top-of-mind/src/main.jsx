import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Columns3, Send, Paperclip, Sparkles, XCircle } from 'lucide-react';
import { IconRail } from './components/sidebar/IconRail';
import { WorkspaceSidebar } from './components/sidebar/WorkspaceSidebar';
import { RightRail } from './components/rightdock/RightRail';
import { RightDockPanel } from './components/rightdock/RightDockPanel';
import { KnowledgePanel } from './components/knowledge/KnowledgePanel';
import { PromptsPanel } from './components/prompts/PromptsPanel';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { ModelsPanel } from './components/models/ModelsPanel';
import { PluginsPanel } from './components/plugins/PluginsPanel';
import { AgentsPanel } from './components/agents/AgentsPanel';
import { NotepadPanel } from './components/notepad/NotepadPanel';
import { RagVectorPanel } from './components/rag/RagVectorPanel';
import { MessageCard } from './components/chat/MessageCard';
import { topOfMindApi } from './lib/api/topOfMindApi';
import './styles.css';

// Shown only while the hub is unreachable
const fallbackSources = [
  { id: 'claude', name: 'Claude', status: 'offline' },
  { id: 'gpt', name: 'GPT', status: 'offline' },
  { id: 'deepseek', name: 'DeepSeek', status: 'offline' },
  { id: 'kimi', name: 'Kimi', status: 'offline' },
  { id: 'gemini', name: 'Gemini', status: 'offline' },
  { id: 'ollama', name: 'Local Ollama', status: 'offline' },
  { id: 'echo', name: 'Echo (test lane)', status: 'offline' }
];

// Poll fast while any model is still answering, slower when everything is quiet
const POLL_BUSY_MS = 1000;
const POLL_IDLE_MS = 3000;
const timeNow = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function App() {
  const [sources, setSources] = useState(fallbackSources);
  const [folders, setFolders] = useState([]);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  // When set, the main area shows that model's folder instead of a chat
  const [activeModel, setActiveModel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [round, setRound] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [activePanel, setActivePanel] = useState('chats');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWide, setSidebarWide] = useState(false);

  // Symmetric right dock: slim rail always visible, panel 3-state
  // 'open' | 'wide' | 'collapsed'
  const [rightPanelState, setRightPanelState] = useState('open');
  const [rightTab, setRightTab] = useState('convergence');
  const [quickSettings, setQuickSettings] = useState(() => {
    const defaults = { compactCards: false, confirmEndAll: true };
    try {
      const { autoCombine, ...saved } = JSON.parse(localStorage.getItem('tom.quickSettings') || '{}');
      return { ...defaults, ...saved };
    } catch {
      return defaults;
    }
  });
  useEffect(() => {
    try { localStorage.setItem('tom.quickSettings', JSON.stringify(quickSettings)); } catch { /* storage unavailable */ }
  }, [quickSettings]);
  const [selectedFolder, setSelectedFolder] = useState('inbox');
  const [online, setOnline] = useState(false);
  const [status, setStatus] = useState('');

  // 'single' | 'split-3' | 'split-4' | 'top-grid'
  const [splitMode, setSplitMode] = useState('split-3');
  const [columnModels, setColumnModels] = useState({ col0: 'claude', col1: 'deepseek', col2: 'kimi', col3: 'gpt' });

  const activeChat = chats.find((c) => c.id === activeChatId) || null;
  const sourceName = useCallback((id) => sources.find((s) => s.id === id)?.name || id, [sources]);

  const visibleLanes = useMemo(() => {
    if (splitMode === 'single') return [columnModels.col0];
    if (splitMode === 'split-3') return [columnModels.col0, columnModels.col1, columnModels.col2];
    return [columnModels.col0, columnModels.col1, columnModels.col2, columnModels.col3];
  }, [splitMode, columnModels]);

  // ------------------------------ loading ------------------------------

  const refreshChats = useCallback(async () => {
    const d = await topOfMindApi.getChats();
    setChats(d.chats || []);
    return d.chats || [];
  }, []);

  const loadView = useCallback(async () => {
    if (activeModel) {
      const d = await topOfMindApi.getModelMessages(activeModel);
      setMessages(d.messages || []);
      setRound(null);
    } else if (activeChatId) {
      const d = await topOfMindApi.getChatMessages(activeChatId);
      setMessages(d.messages || []);
      setRound(d.round || null);
    }
  }, [activeChatId, activeModel]);

  // First load: lanes, folders, chats — open the most recent chat (or make one)
  useEffect(() => {
    (async () => {
      try {
        const [s, f, list] = await Promise.all([
          topOfMindApi.getSources(),
          topOfMindApi.getFolders(),
          topOfMindApi.getChats()
        ]);
        if (s.sources?.length) setSources(s.sources);
        setFolders(f.folders || []);
        let all = list.chats || [];
        if (!all.length) {
          const fresh = await topOfMindApi.createChat({ folder: 'inbox', lanes: [] });
          all = [fresh];
        }
        setChats(all);
        setActiveChatId(all[0].id);
        setSelectedFolder(all[0].folder);
        setOnline(true);
      } catch (e) {
        setOnline(false);
        setStatus(`Hub not reachable (${e.message}) — local preview only.`);
      }
    })();
  }, []);

  const busy = chats.some((c) => c.round && c.round.pending.length > 0);

  // Keep the sidebar dots and the open view live
  useEffect(() => {
    if (!online) return undefined;
    let stopped = false;
    const tick = async () => {
      try {
        await Promise.all([refreshChats(), loadView()]);
      } catch {
        /* transient — next tick retries */
      }
    };
    tick();
    const id = setInterval(() => { if (!stopped) tick(); }, busy ? POLL_BUSY_MS : POLL_IDLE_MS);
    return () => { stopped = true; clearInterval(id); };
  }, [online, busy, refreshChats, loadView]);

  // Looking at a chat clears its unread dots
  useEffect(() => {
    if (online && activeChat && !activeModel && Object.keys(activeChat.unread || {}).length) {
      topOfMindApi.markRead(activeChat.id).catch(() => {});
    }
  }, [online, activeChat, activeModel]);

  // ------------------------------ navigation ------------------------------

  function openChat(chatId, known) {
    const chat = known || chats.find((c) => c.id === chatId);
    setActiveModel(null);
    setActiveChatId(chatId);
    setSelectedIds(new Set());
    setActivePanel('chats');
    setMessages([]);
    if (chat) {
      setSelectedFolder(chat.folder);
      // Columns follow the chat's lanes
      const lanes = chat.lanes || [];
      if (lanes.length) {
        setColumnModels((prev) => ({
          col0: lanes[0] || prev.col0,
          col1: lanes[1] || prev.col1,
          col2: lanes[2] || prev.col2,
          col3: lanes[3] || prev.col3
        }));
        setSplitMode(lanes.length === 1 ? 'single' : lanes.length <= 3 ? 'split-3' : 'split-4');
      }
    }
  }

  function openModel(modelId) {
    setActiveModel(modelId);
    setSelectedIds(new Set());
    setActivePanel('chats');
    setMessages([]);
  }

  async function handleNewChat(folderId) {
    try {
      const chat = await topOfMindApi.createChat({ folder: folderId || selectedFolder, lanes: [] });
      setChats((prev) => [chat, ...prev]);
      setActiveModel(null);
      setActiveChatId(chat.id);
      setSelectedFolder(chat.folder);
      setMessages([]);
      setRound(null);
      setSelectedIds(new Set());
    } catch (e) {
      setStatus(`Couldn't create chat: ${e.message}`);
    }
  }

  async function handleNewFolder(name) {
    try {
      const folder = await topOfMindApi.createFolder(name);
      setFolders((prev) => [...prev, folder]);
      setSelectedFolder(folder.id);
    } catch (e) {
      setStatus(`Couldn't create folder: ${e.message}`);
    }
  }

  // ------------------------------ actions ------------------------------

  async function handleSend() {
    if (!input.trim() || activeModel) return;
    const text = input.trim();
    setInput('');
    const targets = [...new Set(visibleLanes.filter(Boolean))];
    const clientId = `usr-${Date.now()}`;

    // Optimistic: show your message right away; the poll replaces it with the stored one
    setMessages((prev) => [
      ...prev,
      { id: clientId, role: 'user', content: text, created_at: timeNow(), source: 'User' }
    ]);

    if (!online || !activeChatId) {
      targets.forEach((src, idx) => {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `ai-${Date.now()}-${idx}`,
              role: 'assistant',
              source: src,
              model: src,
              content: `[${src.toUpperCase()}] preview reply — start the hub for real answers.`,
              created_at: timeNow()
            }
          ]);
        }, (idx + 1) * 350);
      });
      return;
    }

    try {
      await topOfMindApi.sendToChat(activeChatId, { body: text, sources: targets, client_id: clientId });
      await Promise.all([refreshChats(), loadView()]);
    } catch (e) {
      setStatus(`Send failed: ${e.message}`);
    }
  }

  // Combine: the selected replies if any, otherwise the latest round of this chat.
  // Either way the result is a new Combine chat that links back to its inputs.
  async function handleCombine(useSelection = selectedIds.size > 0) {
    if (!online) {
      setStatus('Combine needs the hub.');
      return;
    }
    try {
      const payload = useSelection && selectedIds.size
        ? { message_ids: [...selectedIds] }
        : { chat_id: activeChatId };
      const chat = await topOfMindApi.combine(payload);
      setSelectedIds(new Set());
      await refreshChats();
      openChat(chat.id, chat);
      setStatus('');
    } catch (e) {
      setStatus(`Combine: ${e.message}`);
    }
  }

  async function handleInvite(message, chatId) {
    try {
      let targetId = chatId;
      if (chatId === '__new__') {
        const chat = await topOfMindApi.createChat({
          title: `On ${sourceName(message.model || message.source)}'s reply`,
          folder: selectedFolder,
          lanes: []
        });
        targetId = chat.id;
      }
      await topOfMindApi.invite(targetId, [message.id]);
      const list = await refreshChats();
      const title = list.find((c) => c.id === targetId)?.title || 'chat';
      setStatus(`Invited into “${title}” — it still lives here too.`);
      if (chatId === '__new__') openChat(targetId, list.find((c) => c.id === targetId));
    } catch (e) {
      setStatus(`Invite failed: ${e.message}`);
    }
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Right rail mirrors the left: icon opens the dock, active icon shuts it.
  function handleRightRailSelect(tab) {
    if (tab === rightTab && rightPanelState !== 'collapsed') {
      setRightPanelState('collapsed');
    } else {
      setRightTab(tab);
      if (rightPanelState === 'collapsed') setRightPanelState('open');
    }
  }

  function handleRailSelect(key) {
    if (key === activePanel) {
      setSidebarCollapsed((c) => !c);
    } else {
      setActivePanel(key);
      setSidebarCollapsed(false);
    }
  }

  // ------------------------------ rendering ------------------------------

  const filteredMessages = useMemo(() => {
    if (!query.trim()) return messages;
    return messages.filter((m) => (m.content || m.body || '').toLowerCase().includes(query.toLowerCase()));
  }, [messages, query]);

  const card = (m, i) => (
    <MessageCard
      key={`${m.id || i}${m.linked ? '-link' : ''}`}
      message={m}
      sourceName={m.role === 'assistant' ? sourceName(m.model || m.source) : undefined}
      chats={chats}
      currentChatId={activeChatId}
      onInvite={online && m.role === 'assistant' ? handleInvite : undefined}
      selectable={online}
      selected={selectedIds.has(m.id)}
      onToggleSelect={toggleSelect}
      onOpenChat={openChat}
    />
  );

  const viewTitle = activeModel
    ? `${sourceName(activeModel)} — everything it has written`
    : activeChat?.title || 'Top of Mind';

  const combineLabel = selectedIds.size
    ? `Combine ${selectedIds.size} selected`
    : round && round.total
      ? `Combine · ${round.answered}/${round.total} answered`
      : 'Combine';

  return (
    <div className="app">
      <IconRail activePanel={activePanel} setActivePanel={handleRailSelect} sources={sources} />

      <WorkspaceSidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        wide={sidebarWide}
        setWide={setSidebarWide}
        activePanel={activePanel}
        query={query}
        setQuery={setQuery}
        selectedFolder={selectedFolder}
        setSelectedFolder={setSelectedFolder}
        folders={folders}
        chats={chats}
        sources={sources}
        activeChatId={activeModel ? null : activeChatId}
        activeModel={activeModel}
        onNewChat={handleNewChat}
        onNewFolder={handleNewFolder}
        onSelectChat={openChat}
        onSelectModel={openModel}
      />

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <h1>{viewTitle}</h1>
            <span className={`topbar-status ${online ? 'online' : ''}`}>
              {online ? '● Live' : '○ Hub offline'}
            </span>
          </div>

          {activePanel === 'chats' && !activeModel && (
            <div className="split-controls">
              {[
                ['single', 'Single'],
                ['split-3', 'Split 3'],
                ['split-4', 'Split 4'],
                ['top-grid', 'Top Grid']
              ].map(([key, label]) => (
                <button
                  key={key}
                  className={`split-btn ${splitMode === key ? 'active' : ''}`}
                  onClick={() => setSplitMode(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </header>

        {status && (
          <div className="status-strip" onClick={() => setStatus('')} title="Click to dismiss">
            {status}
          </div>
        )}

        {activePanel === 'knowledge' && <KnowledgePanel />}
        {activePanel === 'notepad' && <NotepadPanel onSendToComposer={(text) => { setInput(text); setActivePanel('chats'); }} />}
        {activePanel === 'rag' && <RagVectorPanel />}
        {activePanel === 'prompts' && <PromptsPanel onCopyToComposer={(p) => { setInput(p); setActivePanel('chats'); }} />}
        {activePanel === 'settings' && <SettingsPanel />}
        {activePanel === 'models' && <ModelsPanel />}
        {activePanel === 'plugins' && <PluginsPanel />}
        {activePanel === 'agents' && <AgentsPanel />}

        {activePanel === 'chats' && (
          <div className={`stream-container ${quickSettings.compactCards ? 'compact-cards' : ''}`}>
            {/* A model's folder: one stream, every reply it wrote, each tagged with its chat */}
            {activeModel && (
              <div className="column-stream" style={{ flex: 1, padding: '20px' }}>
                {filteredMessages.length === 0 ? (
                  <div className="empty-canvas">
                    <p>{sourceName(activeModel)} hasn't written anything yet.</p>
                  </div>
                ) : (
                  filteredMessages.map(card)
                )}
              </div>
            )}

            {!activeModel && (splitMode === 'split-3' || splitMode === 'split-4') && (
              <div className="split-columns">
                {[0, 1, 2, ...(splitMode === 'split-4' ? [3] : [])].map((colIndex) => {
                  const colKey = `col${colIndex}`;
                  const currentModel = columnModels[colKey];
                  // Each column shows your messages and its model's replies. Anything
                  // that belongs to no visible column (invited messages, other
                  // models) shows in the first column so nothing is ever hidden.
                  const colMessages = filteredMessages.filter((m) => {
                    if (m.role === 'user' && !m.linked) return true;
                    const who = m.model || m.source;
                    if (!m.linked && who === currentModel) return true;
                    return colIndex === 0 && (m.linked || !who || !visibleLanes.includes(who));
                  });

                  return (
                    <div className="split-column" key={colKey}>
                      <div className="split-column-header">
                        <select
                          className="column-model-select"
                          value={currentModel}
                          onChange={(e) => setColumnModels((prev) => ({ ...prev, [colKey]: e.target.value }))}
                        >
                          {sources.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '11px', color: 'var(--tom-text-dim)' }}>
                            {round?.pending?.includes(currentModel) ? 'thinking…' : `Lane ${colIndex + 1}`}
                          </span>
                          <button
                            className="sidebar-toggle-btn"
                            title={`Remove ${currentModel} from this view`}
                            style={{ padding: '2px 5px', fontSize: '11px', color: 'var(--tom-text-dim)' }}
                            onClick={() => {
                              if (splitMode === 'split-4' && colIndex === 3) setSplitMode('split-3');
                              else if (splitMode === 'split-3' && colIndex === 2) setSplitMode('single');
                              else setColumnModels((prev) => ({ ...prev, [colKey]: 'ollama' }));
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      <div className="column-stream">
                        {colMessages.length === 0 ? (
                          <div className="empty-canvas" style={{ padding: '20px' }}>
                            <p>Ready for prompt.</p>
                          </div>
                        ) : (
                          colMessages.map(card)
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!activeModel && splitMode === 'top-grid' && (
              <div className="top-grid-container">
                <div className="top-grid-boxes">
                  {visibleLanes.map((mKey) => {
                    const last = [...messages].reverse().find((m) => (m.model || m.source) === mKey && !m.linked);
                    return (
                      <div className="pinned-box" key={mKey}>
                        <div className="pinned-box-header">
                          <span>{sourceName(mKey)}</span>
                          <span>{round?.pending?.includes(mKey) ? 'thinking…' : last ? last.created_at : '—'}</span>
                        </div>
                        <p>{last ? (last.content || '').slice(0, 160) : 'No reply yet.'}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="column-stream" style={{ flex: 1 }}>
                  {filteredMessages.map(card)}
                </div>
              </div>
            )}

            {!activeModel && splitMode === 'single' && (
              <div className="column-stream" style={{ flex: 1, padding: '20px' }}>
                {filteredMessages.length === 0 ? (
                  <div className="empty-canvas">
                    <h2>{activeChat?.kind === 'combine' ? 'Combining…' : 'Welcome to Top of Mind'}</h2>
                    <p>Send once, every model in view answers. Invite any reply into another chat, or select replies and Combine.</p>
                  </div>
                ) : (
                  filteredMessages.map(card)
                )}
              </div>
            )}
          </div>
        )}

        <footer className="composer-area">
          <div className="composer-toolbar">
            <div className="composer-left-actions">
              <button
                className={`action-pill-btn ${round && round.pending?.length === 0 && round.total ? 'ready' : ''}`}
                onClick={() => handleCombine()}
                disabled={!!activeModel && !selectedIds.size}
                title={selectedIds.size
                  ? 'Combine the replies you selected into a new chat'
                  : 'Combine the latest round of replies into a new chat'}
              >
                <Sparkles size={12} />
                <span>{combineLabel}</span>
              </button>
              {selectedIds.size > 0 && (
                <button className="action-pill-btn" onClick={() => setSelectedIds(new Set())} title="Clear selection">
                  Clear selection
                </button>
              )}
              <button
                className="action-pill-btn"
                onClick={() => setSplitMode(splitMode === 'split-3' ? 'split-4' : 'split-3')}
                title="Toggle Split Multi-Columns"
              >
                <Columns3 size={12} />
                <span>Multi-Model</span>
              </button>
              <button
                className="action-pill-btn danger"
                onClick={() => {
                  if (!quickSettings.confirmEndAll || confirm('Cancel all queued desktop-bridge jobs?')) {
                    topOfMindApi.endAll()
                      .then(() => setStatus('Queued desktop jobs cancelled. Your messages are kept.'))
                      .catch(() => { /* hub offline: nothing queued */ });
                  }
                }}
                title="Cancel queued desktop-bridge jobs (messages are always kept)"
              >
                <XCircle size={12} />
                <span>Cancel jobs</span>
              </button>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--tom-text-dim)' }}>
              Folder: <b>{folders.find((f) => f.id === selectedFolder)?.name || selectedFolder}</b> · Sending to:{' '}
              <b>{activeModel ? '—' : [...new Set(visibleLanes)].map(sourceName).join(', ')}</b>
            </div>
          </div>

          <div className="composer-input-row">
            <button className="sidebar-toggle-btn" title="Attach File" style={{ padding: '6px', color: 'var(--tom-text-dim)' }}>
              <Paperclip size={16} />
            </button>
            <textarea
              value={input}
              disabled={!!activeModel}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={activeModel
                ? 'This is a model folder — open a chat to send.'
                : 'Message every model in view… (Enter to send, Shift+Enter for new line)'}
            />
            <button className="send-btn" onClick={handleSend} disabled={!input.trim() || !!activeModel} title="Send to every model in view">
              <Send size={14} style={{ display: 'inline', marginRight: '4px' }} />
              Send
            </button>
          </div>
        </footer>
      </main>

      {rightPanelState !== 'collapsed' && (
        <RightDockPanel
          tab={rightTab}
          setTab={setRightTab}
          state={rightPanelState}
          setState={setRightPanelState}
          sources={sources}
          columnModels={columnModels}
          setColumnModels={setColumnModels}
          splitMode={splitMode}
          setSplitMode={setSplitMode}
          selectedFolder={selectedFolder}
          activeChat={activeChat?.title || '—'}
          onCombine={() => handleCombine(false)}
          onJoin={() => (selectedIds.size ? handleCombine(true) : setStatus('Select replies first (☐ on each card).'))}
          selectedCount={selectedIds.size}
          quickSettings={quickSettings}
          setQuickSettings={setQuickSettings}
          onOpenFullSettings={() => {
            setActivePanel('settings');
            setSidebarCollapsed(false);
          }}
        />
      )}

      <RightRail activeTab={rightTab} panelOpen={rightPanelState !== 'collapsed'} onSelect={handleRightRailSelect} />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
