import { useApp } from '@/store/AppContext';
import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  X,
  BookOpen,
  FolderSearch,
  FileText,
  CornerDownLeft,
} from 'lucide-react';

export function Composer() {
  const { state, dispatch, sendMessage } = useApp();
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync with global state
  useEffect(() => {
    dispatch({ type: 'SET_COMPOSER_TEXT', payload: text });
  }, [text, dispatch]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }
  }, [text]);

  const handleSend = async () => {
    if (!text.trim()) return;
    const content = text.trim();
    setText('');
    await sendMessage(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const removeContext = (id: string) => {
    dispatch({ type: 'REMOVE_CONTEXT', payload: id });
  };

  return (
    <div className="shrink-0 border-t border-[hsl(var(--tom-border))] bg-[hsl(var(--tom-bg-elevated))]">
      {/* Attached context chips */}
      {state.attachedContext.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[hsl(var(--tom-border))]/50 overflow-x-auto">
          <span className="text-xs text-[hsl(var(--tom-text-dim))] shrink-0">Context:</span>
          {state.attachedContext.map((ctx) => (
            <span
              key={ctx.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-[hsl(var(--tom-bg-surface))] text-[hsl(var(--tom-gold))] rounded-full border border-[hsl(var(--tom-gold-dim))]/30 shrink-0"
            >
              {ctx.type === 'knowledge' && <BookOpen size={10} />}
              {ctx.type === 'file' && <FolderSearch size={10} />}
              {ctx.type === 'markdown' && <FileText size={10} />}
              <span className="truncate max-w-[150px]">{ctx.label}</span>
              <button
                onClick={() => removeContext(ctx.id)}
                className="ml-0.5 hover:text-[hsl(var(--tom-red))] transition-colors"
              >
                <X size={10} />
              </button>
            </span>
          ))}
          <button
            onClick={() => dispatch({ type: 'CLEAR_CONTEXT' })}
            className="text-xs text-[hsl(var(--tom-text-dim))] hover:text-[hsl(var(--tom-text-muted))] transition-colors shrink-0"
          >
            Clear
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="px-4 py-3">
        <div className="flex items-end gap-2 bg-[hsl(var(--tom-bg))] border border-[hsl(var(--tom-border))] rounded-lg focus-within:border-[hsl(var(--tom-gold-dim))] transition-colors">
          {/* Attach button */}
          <button
            className="p-2.5 text-[hsl(var(--tom-text-dim))] hover:text-[hsl(var(--tom-gold))] transition-colors shrink-0"
            title="Attach context"
          >
            <Paperclip size={18} />
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Shift+Enter for new line)"
            rows={1}
            className="flex-1 py-2.5 bg-transparent text-sm text-[hsl(var(--tom-text))] placeholder:text-[hsl(var(--tom-text-dim))] resize-none focus:outline-none max-h-[200px] scrollbar-thin"
          />

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className={`p-2.5 mr-1 mb-1 rounded-md transition-all shrink-0 ${
              text.trim()
                ? 'bg-[hsl(var(--tom-gold))] text-[hsl(var(--tom-bg))] hover:bg-[hsl(var(--tom-gold-dim))]'
                : 'text-[hsl(var(--tom-text-dim))] cursor-not-allowed'
            }`}
            title="Send message"
          >
            <Send size={16} />
          </button>
        </div>

        {/* Hint */}
        <div className="flex items-center justify-between mt-1.5 px-1">
          <span className="text-xs text-[hsl(var(--tom-text-dim))]">
            API: {state.settings.apiBaseUrl}
          </span>
          <span className="text-xs text-[hsl(var(--tom-text-dim))] flex items-center gap-1">
            <CornerDownLeft size={10} />
            Enter to send
          </span>
        </div>
      </div>
    </div>
  );
}
