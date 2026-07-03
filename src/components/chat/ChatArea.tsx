import { useApp } from '@/store/AppContext';
import { useEffect, useRef } from 'react';
import {
  User,
  Bot,
  Terminal,
  Clipboard,
  Keyboard,
  Sparkles,
  Zap,
  CheckSquare,
  Square,
  Copy,
  Pin,
  Volume2,
} from 'lucide-react';
import type { Message } from '@/types';

function getSourceIcon(sourceCode: number) {
  // 22001 = Clipboard, 22002 = AHK, 20040 = Codex, 20030 = Kimi CLI
  switch (sourceCode) {
    case 22001:
      return <Clipboard size={14} />;
    case 22002:
      return <Keyboard size={14} />;
    case 20040:
      return <Sparkles size={14} />;
    case 20030:
      return <Terminal size={14} />;
    default:
      return <Bot size={14} />;
  }
}

function getSourceName(sourceCode: number): string {
  switch (sourceCode) {
    case 22001: return 'Clipboard';
    case 22002: return 'AHK';
    case 20040: return 'Codex';
    case 20030: return 'Kimi CLI';
    default: return `Source ${sourceCode}`;
  }
}

function getSourceColor(sourceCode: number): string {
  switch (sourceCode) {
    case 22001: return 'text-amber-400';
    case 22002: return 'text-cyan-400';
    case 20040: return 'text-purple-400';
    case 20030: return 'text-emerald-400';
    default: return 'text-[hsl(var(--tom-text-muted))]';
  }
}

function MessageBubble({ message, isSelected, onToggleSelect }: {
  message: Message;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  const isHuman = message.type_code === 30001;
  const isResponse = message.type_code === 30002;

  return (
    <div
      className={`group flex gap-3 px-4 py-3 hover:bg-[hsl(var(--tom-bg-surface))]/50 transition-colors ${
        isSelected ? 'bg-[hsl(var(--tom-bg-surface))]' : ''
      }`}
    >
      {/* Selection checkbox */}
      <button
        onClick={onToggleSelect}
        className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {isSelected ? (
          <CheckSquare size={16} className="text-[hsl(var(--tom-gold))]" />
        ) : (
          <Square size={16} className="text-[hsl(var(--tom-text-dim))]" />
        )}
      </button>

      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
        isHuman
          ? 'bg-[hsl(var(--tom-blue))]/20 text-[hsl(var(--tom-blue))]'
          : isResponse
          ? 'bg-[hsl(var(--tom-gold))]/20 text-[hsl(var(--tom-gold))]'
          : 'bg-[hsl(var(--tom-bg-surface))] text-[hsl(var(--tom-text-muted))]'
      }`}>
        {isHuman ? <User size={14} /> : getSourceIcon(message.source_code)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-xs font-medium ${getSourceColor(message.source_code)}`}>
            {getSourceName(message.source_code)}
          </span>
          <span className="text-xs text-[hsl(var(--tom-text-dim))]">
            {new Date(message.created_at).toLocaleTimeString()}
          </span>
          {message.priority_code === 40007 && (
            <Zap size={12} className="text-[hsl(var(--tom-gold))]" />
          )}
        </div>
        <div className="text-sm text-[hsl(var(--tom-text))] whitespace-pre-wrap break-words leading-relaxed">
          {message.content}
        </div>
        {/* Actions */}
        <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => navigator.clipboard.writeText(message.content)}
            className="flex items-center gap-1 px-2 py-0.5 text-xs text-[hsl(var(--tom-text-dim))] hover:text-[hsl(var(--tom-text-muted))] rounded transition-colors"
            title="Copy"
          >
            <Copy size={12} />
          </button>
          <button
            onClick={() => {
              const s = window.speechSynthesis;
              if (!s) return;
              s.cancel();
              s.speak(new SpeechSynthesisUtterance(message.content));
            }}
            className="flex items-center gap-1 px-2 py-0.5 text-xs text-[hsl(var(--tom-text-dim))] hover:text-[hsl(var(--tom-gold))] rounded transition-colors"
            title="Read aloud"
          >
            <Volume2 size={12} />
          </button>
          <button
            className="flex items-center gap-1 px-2 py-0.5 text-xs text-[hsl(var(--tom-text-dim))] hover:text-[hsl(var(--tom-text-muted))] rounded transition-colors"
            title="Pin"
          >
            <Pin size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ChatArea() {
  const { state, dispatch, loadMessages } = useApp();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.messages.length]);

  // Load messages on mount
  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[hsl(var(--tom-bg))]">
      {/* Chat header */}
      <div className="h-10 border-b border-[hsl(var(--tom-border))] flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[hsl(var(--tom-text))]">
            {state.activeConversationId ? 'Conversation' : 'All Messages'}
          </span>
          <span className="text-xs text-[hsl(var(--tom-text-dim))]">
            {state.messages.length} messages
          </span>
        </div>
        <div className="flex items-center gap-2">
          {state.selectedMessageIds.length > 0 && (
            <span className="text-xs text-[hsl(var(--tom-gold))]">
              {state.selectedMessageIds.length} selected
            </span>
          )}
          <button
            onClick={() => dispatch({ type: 'CLEAR_MESSAGE_SELECTION' })}
            className="text-xs text-[hsl(var(--tom-text-dim))] hover:text-[hsl(var(--tom-text-muted))] transition-colors"
          >
            Clear selection
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
        {state.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <Bot size={48} className="text-[hsl(var(--tom-text-dim))] mb-4" />
            <h3 className="text-lg font-medium text-[hsl(var(--tom-text-muted))] mb-2">
              Welcome to Top of Mind
            </h3>
            <p className="text-sm text-[hsl(var(--tom-text-dim))] max-w-md">
              Your unified AI command desk. All your AI agents in one surface.
              Start typing below to send a message through the API.
            </p>
            <div className="mt-6 flex items-center gap-4 text-xs text-[hsl(var(--tom-text-dim))]">
              <span className="flex items-center gap-1"><Terminal size={12} /> Kimi CLI</span>
              <span className="flex items-center gap-1"><Sparkles size={12} /> Codex</span>
              <span className="flex items-center gap-1"><Keyboard size={12} /> AHK</span>
              <span className="flex items-center gap-1"><Clipboard size={12} /> Clipboard</span>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[hsl(var(--tom-border))]/30">
            {state.messages
              .filter((m: any) => state.selectedSourceIds.length === 0 || state.selectedSourceIds.includes(m.source_id))
              .map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isSelected={state.selectedMessageIds.includes(message.id)}
                onToggleSelect={() => dispatch({ type: 'TOGGLE_MESSAGE_SELECTION', payload: message.id })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
