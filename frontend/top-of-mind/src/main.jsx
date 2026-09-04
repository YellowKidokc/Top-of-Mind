import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Columns3, Grid2X2, MessageSquare, Send, Paperclip, Mic, Sparkles, SlidersHorizontal, RefreshCw, XCircle } from 'lucide-react';
import { IconRail } from './components/sidebar/IconRail';
import { WorkspaceSidebar } from './components/sidebar/WorkspaceSidebar';
import { KnowledgePanel } from './components/knowledge/KnowledgePanel';
import { PromptsPanel } from './components/prompts/PromptsPanel';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { topOfMindApi } from './lib/api/topOfMindApi';
import './styles.css';

const fallbackSources = [
  { id: 'claude', name: 'Claude 3.7 Sonnet', status: 'online' },
  { id: 'deepseek', name: 'DeepSeek R1 / V3', status: 'online' },
  { id: 'kimi', name: 'Kimi 2.5', status: 'online' },
  { id: 'gpt', name: 'GPT-5.4', status: 'online' },
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
  const [selectedFolder, setSelectedFolder] = useState('inbox');
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
        sources: targetSources
      });
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
  }

  function handleNewChat() {
    setMessages([]);
    setStatus('Started fresh conversation.');
  }

  return (
    <div className="app">
      {/* 1. Left Icon Rail */}
      <IconRail
        activePanel={activePanel}
        setActivePanel={setActivePanel}
        sources={sources}
      />

      {/* 2. Middle Workspace Sidebar */}
      <WorkspaceSidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        activePanel={activePanel}
        query={query}
        setQuery={setQuery}
        selectedFolder={selectedFolder}
        setSelectedFolder={setSelectedFolder}
        onNewChat={handleNewChat}
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
        {activePanel === 'prompts' && <PromptsPanel onCopyToComposer={(p) => setInput(p)} />}
        {activePanel === 'settings' && <SettingsPanel />}

        {activePanel === 'chats' && (
          <div className="stream-container">
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
                        <span style={{ fontSize: '11px', color: 'var(--tom-text-dim)' }}>
                          Lane {colIndex + 1}
                        </span>
                      </div>

                      <div className="column-stream">
                        {colMessages.length === 0 ? (
                          <div className="empty-canvas" style={{ padding: '20px' }}>
                            <p>Ready for prompt.</p>
                          </div>
                        ) : (
                          colMessages.map((m, i) => (
                            <div
                              key={m.id || i}
                              className={`message-card ${m.role === 'user' ? 'user' : ''}`}
                            >
                              <div className="message-card-header">
                                <span className="message-card-author">
                                  {m.role === 'user' ? 'You' : m.source || currentModel}
                                </span>
                                <span>{m.created_at || ''}</span>
                              </div>
                              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                                {m.content || m.body}
                              </p>
                            </div>
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
                    <div
                      key={m.id || i}
                      className={`message-card ${m.role === 'user' ? 'user' : ''}`}
                    >
                      <div className="message-card-header">
                        <span className="message-card-author">{m.role === 'user' ? 'You' : m.source}</span>
                        <span>{m.created_at || ''}</span>
                      </div>
                      <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{m.content || m.body}</p>
                    </div>
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
                    <div
                      key={m.id || i}
                      className={`message-card ${m.role === 'user' ? 'user' : ''}`}
                    >
                      <div className="message-card-header">
                        <span className="message-card-author">{m.role === 'user' ? 'You' : m.source}</span>
                        <span>{m.created_at || ''}</span>
                      </div>
                      <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{m.content || m.body}</p>
                    </div>
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
                  if (confirm('End all conversations?')) {
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
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
