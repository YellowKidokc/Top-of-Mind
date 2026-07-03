import { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { Bot, MessageSquare, Route, Plug, Settings2, X } from 'lucide-react';

// One letter per AI you talk to. Click a letter to open that agent's panel,
// where you'll decide how to integrate / talk to it (menus TBD).
type Agent = { id: string; name: string; status?: string };

const letter = (name: string) => (name || '?').trim().charAt(0).toUpperCase();

export function AgentRail() {
  const { state } = useApp();
  const [openId, setOpenId] = useState<string | null>(null);

  const agents: Agent[] = ((state.sources as Agent[]) || []).map((s: any) => ({
    id: s.id ?? s.source_id,
    name: s.name ?? s.label ?? s.source_id ?? 'AI',
    status: s.status ?? 'online',
  }));

  const active = agents.find((a) => a.id === openId) || null;

  return (
    <div className="flex">
      {/* The rail: one letter per AI */}
      <div className="w-12 min-w-[48px] bg-[#0a0a0a] border-r border-[hsl(var(--tom-border))] flex flex-col items-center py-3 gap-1 z-20">
        <div
          className="w-9 h-9 flex items-center justify-center rounded-md text-[hsl(var(--tom-gold))] mb-1"
          title="Your AIs"
        >
          <Bot size={18} />
        </div>
        <div className="w-6 h-px bg-[hsl(var(--tom-border))] mb-2" />

        {agents.map((a) => {
          const isOpen = openId === a.id;
          return (
            <button
              key={a.id}
              onClick={() => setOpenId(isOpen ? null : a.id)}
              title={a.name}
              className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-bold transition-all duration-150 group relative border ${
                isOpen
                  ? 'text-[#0a0a0a] bg-[hsl(var(--tom-gold))] border-[hsl(var(--tom-gold))]'
                  : 'text-[hsl(var(--tom-text-muted))] border-[hsl(var(--tom-border))] hover:text-[hsl(var(--tom-text))] hover:border-[hsl(var(--tom-gold-dim))]'
              }`}
            >
              {letter(a.name)}
              {/* connection dot */}
              <span
                className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-[#0a0a0a] ${
                  a.status === 'online' || a.status === 'active' ? 'bg-emerald-400' : 'bg-zinc-500'
                }`}
              />
              {/* tooltip */}
              <span className="absolute left-full ml-2 px-2 py-1 bg-[hsl(var(--tom-bg-surface))] border border-[hsl(var(--tom-border))] rounded text-xs text-[hsl(var(--tom-text))] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                {a.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* The panel that opens when you click a letter */}
      {active && (
        <div className="w-64 bg-[hsl(var(--tom-bg-surface))] border-r border-[hsl(var(--tom-border))] flex flex-col z-10">
          <div className="p-3 border-b border-[hsl(var(--tom-border))] flex items-center gap-2">
            <span className="w-8 h-8 flex items-center justify-center rounded-full bg-[hsl(var(--tom-gold))] text-[#0a0a0a] text-sm font-bold">
              {letter(active.name)}
            </span>
            <div className="flex-1">
              <div className="text-sm font-semibold text-[hsl(var(--tom-text))]">{active.name}</div>
              <div className="text-xs text-[hsl(var(--tom-text-muted))]">{active.status}</div>
            </div>
            <button
              onClick={() => setOpenId(null)}
              className="text-[hsl(var(--tom-text-muted))] hover:text-[hsl(var(--tom-text))]"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-3 space-y-2">
            <div className="text-xs font-medium text-[hsl(var(--tom-text-muted))] uppercase tracking-wider mb-1">
              How you talk to {active.name}
            </div>
            {[
              { icon: MessageSquare, label: 'Open chat', hint: 'send / receive messages' },
              { icon: Route, label: 'Routing rules', hint: 'where its messages go' },
              { icon: Plug, label: 'Integration', hint: 'API / bridge / MCP' },
              { icon: Settings2, label: 'Configure', hint: 'name, status, priority' },
            ].map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.label}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md bg-[hsl(var(--tom-bg))] border border-[hsl(var(--tom-border))] hover:border-[hsl(var(--tom-gold-dim))] text-left transition-colors"
                  title="Menu TBD"
                >
                  <Icon size={16} className="text-[hsl(var(--tom-gold-dim))]" />
                  <span className="flex-1">
                    <span className="block text-sm text-[hsl(var(--tom-text))]">{opt.label}</span>
                    <span className="block text-xs text-[hsl(var(--tom-text-muted))]">{opt.hint}</span>
                  </span>
                </button>
              );
            })}
            <p className="text-[11px] text-[hsl(var(--tom-text-muted))] pt-2">
              Placeholder menus — wire up the real integration later.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
