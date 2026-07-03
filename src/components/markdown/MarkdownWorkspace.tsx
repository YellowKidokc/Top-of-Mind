import { useApp } from '@/store/AppContext';
import { useState, useCallback } from 'react';
import { FileText, Copy, Save, Sparkles, Eye, Edit3 } from 'lucide-react';
import * as api from '@/lib/api/client';

export function MarkdownWorkspace() {
  const { state, dispatch, loadMemoryItems } = useApp();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<number | undefined>();
  const [embedAfterSave, setEmbedAfterSave] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) return;
    try {
      await api.createMemoryItem({
        content: `[${title || 'Untitled'}]\n${content}`,
        source: 'markdown-workspace',
        folder_code: selectedFolder,
        tags: ['markdown'],
      });
      if (embedAfterSave) {
        await api.embedPending();
      }
      loadMemoryItems();
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to save markdown' });
    }
  };

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content);
  }, [content]);

  const handleAttach = useCallback(() => {
    if (!content.trim()) return;
    dispatch({
      type: 'ADD_CONTEXT',
      payload: { type: 'markdown', id: `md-${Date.now()}`, label: title || 'Markdown Note' },
    });
  }, [content, title, dispatch]);

  // Simple markdown preview renderer
  const renderPreview = (md: string): string => {
    return md
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-5 mb-3">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/`([^`]+)`/gim, '<code class="px-1.5 py-0.5 bg-[hsl(var(--tom-bg-surface))] rounded text-sm font-mono">$1</code>')
      .replace(/^\> (.*$)/gim, '<blockquote class="border-l-2 border-[hsl(var(--tom-gold-dim))] pl-3 my-2 text-[hsl(var(--tom-text-muted))]">$1</blockquote>')
      .replace(/^\- (.*$)/gim, '<li class="ml-4">$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li class="ml-4">$1</li>')
      .replace(/\n/gim, '<br />');
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[hsl(var(--tom-bg))]">
      {/* Header */}
      <div className="h-10 border-b border-[hsl(var(--tom-border))] flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-[hsl(var(--tom-gold-dim))]" />
          <span className="text-sm font-medium text-[hsl(var(--tom-text))]">Markdown Workspace</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded transition-colors ${showPreview ? 'text-[hsl(var(--tom-gold))] bg-[hsl(var(--tom-gold))]/10' : 'text-[hsl(var(--tom-text-muted))] hover:bg-[hsl(var(--tom-bg-surface))]'}`}
          >
            {showPreview ? <Eye size={12} /> : <Edit3 size={12} />}
            {showPreview ? 'Preview' : 'Edit'}
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-[hsl(var(--tom-text-muted))] hover:text-[hsl(var(--tom-text))] hover:bg-[hsl(var(--tom-bg-surface))] rounded transition-colors"
          >
            <Copy size={12} />
            Copy
          </button>
          <button
            onClick={handleAttach}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-[hsl(var(--tom-text-muted))] hover:text-[hsl(var(--tom-gold))] hover:bg-[hsl(var(--tom-bg-surface))] rounded transition-colors"
          >
            <FileText size={12} />
            Attach
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-[hsl(var(--tom-gold))] hover:bg-[hsl(var(--tom-gold-dim))] text-[hsl(var(--tom-bg))] rounded transition-colors"
          >
            <Save size={12} />
            Save
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-4 py-2 border-b border-[hsl(var(--tom-border))] flex items-center gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title..."
          className="flex-1 max-w-xs px-3 py-1.5 text-sm bg-[hsl(var(--tom-bg-elevated))] border border-[hsl(var(--tom-border))] rounded-md text-[hsl(var(--tom-text))] placeholder:text-[hsl(var(--tom-text-dim))] focus:outline-none focus:border-[hsl(var(--tom-gold-dim))]"
        />
        <select
          value={selectedFolder || ''}
          onChange={(e) => setSelectedFolder(e.target.value ? Number(e.target.value) : undefined)}
          className="px-3 py-1.5 text-sm bg-[hsl(var(--tom-bg-elevated))] border border-[hsl(var(--tom-border))] rounded-md text-[hsl(var(--tom-text))] focus:outline-none focus:border-[hsl(var(--tom-gold-dim))]"
        >
          <option value="">No folder</option>
          {state.folders.map((f) => (
            <option key={f.id} value={f.folder_code}>{f.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-[hsl(var(--tom-text-muted))] cursor-pointer">
          <input
            type="checkbox"
            checked={embedAfterSave}
            onChange={(e) => setEmbedAfterSave(e.target.checked)}
            className="rounded border-[hsl(var(--tom-border))]"
          />
          <Sparkles size={12} />
          Embed after save
        </label>
      </div>

      {/* Editor + Preview */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        <div className={`${showPreview ? 'flex-1' : 'flex-1'} flex flex-col min-w-0`}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="# Start writing markdown...\n\nUse **bold**, *italic*, `code`, and more."
            className="flex-1 p-4 bg-transparent text-sm text-[hsl(var(--tom-text))] placeholder:text-[hsl(var(--tom-text-dim))] resize-none focus:outline-none font-mono leading-relaxed scrollbar-thin"
          />
        </div>

        {/* Preview */}
        {showPreview && (
          <>
            <div className="w-px bg-[hsl(var(--tom-border))]" />
            <div className="flex-1 min-w-0 overflow-y-auto scrollbar-thin">
              <div
                className="p-4 text-sm text-[hsl(var(--tom-text))] leading-relaxed prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: renderPreview(content) || '<span class="text-[hsl(var(--tom-text-dim))]">Preview will appear here...</span>' }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
