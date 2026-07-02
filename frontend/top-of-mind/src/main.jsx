import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MessageCard } from './components/chat/MessageCard';
import { KnowledgePanel } from './components/knowledge/KnowledgePanel';
import { IconRail } from './components/sidebar/IconRail';
import { WorkspaceSidebar } from './components/sidebar/WorkspaceSidebar';
import { topOfMindApi } from './lib/api/topOfMindApi';
import './styles.css';

const fallbackSources = [{ id: 'kimi', name: 'Kimi', status: 'online' }, { id: 'codex', name: 'Codex', status: 'needs review' }, { id: 'claude', name: 'Claude', status: 'paused' }, { id: 'gpt', name: 'GPT', status: 'online' }, { id: 'clipboard', name: 'Clipboard', status: 'muted' }, { id: 'autohotkey', name: 'AutoHotkey bridge', status: 'online' }, { id: 'ocr', name: 'OCR bridge', status: 'error' }];

function App() {
  const [sources, setSources] = useState(fallbackSources); const [messages, setMessages] = useState([]); const [input, setInput] = useState('');
  const [query, setQuery] = useState(''); const [activePanel, setActivePanel] = useState('chats'); const [collapsed, setCollapsed] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState('inbox'); const [selectedSource, setSelectedSource] = useState('gpt'); const [status, setStatus] = useState('');
  useEffect(() => { topOfMindApi.getSources().then((d) => setSources(Array.isArray(d) ? d : d.sources || fallbackSources)).catch(() => {}); topOfMindApi.getMessages().then((d) => setMessages(Array.isArray(d) ? d : d.messages || [])).catch((e) => setStatus(`API offline: ${e.message}`)); }, []);
  const filtered = useMemo(() => messages.filter((m) => JSON.stringify(m).toLowerCase().includes(query.toLowerCase())), [messages, query]);
  async function send() { if (!input.trim()) return; const payload = { content: input, source: selectedSource, folder: selectedFolder, wall: 1 }; setInput(''); try { const saved = await topOfMindApi.createMessage(payload); setMessages((m) => [...m, saved]); } catch { setMessages((m) => [...m, { ...payload, id: Date.now() }]); setStatus('Draft shown locally; API post failed.'); } }
  async function patch(id, body) { setMessages((ms) => ms.map((m) => (m.id === id || m.message_id === id ? { ...m, ...body } : m))); try { await topOfMindApi.updateMessage(id, body); } catch { setStatus('Local update shown; API patch failed.'); } }
  return <div className="app"><IconRail activePanel={activePanel} setActivePanel={setActivePanel} sources={sources}/><WorkspaceSidebar collapsed={collapsed} setCollapsed={setCollapsed} activePanel={activePanel} query={query} setQuery={setQuery} selectedFolder={selectedFolder} setSelectedFolder={setSelectedFolder}/><main className="main"><div className="topbar"><div><h1>Top of Mind</h1><p>{topOfMindApi.baseUrl} {status && `· ${status}`}</p></div><div className="layout-badges"><span>Split 3</span><span>Wall 1</span><span>Wall 2</span><span>Wall 3</span></div></div><section className="stream">{activePanel === 'knowledge' ? <KnowledgePanel/> : filtered.length ? filtered.map((m, i) => <MessageCard key={m.id || m.message_id || i} message={m} onPatch={patch}/>) : <div className="empty"><h2>Command desk ready</h2><p>Start a chat, combine streams, or route work to a wall.</p></div>}</section><footer className="composer"><div className="commandbar"><button onClick={() => topOfMindApi.endAll()}>End All</button><button onClick={() => topOfMindApi.combine({ folder: selectedFolder })}>Combine</button><button>Split 3</button><button>Wall 1</button><button>Wall 2</button><button>Wall 3</button><select value={selectedFolder} onChange={(e)=>setSelectedFolder(e.target.value)}><option value="inbox">Inbox</option><option value="research">Research</option><option value="projects">Projects</option></select><select value={selectedSource} onChange={(e)=>setSelectedSource(e.target.value)}>{sources.map((s)=><option key={s.id || s.name} value={s.id || s.name}>{s.name}</option>)}</select></div><div className="inputrow"><span>›</span><textarea value={input} onChange={(e)=>setInput(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter' && (e.metaKey || e.ctrlKey)) send(); }} placeholder="Message Top of Mind... Ctrl/⌘+Enter to send"/><button onClick={send}>Send</button></div></footer></main></div>;
}
createRoot(document.getElementById('root')).render(<App />);
