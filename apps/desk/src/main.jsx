import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { NUMBERING, topOfMindApi } from './lib/api/topOfMindApi';
import './styles.css';

const fallbackSources = [
  { id: 'clipboard', name: 'Clipboard', status: 'online', source_code: NUMBERING.sources.clipboard },
  { id: 'ahk', name: 'AutoHotkey', status: 'online', source_code: NUMBERING.sources.ahk },
  { id: 'codex', name: 'Codex', status: 'online', source_code: NUMBERING.sources.codex },
  { id: 'top-of-mind', name: 'Top of Mind', status: 'online', source_code: NUMBERING.sources.topOfMind },
  { id: 'operator', name: 'Operator', status: 'online', source_code: NUMBERING.sources.operator },
  { id: 'claude', name: 'Claude', status: 'online', source_code: NUMBERING.sources.claude },
  { id: 'gemini', name: 'Gemini', status: 'online', source_code: NUMBERING.sources.gemini },
  { id: 'cursor', name: 'Cursor/Versor', status: 'online', source_code: NUMBERING.sources.cursor },
];
const starterFolders = [{ id: 'local-inbox', name: 'Inbox', folder_code: NUMBERING.folders.inbox, children: [{ id: 'local-active', name: 'Active', folder_code: NUMBERING.folders.active }] }];
const initials = (s) => (s?.name || s?.label || s?.id || s?.source_id || '?').split(/\s|-/).map((p) => p[0]).join('').slice(0, 3).toUpperCase();
const srcName = (s) => s?.name || s?.label || s?.source_id || s?.id || 'source';
const srcId = (s) => s?.id || s?.source_id || s?.name || s?.label;
const arr = (d, key) => Array.isArray(d) ? d : d?.[key] || [];
const ACTIVE_AGENT_KEY = 'topOfMind.activeAgentId';

function ApiSettings({ online, setOnline, notice }) {
  const [url, setUrl] = useState(topOfMindApi.baseUrl);
  async function test() {
    topOfMindApi.setBaseUrl(url);
    try { await topOfMindApi.test(); setOnline(true); } catch { setOnline(false); }
  }
  return <section className="panel settings"><h3>API Settings</h3><input value={url} onChange={(e)=>setUrl(e.target.value)} placeholder="http://127.0.0.1:10000"/><button onClick={()=>{topOfMindApi.setBaseUrl(url); test();}}>Save + Test</button><span className={`status ${online?'ok':'bad'}`}>{online ? 'online' : 'offline'}</span>{notice && <p>{notice}</p>}</section>;
}

function Sidebar({ folders, selectedFolder, setSelectedFolder, createFolder, active, setActive }) {
  const sections = ['prompts','agents','models','tools/plugins','knowledge bank','settings'];
  const renderFolder = (f, depth = 0) => <div key={f.id || f.folder_id || f.folder_code}><button className="row" style={{'--depth': depth}} onClick={()=>setSelectedFolder(f)}>{depth ? '└' : '▾'} 📁 {f.name || f.title} <small>{f.folder_code}</small></button>{(f.children || []).map((c)=>renderFolder(c, depth + 1))}<button className="chat" style={{'--depth': depth + 1}}>💬 Current routing chat</button></div>;
  return <aside className="sidebar"><button className="new">＋ New Chat</button><input className="search" placeholder="Search Chats"/><h3>Folders</h3>{folders.map((f)=>renderFolder(f))}<button className="row" onClick={createFolder}>＋ Create folder via API</button>{sections.map((s)=><button key={s} onClick={()=>setActive(s)} className={`row ${active===s?'selected':''}`}>◇ {s}</button>)}</aside>;
}

function Funnel({ sources, setSources, selectedMessage, patchMessage, collapsed, setCollapsed, activeAgentId, setActiveAgentId }) {
  const toggle = (id, key) => setSources((ss)=>ss.map((s)=> (s.id||s.name)===id ? {...s, [key]: !s[key], status: key==='paused' ? 'paused' : s.status} : s));
  const assign = (field, value) => selectedMessage && patchMessage(selectedMessage.id || selectedMessage.message_id, { [field]: value });
  return <aside className={`funnel ${collapsed?'collapsed':''}`}><button onClick={()=>setCollapsed(!collapsed)}>{collapsed?'▶':'◀'}</button>{!collapsed && <><h3>Funnel</h3>{sources.map((s)=>{ const id = srcId(s); const isActive = id === activeAgentId; return <div className={`source ${isActive?'active-source':''}`} key={id} onClick={()=>setActiveAgentId(id)} role="button" tabIndex="0" onKeyDown={(e)=>{if(e.key==='Enter'||e.key===' ') setActiveAgentId(id);}}><span className="avatar">{initials(s)}</span><b>{srcName(s)}</b><em>{isActive ? 'active' : (s.status||'online')}</em><button onClick={(e)=>{e.stopPropagation();toggle(id,'paused');}}>pause</button><button onClick={(e)=>{e.stopPropagation();toggle(id,'muted');}}>mute</button><label onClick={(e)=>e.stopPropagation()}><input type="checkbox" defaultChecked/> include</label><small>priority {s.priority || s.priority_code || 'normal'} · {s.configured === false ? 'not configured' : 'configured'}</small></div>})}<h3>Assign selected</h3><button onClick={()=>assign('wall_code', NUMBERING.walls.main)}>Main wall</button><button onClick={()=>assign('wall_code', NUMBERING.walls.code)}>Code wall</button><button onClick={()=>assign('folder_code', NUMBERING.folders.active)}>Active folder</button><div className="grid"><button onClick={()=>topOfMindApi.combine({})}>combine</button><button>split draft</button><button>broadcast draft</button><button onClick={()=>topOfMindApi.endAll()}>end all</button></div></>}</aside>;
}


function ControlBar({ input, setInput, send, selectedSource, selectedFolder, setNotice }) {
  const [busy, setBusy] = useState('');
  const [scrollOn, setScrollOn] = useState(true);
  const [micOn, setMicOn] = useState(false);
  const agent = { id: srcId(selectedSource), name: srcName(selectedSource), source_code: selectedSource?.source_code };
  const status = (name, text) => setNotice(`${name}: ${text}`);
  async function call(name, fn, placeholder) {
    if (placeholder) { status(name, placeholder); return; }
    setBusy(name);
    try { const result = await fn(); status(name, result?.status || result?.message || 'hub request accepted'); }
    catch (e) { status(name, `API route unavailable or failed (${e.message})`); }
    finally { setBusy(''); }
  }
  async function pasteOnly() {
    const text = await navigator.clipboard?.readText?.();
    if (text) setInput((current)=> current ? `${current}\n${text}` : text);
    await topOfMindApi.saveClipboard({ action: 'paste_to_active', target: agent, text: text || '', dry_run: true });
  }
  const context = () => ({ target: agent, folder: selectedFolder?.name || 'Main', folder_code: selectedFolder?.folder_code, dry_run: true });
  return <div className="controlbar" aria-label="Top of Mind control bar">
    <span className="active-pill">Active: {agent.name}</span>
    <button disabled={!!busy} onClick={()=>call('Paste', pasteOnly)}>Paste</button>
    <button disabled={!input.trim() || !!busy} onClick={send}>Send</button>
    <button disabled={!!busy} onClick={()=>call('Pull', ()=>topOfMindApi.pullLatest(context()), 'Placeholder: final /pull_latest route not confirmed yet.')}>Pull</button>
    <button disabled={!!busy} onClick={()=>call('Push', ()=>topOfMindApi.pushClipboard({ ...context(), text: input }), 'Placeholder: using /clipboard/save once hub route exists.')}>Push</button>
    <button className={micOn?'toggled':''} onClick={()=>{setMicOn(!micOn); status('Mic', 'local toggle only; no audio transmitted.')}}>Mic</button>
    <button className={scrollOn?'toggled':''} onClick={()=>{setScrollOn(!scrollOn); status('Scroll', `auto-scroll ${!scrollOn ? 'on' : 'off'}`)}}>Scroll</button>
    <button disabled={!!busy} onClick={()=>call('Save Memory', ()=>topOfMindApi.createMemoryItem({ ...context(), text: input, source: agent }))}>Save Memory</button>
    <button disabled={!!busy} onClick={()=>call('End All', ()=>topOfMindApi.endAll({ ...context(), action: 'end_all' }))}>End All</button>
    <button disabled={!!busy} onClick={()=>call('Hub Health', ()=>topOfMindApi.hubHealth())}>Hub Health</button>
    <button disabled={!input.trim() || !!busy} onClick={()=>call('Agent Send', ()=>topOfMindApi.sendAgent({ ...context(), message: input, route_only: true }))}>Agent Send</button>
  </div>;
}

function SearchPanel({ title, modeToggle, onSearch }) {
  const [q, setQ] = useState(''); const [mode, setMode] = useState('text'); const [results, setResults] = useState([]);
  async function run(){ try { setResults(arr(await onSearch(q, mode), 'items')); } catch { setResults([{ name: 'API offline', content: 'Search could not run.' }]); } }
  return <section className="panel"><h3>{title}</h3><div className="inline"><input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search…"/>{modeToggle && <label><input type="checkbox" onChange={(e)=>setMode(e.target.checked?'vector':'text')}/> vector</label>}<button onClick={run}>Search</button></div>{results.slice(0,8).map((r,i)=><p key={i}>▣ {r.name || r.path || r.title || r.content || JSON.stringify(r)}</p>)}</section>;
}

function App() {
  const [sources, setSources] = useState(fallbackSources), [folders, setFolders] = useState(starterFolders), [messages, setMessages] = useState([]);
  const [input, setInput] = useState(''), [active, setActive] = useState('chats'), [selectedFolder, setSelectedFolder] = useState(starterFolders[0]);
  const [selectedMessage, setSelectedMessage] = useState(null), [online, setOnline] = useState(false), [notice, setNotice] = useState(''), [funnelCollapsed, setFunnelCollapsed] = useState(false);
  const [activeAgentId, setActiveAgentIdState] = useState(()=>localStorage.getItem(ACTIVE_AGENT_KEY) || 'clipboard');
  const setActiveAgentId = (id) => { setActiveAgentIdState(id); localStorage.setItem(ACTIVE_AGENT_KEY, id); };
  useEffect(()=>{
    topOfMindApi.getSources().then(d=>{const s=arr(d,'sources'); if(s.length) setSources(s); setOnline(true);}).catch(e=>{setOnline(false); setNotice(e.message);});
    topOfMindApi.getFolders().then(d=>setFolders(arr(d,'folders'))).catch(()=>{});
    const loadMessages = () => topOfMindApi.getMessages(75).then(d=>{setMessages(arr(d,'messages')); setOnline(true);}).catch(()=>setOnline(false));
    loadMessages();
    const timer = setInterval(loadMessages, 4000);   // live refresh every 4s
    return () => clearInterval(timer);
  },[]);
  const selectedSource = sources.find((source)=>srcId(source)===activeAgentId) || sources[0] || fallbackSources[0];
  async function send(){ if(!input.trim()) return; const payload = { source_id: srcId(selectedSource), source_label: srcName(selectedSource), body: input, role: 'user', wall: 'main', folder: selectedFolder.name || 'Main' }; setInput(''); try { const saved = await topOfMindApi.createMessage(payload); setMessages((m)=>[...m, saved]); } catch { setMessages((m)=>[...m, {...payload, id: Date.now()}]); setNotice('Draft shown locally; API post failed.'); } }
  async function patchMessage(id, body){ setMessages(ms=>ms.map(m=>(m.id===id||m.message_id===id)?{...m,...body}:m)); try{ await topOfMindApi.updateMessage(id, body); } catch { setNotice('Local patch shown; API patch failed.'); } }
  async function createFolder(){ const name = prompt('Folder name?'); if(!name) return; try { const f = await topOfMindApi.createFolder({ name, parent_id: selectedFolder.id || selectedFolder.folder_id }); setFolders(fs=>[...fs, f]); } catch { setNotice('Folder must be created by API; request failed.'); } }
  const filtered = useMemo(()=>messages.slice(-75),[messages]);
  return <div className="app"><nav className="rail"><b>ToM</b>{['chats','memory','files','operator','settings'].map(x=><button className={active===x?'on':''} onClick={()=>setActive(x)} key={x}>{x[0].toUpperCase()}</button>)}</nav><Sidebar folders={folders} selectedFolder={selectedFolder} setSelectedFolder={setSelectedFolder} createFolder={createFolder} active={active} setActive={setActive}/><Funnel sources={sources} setSources={setSources} selectedMessage={selectedMessage} patchMessage={patchMessage} collapsed={funnelCollapsed} setCollapsed={setFunnelCollapsed} activeAgentId={activeAgentId} setActiveAgentId={setActiveAgentId}/><main><header><h1>Top of Mind Desk</h1><span className={`status ${online?'ok':'bad'}`}>{online?'● live':'○ offline'} · {topOfMindApi.baseUrl}</span></header><section className="workspace">{active==='memory' && <SearchPanel title="Memory search" modeToggle onSearch={(q,m)=>topOfMindApi.searchMemory(q,m==='vector'?'vector':undefined)}/>} {active==='files' && <SearchPanel title="File cache search" onSearch={(q)=>topOfMindApi.searchFileCache(q)}/>} {active==='settings' && <ApiSettings online={online} setOnline={setOnline} notice={notice}/>} {active==='operator' && <section className="panel"><h3>Operator drafts</h3><textarea placeholder='{"action":"write_text","path":"notes.txt","text":"draft only"}'/><textarea placeholder='{"action":"append_text","path":"notes.txt","text":"draft only"}'/><button onClick={()=>setNotice('Draft only. Review before sending to /operator/file-actions or /operator/commands.')}>Do not run destructive action</button></section>}<div className="walls">{[1,2,3].map(w=><div className="wall" key={w}><h3>Wall {w}</h3>{filtered.filter((_,i)=>i%3===w-1).map((m,i)=><article onClick={()=>setSelectedMessage(m)} className="msg" key={m.id||m.message_id||i}><b>{m.source_label || m.source || m.source_id || 'source'}</b><p>{m.body || m.content || m.text || m.message}</p><small>{m.role || m.type_code} · {m.folder || m.folder_code}</small></article>)}</div>)}</div></section><footer><ControlBar input={input} setInput={setInput} send={send} selectedSource={selectedSource} selectedFolder={selectedFolder} setNotice={setNotice}/><div className="cmd"><button onClick={()=>topOfMindApi.combine({ folder_code: selectedFolder.folder_code })}>Combine</button><button>Split</button><button>Broadcast</button><button onClick={()=>topOfMindApi.endAll()}>End all</button><span>source_code {selectedSource.source_code}</span><span>folder_code {selectedFolder.folder_code}</span></div><div className="composer"><textarea value={input} onChange={(e)=>setInput(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey))send();}} placeholder="Message Top of Mind… Ctrl/⌘+Enter"/><button onClick={send}>Send</button></div></footer></main></div>;
}

createRoot(document.getElementById('root')).render(<App />);
