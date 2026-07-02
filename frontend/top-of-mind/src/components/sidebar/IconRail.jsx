const icons = { chats: '💬', prompts: '✦', agents: '🤖', models: '🧠', tools: '🔧', settings: '⚙' };

export function IconRail({ activePanel, setActivePanel, sources }) {
  const nav = [['chats', 'Chats'], ['prompts', 'Prompts'], ['agents', 'Agents'], ['models', 'Models'], ['tools', 'Plugins/Tools'], ['settings', 'Settings']];
  return <aside className="icon-rail"><div className="brand">ToM</div>{nav.map(([key, label]) => <button key={key} title={label} className={activePanel === key ? 'active' : ''} onClick={() => setActivePanel(key)}><span>{icons[key]}</span></button>)}<div className="rail-sources">{sources.slice(0, 5).map((s) => <span key={s.id || s.name} title={s.name} className={`source-dot ${s.status || 'ready'}`}>{(s.name || '?')[0]}</span>)}</div><button className={activePanel === 'knowledge' ? 'active bottom' : 'bottom'} title="Knowledge Bank" onClick={() => setActivePanel('knowledge')}><span>▣</span></button></aside>;
}
