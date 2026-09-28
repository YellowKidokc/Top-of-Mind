import React, { useEffect, useMemo, useState } from 'react';
import { Columns3, Send, Paperclip, Sparkles, XCircle } from 'lucide-react';

import WorkspaceSidebar from './components/sidebar/WorkspaceSidebar';
import IconRail from './components/sidebar/IconRail';
import RightDockPanel from './components/rightdock/RightDockPanel';
import RightRail from './components/rightdock/RightRail';
import MessageCard from './components/chat/MessageCard';
import ModelsPanel from './components/models/ModelsPanel';
import KnowledgePanel from './components/knowledge/KnowledgePanel';
import SettingsPanel from './components/settings/SettingsPanel';

import { topOfMindApi } from './api';
import './styles.css';

const SPLIT_MODES = [
  { id: 'single', label: 'Single' },
  { id: 'split-3', label: '3-Way Split' },
  { id: 'split-4', label: '4-Way Split' },
  { id: 'top-grid', label: 'Top Grid' }
];

export default function TopOfMindApp() {
  // Navigation & Layout State
  const [view, setView] = useState('chat'); // 'chat' | 'models' | 'knowledge' | 'settings'
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWide, setSidebarWide] = useState(false);
  // Right dock: symmetric with the left — slim rail always visible, panel 3-state
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

  // Data State
  const [availableModels, setAvailableModels] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const visibleMessages = useMemo(
    () => messages.filter((m) => m.folder === selectedFolder),
    [messages, selectedFolder]
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [sourcesRes, messagesRes] = await Promise.all([
        topOfMindApi.getSources(),
        topOfMindApi.getMessages()
      ]);
      const sources = Array.isArray(sourcesRes) ? sourcesRes : sourcesRes.sources || [];
      setAvailableModels(sources);
      setMessages(Array.isArray(messagesRes) ? messagesRes : messagesRes.messages || []);
      setOnline(true);
      setStatus('');
    } catch (err) {
      console.error('Failed to load data:', err);
      setOnline(false);
      setStatus('Local Bridge Offline');
    }
  };

  // --- Layout Handlers ---
  // Click a rail icon: select that section; clicking the active one collapses to the slim bar
  const handleRailSelect = (section) => {
    if (sidebarCollapsed) {
      setSidebarCollapsed(false);
      return;
    }
    setSidebarCollapsed(true);
  };

  const handleRightRailSelect = (tab) => {
    if (rightPanelState === 'collapsed') {
      setRightTab(tab);
      setRightPanelState('open');
    } else if (rightTab === tab) {
      setRightPanelState('collapsed');
    } else {
      setRightTab(tab);
    }
  };

  const toggleSidebar = () => setSidebarCollapsed(!sidebarCollapsed);

  // --- Data Handlers ---
  const handleCombine = async () => {
    try {
      const summary = await topOfMindApi.combineMessages({ folder: selectedFolder });
      setMessages((prev) => [...prev, summary]);
    } catch (err) {
      console.error('Failed to combine:', err);
    }
  };

  const handleJoin = async () => {
    try {
      const d = await topOfMindApi.getMessages();
      setMessages(Array.isArray(d) ? d : d.messages || []);
    } catch (err) {
      console.error('Failed to join:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isSending) return;
    setIsSending(true);
    const text = inputText.trim();
    const targetSources = availableModels.filter(m => m.status === 'online').map(m => m.id);
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      body: text,
      folder: selectedFolder,
      created_at: new Date().toLocaleTimeString()
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    try {
      await topOfMindApi.createMessage({
        body: text,
        folder: selectedFolder,
        sources: targetSources,
        client_id: userMsg.id
      });
      if (quickSettings.autoCombine && targetSources.length > 1) {
        try { await handleCombine(); } catch { /* combine is best-effort */ }
      }
      // Listen for the lanes' replies — the hub fans out async, so poll briefly
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
    } catch (err) {
      console.error('Send failed:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'system',
          body: 'Failed to reach the hub — is uvicorn running?',
          folder: selectedFolder,
          created_at: new Date().toLocaleTimeString()
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleNewChat = () => {
    const name = `Session ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    setActiveChat(name);
    setView('chat');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="app-shell">
      {/* Left Icon Rail — always visible */}
      <IconRail
        currentView={view}
        setView={(v) => { setView(v); handleRailSelect(v); }}
        onNewChat={handleNewChat}
      />

      {/* Left Sidebar — collapsible to the rail, widen toggle */}
      {!sidebarCollapsed && (
        <WorkspaceSidebar
          currentView={view}
          selectedFolder={selectedFolder}
          setSelectedFolder={setSelectedFolder}
          activeChat={activeChat}
          setActiveChat={setActiveChat}
          wide={sidebarWide}
          setWide={setSidebarWide}
          onCollapse={() => setSidebarCollapsed(true)}
        />
      )}

      {/* Main Content Area */}
      <main className="main-content">
        {view === 'chat' && (
          <div className="chat-layout">
            {/* Top Control Bar */}
            <header className="top-bar">
              <div className="top-bar-left">
                {sidebarCollapsed && (
                  <button className="icon-btn" onClick={toggleSidebar} title="Open sidebar">
                    <Columns3 size={18} />
                  </button>
                )}
                <span className="chat-title">{activeChat}</span>
                <span className={`status-dot ${online ? 'online' : 'offline'}`}>
                  {online ? '● Live (FastAPI Connected)' : '○ ' + (status || 'Local Bridge (Offline)')}
                </span>
              </div>

              <div className="top-bar-right">
                <div className="split-selector">
                  {SPLIT_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      className={`split-btn ${splitMode === mode.id ? 'active' : ''}`}
                      onClick={() => setSplitMode(mode.id)}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
                <button
                  className="danger-btn"
                  onClick={async () => {
                    if (!quickSettings.confirmEndAll || confirm('End all conversations?')) {
                      try { await topOfMindApi.endAll(); } catch { /* hub offline */ }
                    }
                  }}
                >
                  <XCircle size={14} /> End All
                </button>
              </div>
            </header>

            {/* Message Streams (Split Pane Area) */}
            <div className={`streams-wrapper ${splitMode}`}>
              <div className={`stream-container ${quickSettings.compactCards ? 'compact-cards' : ''}`}>
                {visibleMessages.map((msg) => (
                  <MessageCard key={msg.id} message={msg} />
                ))}
                {visibleMessages.length === 0 && (
                  <div className="empty-state">
                    <Sparkles size={32} />
                    <p>No messages in this folder. Send a broadcast below.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Unified Input Area */}
            <div className="input-dock">
              <div className="input-box">
                <button className="attach-btn">
                  <Paperclip size={18} />
                </button>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={
                    splitMode === 'single'
                      ? 'Message the selected model...'
                      : `Broadcast to all active lanes...`
                  }
                  rows={1}
                />
                <button
                  className={`send-btn ${isSending ? 'sending' : ''}`}
                  onClick={handleSendMessage}
                  disabled={isSending}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'models' && <ModelsPanel />}
        {view === 'knowledge' && <KnowledgePanel />}
        {view === 'settings' && <SettingsPanel />}
      </main>

      {/* Right Dock — panel (3-state) + slim rail, symmetric with the left */}
      {rightPanelState !== 'collapsed' && (
        <RightDockPanel
          activeTab={rightTab}
          setActiveTab={setRightTab}
          wide={rightPanelState === 'wide'}
          onToggleWide={() => setRightPanelState(rightPanelState === 'wide' ? 'open' : 'wide')}
          onCollapse={() => setRightPanelState('collapsed')}
          splitMode={splitMode}
          setSplitMode={setSplitMode}
          availableModels={availableModels}
          onCombine={handleCombine}
          onJoin={handleJoin}
          quickSettings={quickSettings}
          setQuickSettings={setQuickSettings}
          onOpenFullSettings={() => setView('settings')}
        />
      )}
      <RightRail
        activeTab={rightTab}
        panelOpen={rightPanelState !== 'collapsed'}
        onSelect={handleRightRailSelect}
      />
    </div>
  );
}
