import React, { useState } from 'react';
import { Copy, Check, Forward, Link2, Sparkles, CheckSquare, Square } from 'lucide-react';
import { SourceAvatar } from '../icons/AppIcons';

// Pick another chat to invite this message into. The message stays where it
// lives; the other chat just points at it.
function InvitePicker({ chats, currentChatId, onPick, onClose }) {
  const targets = chats.filter((c) => c.id !== currentChatId);
  return (
    <div className="invite-picker" onMouseLeave={onClose}>
      <div className="invite-picker-title">Invite into…</div>
      {targets.length === 0 && <div className="invite-picker-empty">No other chats yet</div>}
      {targets.map((c) => (
        <button key={c.id} onClick={() => { onPick(c.id); onClose(); }}>
          {c.title}
        </button>
      ))}
      <button className="invite-picker-new" onClick={() => { onPick('__new__'); onClose(); }}>
        + New chat with this
      </button>
    </div>
  );
}

export function MessageCard({
  message,
  sourceName,
  chats = [],
  currentChatId,
  onInvite,
  selectable = false,
  selected = false,
  onToggleSelect,
  onOpenChat
}) {
  const [copied, setCopied] = useState(false);
  const [picking, setPicking] = useState(false);
  const isUser = message.role === 'user';
  const isSynthesis = message.kind === 'synthesis';
  const text = message.content || message.body || '';
  const author = isUser ? 'You' : sourceName || message.model || message.source || 'Assistant';

  function handleCopy() {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  // Parse fenced code blocks ```
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <article
      className={`message-card ${isUser ? 'user' : ''} ${message.error ? 'errored' : ''} ${selected ? 'selected' : ''} ${message.linked ? 'linked' : ''}`}
    >
      {message.linked && (
        <button
          className="message-provenance"
          title="Invited from another chat — it still lives there"
          onClick={() => onOpenChat && onOpenChat(message.chat_id)}
        >
          <Link2 size={10} /> from “{message.origin_title || 'another chat'}”
        </button>
      )}
      {message.chat_title && !message.linked && (
        <button className="message-provenance" onClick={() => onOpenChat && onOpenChat(message.chat_id)}>
          in “{message.chat_title}”
        </button>
      )}
      <div className="message-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {!isUser && <SourceAvatar source={message.model || message.source || 'AI'} compact />}
          <span className="message-card-author">{author}</span>
          {isSynthesis && (
            <span className="message-kind">
              <Sparkles size={10} /> synthesis
            </span>
          )}
          {message.error ? <span className="message-kind failed">failed</span> : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
          <span style={{ fontSize: '11px', color: 'var(--tom-text-dim)' }}>
            {message.created_at || ''}
          </span>
          {selectable && !isUser && !message.error && (
            <button
              className={`action-pill-btn ${selected ? 'active' : ''}`}
              style={{ padding: '2px 5px', fontSize: '10px' }}
              title={selected ? 'Remove from combine selection' : 'Select for combine'}
              onClick={() => onToggleSelect && onToggleSelect(message.id)}
            >
              {selected ? <CheckSquare size={10} /> : <Square size={10} />}
            </button>
          )}
          {onInvite && !message.error && (
            <button
              className="action-pill-btn"
              style={{ padding: '2px 5px', fontSize: '10px' }}
              title="Invite this message into another chat"
              onClick={() => setPicking(!picking)}
            >
              <Forward size={10} />
            </button>
          )}
          {picking && (
            <InvitePicker
              chats={chats}
              currentChatId={currentChatId}
              onPick={(chatId) => onInvite(message, chatId)}
              onClose={() => setPicking(false)}
            />
          )}
          <button
            className="action-pill-btn"
            style={{ padding: '2px 5px', fontSize: '10px' }}
            title="Copy message text"
            onClick={handleCopy}
          >
            {copied ? <Check size={10} style={{ color: 'var(--tom-green)' }} /> : <Copy size={10} />}
          </button>
        </div>
      </div>

      <div className="message-body">
        {parts.map((part, idx) => {
          if (part.startsWith('```') && part.endsWith('```')) {
            const lines = part.slice(3, -3).trim().split('\n');
            const lang = lines[0] && !lines[0].includes(' ') ? lines[0] : '';
            const code = lang ? lines.slice(1).join('\n') : lines.join('\n');
            return (
              <div key={idx} className="code-block-container">
                <div className="code-block-header">
                  <span>{lang || 'code'}</span>
                  <button
                    className="action-pill-btn"
                    style={{ padding: '2px 5px', fontSize: '10px' }}
                    onClick={() => navigator.clipboard?.writeText(code)}
                  >
                    <Copy size={10} />
                  </button>
                </div>
                <pre className="code-pre">
                  <code>{code}</code>
                </pre>
              </div>
            );
          }
          return (
            <p key={idx} style={{ margin: '4px 0', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
              {part}
            </p>
          );
        })}
      </div>
    </article>
  );
}
