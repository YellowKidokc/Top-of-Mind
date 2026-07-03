import { useApp } from '@/store/AppContext';
import { useState } from 'react';
import { Search, Plus, Sparkles, BookOpen, Tag, Loader2 } from 'lucide-react';
import * as api from '@/lib/api/client';

export function KnowledgePanel() {
  const { state, dispatch, loadMemoryItems } = useApp();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'text' | 'vector'>('text');
  const [isSearching, setIsSearching] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) {
      loadMemoryItems();
      return;
    }
    setIsSearching(true);
    try {
      const results = await api.searchMemory(query, mode === 'vector' ? 'vector' : undefined);
      dispatch({ type: 'SET_MEMORY_ITEMS', payload: results });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Search failed' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAdd = async () => {
    if (!newContent.trim()) return;
    try {
      await api.createMemoryItem({
        content: newContent,
        tags: newTags.split(',').map((t) => t.trim()).filter(Boolean),
      });
      setNewContent('');
      setNewTags('');
      setShowAdd(false);
      loadMemoryItems();
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to add memory item' });
    }
  };

  const handleEmbed = async () => {
    try {
      await api.embedPending();
      loadMemoryItems();
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'Embed failed' });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[hsl(var(--tom-bg))]">
      {/* Header */}
      <div className="h-10 border-b border-[hsl(var(--tom-border))] flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-[hsl(var(--tom-gold-dim))]" />
          <span className="text-sm font-medium text-[hsl(var(--tom-text))]">Knowledge Bank</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-[hsl(var(--tom-gold))] hover:bg-[hsl(var(--tom-gold-dim))] text-[hsl(var(--tom-bg))] rounded transition-colors"
          >
            <Plus size={12} />
            Add
          </button>
          <button
            onClick={handleEmbed}
            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-[hsl(var(--tom-bg-surface))] hover:bg-[hsl(var(--tom-border))] text-[hsl(var(--tom-text))] rounded transition-colors border border-[hsl(var(--tom-border))]"
          >
            <Sparkles size={12} />
            Embed Pending
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-[hsl(var(--tom-border))]">
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-[hsl(var(--tom-bg-elevated))] border border-[hsl(var(--tom-border))] rounded-md px-3">
            <Search size={14} className="text-[hsl(var(--tom-text-dim))]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search knowledge..."
              className="flex-1 py-2 bg-transparent text-sm text-[hsl(var(--tom-text))] placeholder:text-[hsl(var(--tom-text-dim))] focus:outline-none"
            />
          </div>
          <div className="flex items-center bg-[hsl(var(--tom-bg-elevated))] border border-[hsl(var(--tom-border))] rounded-md overflow-hidden">
            <button
              onClick={() => setMode('text')}
              className={`px-3 py-2 text-xs transition-colors ${mode === 'text' ? 'bg-[hsl(var(--tom-bg-surface))] text-[hsl(var(--tom-gold))]' : 'text-[hsl(var(--tom-text-muted))]'}`}
            >
              Text
            </button>
            <button
              onClick={() => setMode('vector')}
              className={`px-3 py-2 text-xs transition-colors ${mode === 'vector' ? 'bg-[hsl(var(--tom-bg-surface))] text-[hsl(var(--tom-gold))]' : 'text-[hsl(var(--tom-text-muted))]'}`}
            >
              Vector
            </button>
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-3 py-2 bg-[hsl(var(--tom-bg-surface))] hover:bg-[hsl(var(--tom-border))] text-[hsl(var(--tom-text))] rounded-md transition-colors border border-[hsl(var(--tom-border))]"
          >
            {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="px-4 py-3 border-b border-[hsl(var(--tom-border))] bg-[hsl(var(--tom-bg-elevated))]">
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Enter knowledge content..."
            rows={4}
            className="w-full px-3 py-2 bg-[hsl(var(--tom-bg))] border border-[hsl(var(--tom-border))] rounded-md text-sm text-[hsl(var(--tom-text))] placeholder:text-[hsl(var(--tom-text-dim))] focus:outline-none focus:border-[hsl(var(--tom-gold-dim))] resize-none"
          />
          <div className="flex items-center gap-2 mt-2">
            <input
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder="Tags (comma separated)"
              className="flex-1 px-3 py-1.5 bg-[hsl(var(--tom-bg))] border border-[hsl(var(--tom-border))] rounded-md text-sm text-[hsl(var(--tom-text))] placeholder:text-[hsl(var(--tom-text-dim))] focus:outline-none focus:border-[hsl(var(--tom-gold-dim))]"
            />
            <button
              onClick={handleAdd}
              className="px-4 py-1.5 text-sm bg-[hsl(var(--tom-gold))] hover:bg-[hsl(var(--tom-gold-dim))] text-[hsl(var(--tom-bg))] rounded transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Items list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-[hsl(var(--tom-border))]/30">
        {state.memoryItems.map((item) => (
          <div key={item.id} className="px-4 py-3 hover:bg-[hsl(var(--tom-bg-surface))]/50 transition-colors group">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-[hsl(var(--tom-text))] leading-relaxed flex-1">{item.content}</p>
              <button
                onClick={() => dispatch({
                  type: 'ADD_CONTEXT',
                  payload: { type: 'knowledge', id: item.id, label: item.content.slice(0, 40) + '...' }
                })}
                className="opacity-0 group-hover:opacity-100 text-xs px-2 py-1 bg-[hsl(var(--tom-bg-surface))] text-[hsl(var(--tom-gold))] rounded border border-[hsl(var(--tom-gold-dim))]/30 transition-all shrink-0"
              >
                Attach
              </button>
            </div>
            <div className="flex items-center gap-3 mt-2">
              {item.source && (
                <span className="text-xs text-[hsl(var(--tom-text-dim))]">{item.source}</span>
              )}
              {item.tags && item.tags.length > 0 && (
                <div className="flex items-center gap-1">
                  <Tag size={10} className="text-[hsl(var(--tom-text-dim))]" />
                  {item.tags.map((tag) => (
                    <span key={tag} className="text-xs text-[hsl(var(--tom-gold-dim))]">{tag}</span>
                  ))}
                </div>
              )}
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                item.embedding_status === 'embedded'
                  ? 'bg-[hsl(var(--tom-green))]/10 text-[hsl(var(--tom-green))]'
                  : item.embedding_status === 'pending'
                  ? 'bg-[hsl(var(--tom-gold))]/10 text-[hsl(var(--tom-gold))]'
                  : 'bg-[hsl(var(--tom-red))]/10 text-[hsl(var(--tom-red))]'
              }`}>
                {item.embedding_status}
              </span>
            </div>
          </div>
        ))}
        {state.memoryItems.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <BookOpen size={32} className="text-[hsl(var(--tom-text-dim))] mb-2" />
            <p className="text-sm text-[hsl(var(--tom-text-muted))]">No knowledge items yet</p>
            <p className="text-xs text-[hsl(var(--tom-text-dim))] mt-1">Add items or search to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}
