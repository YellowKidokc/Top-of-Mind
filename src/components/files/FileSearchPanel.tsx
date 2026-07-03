import { useApp } from '@/store/AppContext';
import { useState } from 'react';
import { Search, FolderSearch, File, Loader2 } from 'lucide-react';
import * as api from '@/lib/api/client';

export function FileSearchPanel() {
  const { state, dispatch, loadFileCache } = useApp();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) {
      loadFileCache();
      return;
    }
    setIsSearching(true);
    try {
      const results = await api.searchFileCache(query);
      dispatch({ type: 'SET_FILE_CACHE', payload: results });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: 'File search failed' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAttach = (file: typeof state.fileCache[0]) => {
    dispatch({
      type: 'ADD_CONTEXT',
      payload: { type: 'file', id: file.id, label: file.name || file.path },
    });
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[hsl(var(--tom-bg))]">
      {/* Header */}
      <div className="h-10 border-b border-[hsl(var(--tom-border))] flex items-center px-4 shrink-0">
        <FolderSearch size={16} className="text-[hsl(var(--tom-gold-dim))] mr-2" />
        <span className="text-sm font-medium text-[hsl(var(--tom-text))]">File Search</span>
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
              placeholder="Search by name, path, or tag..."
              className="flex-1 py-2 bg-transparent text-sm text-[hsl(var(--tom-text))] placeholder:text-[hsl(var(--tom-text-dim))] focus:outline-none"
            />
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

      {/* Results */}
      <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-[hsl(var(--tom-border))]/30">
        {state.fileCache.map((file) => (
          <div key={file.id} className="px-4 py-3 hover:bg-[hsl(var(--tom-bg-surface))]/50 transition-colors group">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <File size={14} className="mt-0.5 shrink-0 text-[hsl(var(--tom-gold-dim))]" />
                <div className="min-w-0">
                  <div className="text-sm text-[hsl(var(--tom-text))] truncate">{file.name || file.path}</div>
                  <div className="text-xs text-[hsl(var(--tom-text-dim))] truncate mt-0.5">{file.path}</div>
                  <div className="flex items-center gap-3 mt-1.5">
                    {file.type && (
                      <span className="text-xs px-1.5 py-0.5 bg-[hsl(var(--tom-bg-surface))] text-[hsl(var(--tom-text-muted))] rounded border border-[hsl(var(--tom-border))]">
                        {file.type}
                      </span>
                    )}
                    {file.tier && (
                      <span className="text-xs text-[hsl(var(--tom-text-dim))]">{file.tier}</span>
                    )}
                    {file.owner && (
                      <span className="text-xs text-[hsl(var(--tom-text-dim))]">{file.owner}</span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleAttach(file)}
                className="opacity-0 group-hover:opacity-100 text-xs px-2 py-1 bg-[hsl(var(--tom-bg-surface))] text-[hsl(var(--tom-gold))] rounded border border-[hsl(var(--tom-gold-dim))]/30 transition-all shrink-0"
              >
                Attach
              </button>
            </div>
          </div>
        ))}
        {state.fileCache.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <FolderSearch size={32} className="text-[hsl(var(--tom-text-dim))] mb-2" />
            <p className="text-sm text-[hsl(var(--tom-text-muted))]">No cached files</p>
            <p className="text-xs text-[hsl(var(--tom-text-dim))] mt-1">Search to find files</p>
          </div>
        )}
      </div>
    </div>
  );
}
