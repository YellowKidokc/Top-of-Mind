import { useApp } from '@/store/AppContext';
import {
  PanelRight,
  Wifi,
  WifiOff,
  Pause,
  VolumeX,
  Send,
  Radio,
  Combine,
  Split,
  Square,
  Check,
} from 'lucide-react';

// Placeholder sources for routing UI
const placeholderSources = [
  { id: 'kimi', name: 'Kimi CLI', status: 'online' as const, priority: 'Normal', wall: 'Main', folder: 'Active', included: true },
  { id: 'codex', name: 'Codex', status: 'online' as const, priority: 'High', wall: 'Code', folder: 'Active', included: true },
  { id: 'gpt', name: 'GPT', status: 'online' as const, priority: 'Normal', wall: 'Main', folder: 'Inbox', included: false },
  { id: 'opus', name: 'Opus', status: 'offline' as const, priority: 'Normal', wall: 'Main', folder: 'Inbox', included: false },
  { id: 'ahk', name: 'AutoHotkey', status: 'online' as const, priority: 'High', wall: 'Main', folder: 'Active', included: true },
  { id: 'clipboard', name: 'Clipboard', status: 'online' as const, priority: 'Normal', wall: 'Main', folder: 'Inbox', included: false },
];

export function FunnelSidebar() {
  const { state, dispatch } = useApp();

  if (!state.funnelVisible) return null;

  return (
    <div className={`bg-[hsl(var(--tom-bg-elevated))] border-r border-[hsl(var(--tom-border))] flex flex-col overflow-hidden transition-all duration-200 ${state.funnelCollapsed ? 'w-10 min-w-[40px]' : 'w-56 min-w-[224px]'}`}>
      {/* Header */}
      <div className="h-10 border-b border-[hsl(var(--tom-border))] flex items-center px-2">
        <button
          onClick={() => dispatch({ type: 'TOGGLE_FUNNEL' })}
          className="w-6 h-6 flex items-center justify-center rounded text-[hsl(var(--tom-text-muted))] hover:text-[hsl(var(--tom-gold))] hover:bg-[hsl(var(--tom-bg-surface))] transition-colors"
          title={state.funnelCollapsed ? 'Expand funnel' : 'Collapse funnel'}
        >
          <PanelRight size={14} />
        </button>
        {!state.funnelCollapsed && (
          <span className="ml-2 text-xs font-semibold text-[hsl(var(--tom-text-muted))] uppercase tracking-wider">Funnel</span>
        )}
      </div>

      {state.funnelCollapsed ? (
        /* Collapsed - just show status dots */
        <div className="flex flex-col items-center py-2 gap-2">
          {placeholderSources.map((s) => (
            <div
              key={s.id}
              className={`w-2.5 h-2.5 rounded-full ${
                s.status === 'online' ? 'bg-[hsl(var(--tom-green))]' : 'bg-[hsl(var(--tom-red))]'
              }`}
              title={`${s.name} - ${s.status}`}
            />
          ))}
        </div>
      ) : (
        /* Expanded */
        <>
          {/* Source list */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="px-3 py-2 text-xs font-semibold text-[hsl(var(--tom-text-dim))] uppercase tracking-wider">
              Sources
            </div>
            {placeholderSources.map((source) => (
              <div
                key={source.id}
                className="px-3 py-2 hover:bg-[hsl(var(--tom-bg-surface))] transition-colors border-b border-[hsl(var(--tom-border))]/50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {source.status === 'online' ? (
                      <Wifi size={12} className="text-[hsl(var(--tom-green))]" />
                    ) : (
                      <WifiOff size={12} className="text-[hsl(var(--tom-red))]" />
                    )}
                    <span className="text-sm text-[hsl(var(--tom-text))]">{source.name}</span>
                  </div>
                  <button
                    onClick={() => {/* toggle include */}}
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      source.included
                        ? 'bg-[hsl(var(--tom-gold))] border-[hsl(var(--tom-gold))] text-[hsl(var(--tom-bg))]'
                        : 'border-[hsl(var(--tom-text-dim))] text-transparent hover:border-[hsl(var(--tom-text-muted))]'
                    }`}
                  >
                    <Check size={12} />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1 ml-5">
                  <span className="text-xs text-[hsl(var(--tom-text-dim))]">{source.priority}</span>
                  <span className="text-xs text-[hsl(var(--tom-text-dim))]">·</span>
                  <span className="text-xs text-[hsl(var(--tom-text-dim))]">{source.wall}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="p-2 border-t border-[hsl(var(--tom-border))] space-y-1">
            <button className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[hsl(var(--tom-text-muted))] hover:text-[hsl(var(--tom-gold))] hover:bg-[hsl(var(--tom-bg-surface))] rounded transition-colors">
              <Send size={12} />
              Send Selected
            </button>
            <button className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[hsl(var(--tom-text-muted))] hover:text-[hsl(var(--tom-gold))] hover:bg-[hsl(var(--tom-bg-surface))] rounded transition-colors">
              <Radio size={12} />
              Broadcast
            </button>
            <button className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[hsl(var(--tom-text-muted))] hover:text-[hsl(var(--tom-gold))] hover:bg-[hsl(var(--tom-bg-surface))] rounded transition-colors">
              <Combine size={12} />
              Combine
            </button>
            <button className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[hsl(var(--tom-text-muted))] hover:text-[hsl(var(--tom-gold))] hover:bg-[hsl(var(--tom-bg-surface))] rounded transition-colors">
              <Split size={12} />
              Split
            </button>
            <div className="h-px bg-[hsl(var(--tom-border))] my-1" />
            <button className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[hsl(var(--tom-text-muted))] hover:text-[hsl(var(--tom-gold))] hover:bg-[hsl(var(--tom-bg-surface))] rounded transition-colors">
              <Pause size={12} />
              Pause Source
            </button>
            <button className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[hsl(var(--tom-text-muted))] hover:text-[hsl(var(--tom-gold))] hover:bg-[hsl(var(--tom-bg-surface))] rounded transition-colors">
              <VolumeX size={12} />
              Mute Source
            </button>
            <button className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-[hsl(var(--tom-red))] hover:bg-[hsl(var(--tom-red))]/10 rounded transition-colors">
              <Square size={12} />
              End All
            </button>
          </div>
        </>
      )}
    </div>
  );
}
