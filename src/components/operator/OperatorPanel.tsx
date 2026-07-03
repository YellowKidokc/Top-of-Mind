import { useApp } from '@/store/AppContext';
import { useState } from 'react';
import { Terminal, AlertTriangle, Send, FilePlus, FileEdit, Command, Trash2 } from 'lucide-react';
import * as api from '@/lib/api/client';
import type { OperatorAction } from '@/types';

export function OperatorPanel() {
  const { dispatch } = useApp();
  const [actionType, setActionType] = useState<OperatorAction['action_type']>('write_text');
  const [targetPath, setTargetPath] = useState('');
  const [content, setContent] = useState('');
  const [command, setCommand] = useState('');
  const [reviewRequired, setReviewRequired] = useState(true);
  const [pendingActions, setPendingActions] = useState<OperatorAction[]>([]);

  const isDestructive = actionType === 'delete' || actionType === 'move';

  const handleQueue = () => {
    const action: OperatorAction = {
      action_type: actionType,
      target_path: targetPath || undefined,
      content: actionType === 'command' ? command : content || undefined,
      review_required: isDestructive ? true : reviewRequired,
      status: 'draft',
    };
    setPendingActions((prev) => [...prev, action]);
    setContent('');
    setCommand('');
  };

  const handleExecute = async (action: OperatorAction, index: number) => {
    try {
      if (action.action_type === 'command') {
        await api.postOperatorCommand({ command: action.content || '' });
      } else {
        await api.postFileAction(action);
      }
      setPendingActions((prev) => prev.filter((_, i) => i !== index));
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Action failed' });
    }
  };

  const handleRemove = (index: number) => {
    setPendingActions((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[hsl(var(--tom-bg))]">
      {/* Header */}
      <div className="h-10 border-b border-[hsl(var(--tom-border))] flex items-center px-4 shrink-0">
        <Terminal size={16} className="text-[hsl(var(--tom-gold-dim))] mr-2" />
        <span className="text-sm font-medium text-[hsl(var(--tom-text))]">Operator</span>
        {isDestructive && (
          <span className="ml-2 flex items-center gap-1 text-xs text-[hsl(var(--tom-red))] bg-[hsl(var(--tom-red))]/10 px-2 py-0.5 rounded">
            <AlertTriangle size={10} />
            Destructive
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        {/* Action type selector */}
        <div>
          <label className="text-xs font-medium text-[hsl(var(--tom-text-muted))] uppercase tracking-wider">Action Type</label>
          <div className="flex gap-2 mt-1.5">
            {([
              { value: 'write_text', label: 'Write', icon: FilePlus },
              { value: 'append_text', label: 'Append', icon: FileEdit },
              { value: 'command', label: 'Command', icon: Command },
              { value: 'delete', label: 'Delete', icon: Trash2 },
            ] as const).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setActionType(value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors ${
                  actionType === value
                    ? value === 'delete'
                      ? 'bg-[hsl(var(--tom-red))]/10 text-[hsl(var(--tom-red))] border border-[hsl(var(--tom-red))]/30'
                      : 'bg-[hsl(var(--tom-gold))]/10 text-[hsl(var(--tom-gold))] border border-[hsl(var(--tom-gold-dim))]/30'
                    : 'bg-[hsl(var(--tom-bg-surface))] text-[hsl(var(--tom-text-muted))] border border-[hsl(var(--tom-border))] hover:text-[hsl(var(--tom-text))]'
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Target path */}
        <div>
          <label className="text-xs font-medium text-[hsl(var(--tom-text-muted))] uppercase tracking-wider">
            {actionType === 'command' ? 'Working Directory (optional)' : 'File Path'}
          </label>
          <input
            value={targetPath}
            onChange={(e) => setTargetPath(e.target.value)}
            placeholder={actionType === 'command' ? '/path/to/working/dir' : '/path/to/file.txt'}
            className="w-full mt-1.5 px-3 py-2 text-sm bg-[hsl(var(--tom-bg-elevated))] border border-[hsl(var(--tom-border))] rounded-md text-[hsl(var(--tom-text))] placeholder:text-[hsl(var(--tom-text-dim))] focus:outline-none focus:border-[hsl(var(--tom-gold-dim))]"
          />
        </div>

        {/* Content / Command */}
        <div>
          <label className="text-xs font-medium text-[hsl(var(--tom-text-muted))] uppercase tracking-wider">
            {actionType === 'command' ? 'Command' : 'Content'}
          </label>
          {actionType === 'command' ? (
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Enter command..."
              className="w-full mt-1.5 px-3 py-2 text-sm bg-[hsl(var(--tom-bg-elevated))] border border-[hsl(var(--tom-border))] rounded-md text-[hsl(var(--tom-text))] placeholder:text-[hsl(var(--tom-text-dim))] focus:outline-none focus:border-[hsl(var(--tom-gold-dim))] font-mono"
            />
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter file content..."
              rows={6}
              className="w-full mt-1.5 px-3 py-2 text-sm bg-[hsl(var(--tom-bg-elevated))] border border-[hsl(var(--tom-border))] rounded-md text-[hsl(var(--tom-text))] placeholder:text-[hsl(var(--tom-text-dim))] focus:outline-none focus:border-[hsl(var(--tom-gold-dim))] resize-none font-mono"
            />
          )}
        </div>

        {/* Review toggle */}
        {!isDestructive && (
          <label className="flex items-center gap-2 text-sm text-[hsl(var(--tom-text-muted))] cursor-pointer">
            <input
              type="checkbox"
              checked={reviewRequired}
              onChange={(e) => setReviewRequired(e.target.checked)}
              className="rounded border-[hsl(var(--tom-border))]"
            />
            Require review before executing
          </label>
        )}

        {/* Queue button */}
        <button
          onClick={handleQueue}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[hsl(var(--tom-bg-surface))] hover:bg-[hsl(var(--tom-border))] text-[hsl(var(--tom-text))] rounded-md transition-colors border border-[hsl(var(--tom-border))]"
        >
          <Send size={14} />
          Queue Action
        </button>

        {/* Pending actions */}
        {pendingActions.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xs font-semibold text-[hsl(var(--tom-text-muted))] uppercase tracking-wider mb-3">
              Pending Actions ({pendingActions.length})
            </h3>
            <div className="space-y-2">
              {pendingActions.map((action, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-md border ${
                    action.action_type === 'delete'
                      ? 'border-[hsl(var(--tom-red))]/30 bg-[hsl(var(--tom-red))]/5'
                      : 'border-[hsl(var(--tom-border))] bg-[hsl(var(--tom-bg-elevated))]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        action.action_type === 'delete'
                          ? 'bg-[hsl(var(--tom-red))]/10 text-[hsl(var(--tom-red))]'
                          : action.action_type === 'command'
                          ? 'bg-[hsl(var(--tom-blue))]/10 text-[hsl(var(--tom-blue))]'
                          : 'bg-[hsl(var(--tom-gold))]/10 text-[hsl(var(--tom-gold))]'
                      }`}>
                        {action.action_type}
                      </span>
                      {action.review_required && (
                        <span className="text-xs text-[hsl(var(--tom-text-dim))]">review required</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleExecute(action, index)}
                        className="px-2 py-0.5 text-xs bg-[hsl(var(--tom-green))]/10 text-[hsl(var(--tom-green))] rounded hover:bg-[hsl(var(--tom-green))]/20 transition-colors"
                      >
                        Run
                      </button>
                      <button
                        onClick={() => handleRemove(index)}
                        className="px-2 py-0.5 text-xs text-[hsl(var(--tom-text-dim))] hover:text-[hsl(var(--tom-red))] transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  {action.target_path && (
                    <div className="text-xs text-[hsl(var(--tom-text-dim))] mt-1 font-mono">{action.target_path}</div>
                  )}
                  {action.content && (
                    <div className="text-xs text-[hsl(var(--tom-text-muted))] mt-1 line-clamp-2">{action.content}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
