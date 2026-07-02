import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { NUMBERING, topOfMindApi } from './lib/api/topOfMindApi';
import './styles.css';

const fallbackSources = [
  { id: 'clipboard', name: 'Clipboard', status: 'online', source_code: NUMBERING.sources.clipboard },
  { id: 'ahk', name: 'AHK', status: 'online', source_code: NUMBERING.sources.ahk },
  { id: 'codex', name: 'Codex', status: 'online', source_code: NUMBERING.sources.codex },
  { id: 'kimi', name: 'Kimi CLI', status: 'paused', source_code: NUMBERING.sources.kimi },
];
const starterFolders = [{ id: 'local-inbox', name: 'Inbox', folder_code: NUMBERING.folders.inbox, children: [{ id: 'local-active', name: 'Active', folder_code: NUMBERING.folders.active }] }];
const initials = (s) => (s?.name || s?.id || '?').split(/\s|-/).map((p) => p[0]).join('').slice(0, 3).toUpperCase();
const arr = (d, key) => Array.isArray(d) ? d : d?.[key] || [];

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

function Funnel({ sources, setSources, selectedMessage, patchMessage, collapsed, setCollapsed }) {
  const toggle = (id, key) => setSources((ss)=>ss.map((s)=> (s.id||s.name)===id ? {...s, [key]: !s[key], status: key==='paused' ? 'paused' : s.status} : s));
  const assign = (field, value) => selectedMessage && patchMessage(selectedMessage.id || selectedMessage.message_id, { [field]: value });
  return <aside className={`funnel ${collapsed?'collapsed':''}`}><button onClick={()=>setCollapsed(!collapsed)}>{collapsed?'▶':'◀'}</button>{!collapsed && <><h3>Funnel</h3>{sources.map((s)=><div className="source" key={s.id||s.name}><span className="avatar">{initials(s)}</span><b>{s.name}</b><em>{s.status}</em><button onClick={()=>toggle(s.id||s.name,'paused')}>pause</button><button onClick={()=>toggle(s.id||s.name,'muted')}>mute</button><label><input type="checkbox" defaultChecked/> include</label></div>)}<h3>Assign selected</h3><button onClick={()=>assign('wall_code', NUMBERING.walls.main)}>Main wall</button><button onClick={()=>assign('wall_code', NUMBERING.walls.code)}>Code wall</button><button onClick={()=>assign('folder_code', NUMBERING.folders.active)}>Active folder</button><div className="grid"><button onClick={()=>topOfMindApi.combine({})}>combine</button><button>split draft</button><button>broadcast draft</button><button onClick={()=>topOfMindApi.endAll()}>end all</button></div></>}</aside>;
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
  useEffect(()=>{ topOfMindApi.getSources().then(d=>setSources(arr(d,'sources'))).catch(e=>setNotice(e.message)); topOfMindApi.getMessages(75).then(d=>setMessages(arr(d,'messages'))).catch(e=>setNotice(e.message)); topOfMindApi.getFolders().then(d=>setFolders(arr(d,'folders'))).catch(()=>{}); },[]);
  const selectedSource = sources[0] || fallbackSources[0];
  async function send(){ if(!input.trim()) return; const payload = { content: input, text: input, source: selectedSource.name, source_code: selectedSource.source_code, type: 'normal chat', type_code: NUMBERING.types.normalChat, priority: 'normal', priority_code: NUMBERING.priorities.normal, wall: 'main', wall_code: NUMBERING.walls.main, folder: selectedFolder.name, folder_code: selectedFolder.folder_code }; setInput(''); try { const saved = await topOfMindApi.createMessage(payload); setMessages((m)=>[...m, saved]); } catch { setMessages((m)=>[...m, {...payload, id: Date.now()}]); setNotice('Draft shown locally; API post failed.'); } }
  async function patchMessage(id, body){ setMessages(ms=>ms.map(m=>(m.id===id||m.message_id===id)?{...m,...body}:m)); try{ await topOfMindApi.updateMessage(id, body); } catch { setNotice('Local patch shown; API patch failed.'); } }
  async function createFolder(){ const name = prompt('Folder name?'); if(!name) return; try { const f = await topOfMindApi.createFolder({ name, parent_id: selectedFolder.id || selectedFolder.folder_id }); setFolders(fs=>[...fs, f]); } catch { setNotice('Folder must be created by API; request failed.'); } }
  const filtered = useMemo(()=>messages.slice(-75),[messages]);
  return <div className="app"><nav className="rail"><b>ToM</b>{['chats','memory','files','operator','settings'].map(x=><button className={active===x?'on':''} onClick={()=>setActive(x)} key={x}>{x[0].toUpperCase()}</button>)}</nav><Sidebar folders={folders} selectedFolder={selectedFolder} setSelectedFolder={setSelectedFolder} createFolder={createFolder} active={active} setActive={setActive}/><Funnel sources={sources} setSources={setSources} selectedMessage={selectedMessage} patchMessage={patchMessage} collapsed={funnelCollapsed} setCollapsed={setFunnelCollapsed}/><main><header><h1>Top of Mind Desk</h1><span>{topOfMindApi.baseUrl}</span></header><section className="workspace">{active==='memory' && <SearchPanel title="Memory search" modeToggle onSearch={(q,m)=>topOfMindApi.searchMemory(q,m==='vector'?'vector':undefined)}/>} {active==='files' && <SearchPanel title="File cache search" onSearch={(q)=>topOfMindApi.searchFileCache(q)}/>} {active==='settings' && <ApiSettings online={online} setOnline={setOnline} notice={notice}/>} {active==='operator' && <section className="panel"><h3>Operator drafts</h3><textarea placeholder='{"action":"write_text","path":"notes.txt","text":"draft only"}'/><textarea placeholder='{"action":"append_text","path":"notes.txt","text":"draft only"}'/><button onClick={()=>setNotice('Draft only. Review before sending to /operator/file-actions or /operator/commands.')}>Do not run destructive action</button></section>}<div className="walls">{[1,2,3].map(w=><div className="wall" key={w}><h3>Wall {w}</h3>{filtered.filter((_,i)=>i%3===w-1).map((m,i)=><article onClick={()=>setSelectedMessage(m)} className="msg" key={m.id||m.message_id||i}><b>{m.source || m.source_code || 'source'}</b><p>{m.content || m.text || m.message}</p><small>{m.type_code} · {m.priority_code} · {m.folder_code}</small></article>)}</div>)}</div></section><footer><div className="cmd"><button onClick={()=>topOfMindApi.combine({ folder_code: selectedFolder.folder_code })}>Combine</button><button>Split</button><button>Broadcast</button><button onClick={()=>topOfMindApi.endAll()}>End all</button><span>source_code {selectedSource.source_code}</span><span>folder_code {selectedFolder.folder_code}</span></div><div className="composer"><textarea value={input} onChange={(e)=>setInput(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey))send();}} placeholder="Message Top of Mind… Ctrl/⌘+Enter"/><button onClick={send}>Send</button></div></footer></main></div>;
}

createRoot(document.getElementById('root')).render(<App />);
