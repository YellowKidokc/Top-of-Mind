import React, { useEffect, useMemo, useState } from 'react';
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

const fallbackSources = [
  { id: 'claude', name: 'Claude 3.7 Sonnet', status: 'online' },
  { id: 'opus', name: 'Claude 3.5 Opus', status: 'online' },
  { id: 'gemini', name: 'Gemini 3.8 Flash', status: 'online' },
  { id: 'gpt', name: 'GPT-5.4', status: 'online' },
  { id: 'deepseek', name: 'DeepSeek R1 / V3', status: 'online' },
  { id: 'kimi', name: 'Kimi 2.5', status: 'online' },
  { id: 'codex', name: 'Codex CLI / Terminal', status: 'online' },
  { id: 'ollama', name: 'Local Ollama', status: 'online' },
  { id: 'ahk', name: 'AutoHotkey Bridge', status: 'online' },
  { id: 'clipboard', name: 'Clipboard Lane', status: 'online' }
];

function App() {
  const [sources, setSources] = useState(fallbackSources);
  const [messages, setMessages] = useState([]);
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
    const defaults = { autoCombine: false, compactCards: false, confirmEndAll: true };
    try {
      const saved = JSON.parse(localStorage.getItem('tom.quickSettings') || '{}');
      return { ...defaults, ...saved };
    } catch {
      return defaults;
    }
  });
  // Persist quick settings across reloads
  useEffect(() => {
    try { localStorage.setItem('tom.quickSettings', JSON.stringify(quickSettings)); } catch { /* storage unavailable */ }
  }, [quickSettings]);
  const [selectedFolder, setSelectedFolder] = useState('inbox');
  const [activeChat, setActiveChat] = useState('Morning triage');
  const [online, setOnline] = useState(false);
  const [status, setStatus] = useState('');

  // Multi-Model Split Layout State
  // 'single' | 'split-3' | 'split-4' | 'top-grid'
  const [splitMode, setSplitMode] = useState('split-3');

  // Active models per split column
  const [columnModels, setColumnModels] = useState({
    col0: 'claude',
    col1: 'deepseek',
    col2: 'kimi',
    col3: 'gpt'
  });

  useEffect(() => {
    topOfMindApi.getSources()
      .then((d) => {
        const s = Array.isArray(d) ? d : d.sources || fallbackSources;
        if (s.length) setSources(s);
        setOnline(true);
      })
      .catch(() => {
        setOnline(false);
      });

    topOfMindApi.getMessages()
      .then((d) => {
        setMessages(Array.isArray(d) ? d : d.messages || []);
        setOnline(true);
      })
      .catch((e) => {
        setStatus(`Local mode: ${e.message}`);
        setOnline(false);
      });
  }, []);

  const filteredMessages = useMemo(() => {
    if (!query.trim()) return messages;
    return messages.filter((m) =>
      (m.content || m.body || '').toLowerCase().includes(query.toLowerCase())
    );
  }, [messages, query]);

  // Send handler: supports broadcast to multiple columns if in split mode
  async function handleSend() {
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');

    // Determine target sources based on split mode
    let targetSources = [columnModels.col0 || 'claude'];
    if (splitMode === 'split-3') {
      targetSources = [columnModels.col0, columnModels.col1, columnModels.col2];
    } else if (splitMode === 'split-4') {
      targetSources = [columnModels.col0, columnModels.col1, columnModels.col2, columnModels.col3];
    } else if (splitMode === 'top-grid') {
      targetSources = [columnModels.col0, columnModels.col1, columnModels.col2, columnModels.col3];
    }

    // Post user message
    const userMsg = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: 'User'
    };

    setMessages((prev) => [...prev, userMsg]);

    // Send payload to backend
    try {
      await topOfMindApi.createMessage({
        body: text,
        folder: selectedFolder,
        sources: targetSources,
        client_id: userMsg.id
      });

      // Hub is live: lanes answer asynchronously — poll for their replies
      let polls = 0;
      const poller = setInterval(async () => {
        polls += 1;
        try {
          const d = await topOfMindApi.getMessages();
          setMessages(Array.isArray(d) ? d : d.messages || []);
        } catch {
          clearInterval(poller);
        }
        if (polls >= 45) clearInterval(poller); // ~90s of listening
      }, 2000);
    } catch {
      // Local simulated response for preview
      targetSources.forEach((src, idx) => {
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `ai-${Date.now()}-${idx}`,
              role: 'assistant',
              source: src,
              content: `[${src.toUpperCase()}] Response to: "${text}"`,
              created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        }, (idx + 1) * 350);
      });
    }

    // Quick Setting: auto-combine after a multi-lane broadcast
    if (quickSettings.autoCombine && targetSources.length > 1) {
      handleCombine();
    }
  }

  function handleNewChat() {
    setMessages([]);
    setStatus('Started fresh conversation.');
  }

  // Left rail: clicking an icon opens its panel; clicking the active
  // icon again shuts the panel all the way back to the slim bar.
  function handleRailSelect(key) {
    if (key === activePanel) {
      setSidebarCollapsed((c) => !c);
    } else {
      setActivePanel(key);
      setSidebarCollapsed(false);
    }
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

  function handleCombine() {
    topOfMindApi.combine({ folder: selectedFolder, chat: activeChat });
    const combined = {
      id: `synth-${Date.now()}`,
      role: 'assistant',
      source: 'Synthesis Engine',
      content: `[SYNTHESIS CONVERGENCE] Merged context across all active lanes for "${activeChat}". Consensus aligned.`,
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, combined]);
  }

  function handleJoin() {
    const joined = {
      id: `join-${Date.now()}`,
      role: 'assistant',
      source: 'Lane Bridge',
      content: `Linked lane 1 and lane 2 into shared context memory.`,
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, joined]);
  }

  return (
    <div className="app">
      {/* 1. Left Icon Rail */}
      <IconRail
        activePanel={activePanel}
        setActivePanel={handleRailSelect}
        sources={sources}
      />

      {/* 2. Middle Workspace Sidebar */}
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
        onNewChat={handleNewChat}
        activeChat={activeChat}
        onSelectChat={(chatName, folderId) => {
          setActiveChat(chatName);
          setSelectedFolder(folderId);
          setActivePanel('chats');
        }}
      />

      {/* 3. Main Workspace Area */}
      <main className="main">
        {/* Top bar with Split Mode Controls */}
        <header className="topbar">
          <div className="topbar-left">
            <h1>Top of Mind</h1>
            <span className={`topbar-status ${online ? 'online' : ''}`}>
              {online ? '● Live (FastAPI Connected)' : '○ Local Bridge'}
            </span>
          </div>

          {/* TypingMind Style Split View Controls */}
          {activePanel === 'chats' && (
            <div className="split-controls">
              <button
                className={`split-btn ${splitMode === 'single' ? 'active' : ''}`}
                onClick={() => setSplitMode('single')}
                title="Single Stream"
              >
                Single
              </button>
              <button
                className={`split-btn ${splitMode === 'split-3' ? 'active' : ''}`}
                onClick={() => setSplitMode('split-3')}
                title="3-Way Vertical Split"
              >
                Split 3
              </button>
              <button
                className={`split-btn ${splitMode === 'split-4' ? 'active' : ''}`}
                onClick={() => setSplitMode('split-4')}
                title="4-Way Vertical Split"
              >
                Split 4
              </button>
              <button
                className={`split-btn ${splitMode === 'top-grid' ? 'active' : ''}`}
                onClick={() => setSplitMode('top-grid')}
                title="Top-Grid Preview Box"
              >
                Top Grid
              </button>
            </div>
          )}
        </header>

        {/* Panel Switcher */}
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
            {/* Split Screen 3-way or 4-way vertical layout */}
            {(splitMode === 'split-3' || splitMode === 'split-4') && (
              <div className="split-columns">
                {[0, 1, 2, ...(splitMode === 'split-4' ? [3] : [])].map((colIndex) => {
                  const colKey = `col${colIndex}`;
                  const currentModel = columnModels[colKey];
                  const colMessages = filteredMessages.filter(
                    (m) => m.role === 'user' || m.source === currentModel || !m.source
                  );

                  return (
                    <div className="split-column" key={colKey}>
                      <div className="split-column-header">
                        <select
                          className="column-model-select"
                          value={currentModel}
                          onChange={(e) =>
                            setColumnModels((prev) => ({ ...prev, [colKey]: e.target.value }))
                          }
                        >
                          {sources.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: '11px', color: 'var(--tom-text-dim)' }}>
                            Lane {colIndex + 1}
                          </span>
                          <button
                            className="sidebar-toggle-btn"
                            title={`Kick/remove ${currentModel} from active broadcast lane`}
                            style={{ padding: '2px 5px', fontSize: '11px', color: 'var(--tom-text-dim)' }}
                            onClick={() => {
                              // Switch lane or drop to fewer columns
                              if (splitMode === 'split-4' && colIndex === 3) {
                                setSplitMode('split-3');
                              } else if (splitMode === 'split-3' && colIndex === 2) {
                                setSplitMode('single');
                              } else {
                                setColumnModels((prev) => ({ ...prev, [colKey]: 'ollama' }));
                              }
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
                          colMessages.map((m, i) => (
                            <MessageCard key={m.id || i} message={m} />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Top-Grid pinned view */}
            {splitMode === 'top-grid' && (
              <div className="top-grid-container">
                <div className="top-grid-boxes">
                  {['claude', 'deepseek', 'kimi', 'gpt'].map((mKey) => (
                    <div className="pinned-box" key={mKey}>
                      <div className="pinned-box-header">
                        <span>{mKey.toUpperCase()}</span>
                        <span>Active</span>
                      </div>
                      <p>Awaiting next batch synthesis...</p>
                    </div>
                  ))}
                </div>
                <div className="column-stream" style={{ flex: 1 }}>
                  {filteredMessages.map((m, i) => (
                    <MessageCard key={m.id || i} message={m} />
                  ))}
                </div>
              </div>
            )}

            {/* Single Stream View */}
            {splitMode === 'single' && (
              <div className="column-stream" style={{ flex: 1, padding: '20px' }}>
                {filteredMessages.length === 0 ? (
                  <div className="empty-canvas">
                    <h2>Welcome to Top of Mind</h2>
                    <p>Your unified multi-model command desk. Select Split 3 or Split 4 to chat with multiple AIs simultaneously.</p>
                  </div>
                ) : (
                  filteredMessages.map((m, i) => (
                    <MessageCard key={m.id || i} message={m} />
                  ))
                )}
              </div>
            )}

          </div>
        )}

        {/* 4. Bottom Composer */}
        <footer className="composer-area">
          <div className="composer-toolbar">
            <div className="composer-left-actions">
              <button
                className="action-pill-btn"
                onClick={() => topOfMindApi.combine({ folder: selectedFolder })}
                title="Combine active streams into synthesis"
              >
                <Sparkles size={12} />
                <span>Combine</span>
              </button>
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
                  if (!quickSettings.confirmEndAll || confirm('End all conversations?')) {
                    topOfMindApi.endAll();
                    setMessages([]);
                  }
                }}
                title="End all active conversations"
              >
                <XCircle size={12} />
                <span>End All</span>
              </button>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--tom-text-dim)' }}>
              Folder: <b>{selectedFolder}</b> · Broadcast: <b>{splitMode.toUpperCase()}</b>
            </div>
          </div>

          <div className="composer-input-row">
            <button
              className="sidebar-toggle-btn"
              title="Attach File"
              style={{ padding: '6px', color: 'var(--tom-text-dim)' }}
            >
              <Paperclip size={16} />
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`Message ${splitMode === 'single' ? 'AI' : 'all active split models'}... (Enter to send, Shift+Enter for new line)`}
            />
            <button
              className="send-btn"
              onClick={handleSend}
              disabled={!input.trim()}
              title="Send to all active lanes"
            >
              <Send size={14} style={{ display: 'inline', marginRight: '4px' }} />
              Send
            </button>
          </div>
        </footer>
      </main>

      {/* 5. Right Dock Panel (mirrors left sidebar: open / wide / shut to rail) */}
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
          activeChat={activeChat}
          onCombine={handleCombine}
          onJoin={handleJoin}
          quickSettings={quickSettings}
          setQuickSettings={setQuickSettings}
          onOpenFullSettings={() => {
            setActivePanel('settings');
            setSidebarCollapsed(false);
          }}
        />
      )}

      {/* 6. Right Icon Rail (slim bar, always visible) */}
      <RightRail
        activeTab={rightTab}
        panelOpen={rightPanelState !== 'collapsed'}
        onSelect={handleRightRailSelect}
      />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
