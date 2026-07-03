import { useApp } from '@/store/AppContext';
import {
  PanelRightClose,
  PanelRightOpen,
  Combine,
  Split,
  Square,
  Filter,
} from 'lucide-react';

export function CommandBar() {
  const { state, dispatch, loadMessages } = useApp();

  return (
    <div className="h-9 border-t border-b border-[hsl(var(--tom-border))] bg-[hsl(var(--tom-bg-elevated))] flex items-center px-3 gap-2 shrink-0">
      {/* Funnel toggle */}
      <button
        onClick={() => dispatch({ type: 'SET_FUNNEL_VISIBLE', payload: !state.funnelVisible })}
        className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors ${
          state.funnelVisible
            ? 'text-[hsl(var(--tom-gold))] bg-[hsl(var(--tom-gold))]/10'
            : 'text-[hsl(var(--tom-text-muted))] hover:text-[hsl(var(--tom-text))] hover:bg-[hsl(var(--tom-bg-surface))]'
        }`}
        title="Toggle Funnel sidebar"
      >
        {state.funnelVisible ? <PanelRightClose size={13} /> : <PanelRightOpen size={13} />}
        <span className="hidden sm:inline">Funnel</span>
      </button>

      <div className="w-px h-4 bg-[hsl(var(--tom-border))]" />

      {/* Routing controls */}
      <button
        className="flex items-center gap-1.5 px-2 py-1 text-xs text-[hsl(var(--tom-text-muted))] hover:text-[hsl(var(--tom-gold))] hover:bg-[hsl(var(--tom-bg-surface))] rounded transition-colors"
        title="Combine selected"
      >
        <Combine size={13} />
        <span className="hidden sm:inline">Combine</span>
      </button>
      <button
        className="flex items-center gap-1.5 px-2 py-1 text-xs text-[hsl(var(--tom-text-muted))] hover:text-[hsl(var(--tom-gold))] hover:bg-[hsl(var(--tom-bg-surface))] rounded transition-colors"
        title="Split selected"
      >
        <Split size={13} />
        <span className="hidden sm:inline">Split</span>
      </button>

      <div className="w-px h-4 bg-[hsl(var(--tom-border))]" />

      {/* End All */}
      <button
        onClick={async () => {
          if (confirm('End all conversations?')) {
            try {
              const { endAllConversations } = await import('@/lib/api/client');
              await endAllConversations();
              loadMessages();
            } catch (err) {
              dispatch({ type: 'SET_ERROR', payload: 'Failed to end conversations' });
            }
          }
        }}
        className="flex items-center gap-1.5 px-2 py-1 text-xs text-[hsl(var(--tom-red))] hover:bg-[hsl(var(--tom-red))]/10 rounded transition-colors"
        title="End all conversations"
      >
        <Square size={13} />
        <span className="hidden sm:inline">End All</span>
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Status indicators */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${state.connectionStatus === 'online' ? 'bg-[hsl(var(--tom-green))]' : 'bg-[hsl(var(--tom-red))]'}`} />
          <span className="text-xs text-[hsl(var(--tom-text-dim))]">{state.connectionStatus}</span>
        </div>
        {state.selectedMessageIds.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--tom-gold))]">
            <Filter size={12} />
            <span>{state.selectedMessageIds.length} selected</span>
          </div>
        )}
      </div>
    </div>
  );
}
