import { useApp } from '@/store/AppContext';
import { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  MessageSquare,
  Terminal,
  Bot,
  Cpu,
  Wrench,
  BookOpen,
  FileText,
  FolderSearch,
  Cog,
} from 'lucide-react';
import type { Folder } from '@/types';
import * as api from '@/lib/api/client';

// ===== CHAT SIDEBAR =====
function ChatSidebar() {
  const { state, dispatch, loadFolders, loadMessages } = useApp();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    dispatch({ type: 'SET_LOADING', payload: true });
    Promise.all([loadFolders(), loadMessages()]).finally(() => {
      dispatch({ type: 'SET_LOADING', payload: false });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const rootFolders = state.folders.filter((f) => !f.parent_id && !f.archived);
  const getChildFolders = (parentId: string) => state.folders.filter((f) => f.parent_id === parentId && !f.archived);

  const renderFolder = (folder: Folder, depth = 0) => {
    const children = getChildFolders(folder.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedFolders.has(folder.id);
    const paddingLeft = depth * 12 + 8;

    return (
      <div key={folder.id}>
        <button
          onClick={() => hasChildren ? toggleFolder(folder.id) : undefined}
          className="w-full flex items-center gap-1.5 px-2 py-1.5 text-sm text-[hsl(var(--tom-text-muted))] hover:text-[hsl(var(--tom-text))] hover:bg-[hsl(var(--tom-bg-surface))] rounded-md transition-colors"
          style={{ paddingLeft }}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : (
            <span className="w-3.5" />
          )}
          <FolderOpen size={14} className="text-[hsl(var(--tom-gold-dim))]" />
          <span className="truncate">{folder.name}</span>
        </button>
        {hasChildren && isExpanded && (
          <div>{children.map((child) => renderFolder(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-[hsl(var(--tom-border))]">
        <button
          onClick={() => dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: null })}
          className="w-full flex items-center gap-2 px-3 py-2 bg-[hsl(var(--tom-gold))] hover:bg-[hsl(var(--tom-gold-dim))] text-[hsl(var(--tom-bg))] rounded-md text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          New Chat
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pt-2">
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-[hsl(var(--tom-text-muted))] hover:text-[hsl(var(--tom-text))] hover:bg-[hsl(var(--tom-bg-surface))] rounded-md transition-colors border border-[hsl(var(--tom-border))]"
        >
          <Search size={14} />
          <span>Search Chats</span>
        </button>
        {searchOpen && (
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full mt-2 px-3 py-1.5 text-sm bg-[hsl(var(--tom-bg))] border border-[hsl(var(--tom-border))] rounded-md text-[hsl(var(--tom-text))] placeholder:text-[hsl(var(--tom-text-dim))] focus:outline-none focus:border-[hsl(var(--tom-gold-dim))]"
          />
        )}
      </div>

      {/* Folder tree */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2">
        {state.isLoading && state.folders.length === 0 ? (
          <div className="text-sm text-[hsl(var(--tom-text-dim))] px-3 py-4 text-center">Loading folders...</div>
        ) : (
          rootFolders.map((folder) => renderFolder(folder))
        )}

        {/* Messages grouped by folder */}
        {state.messages.length > 0 && (
          <div className="mt-4">
            <div className="px-3 py-1 text-xs font-semibold text-[hsl(var(--tom-text-dim))] uppercase tracking-wider">
              Recent Messages
            </div>
            {state.messages.slice(-20).reverse().map((msg) => (
              <button
                key={msg.id}
                onClick={() => dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: msg.conversation_id || msg.id })}
                className="w-full flex items-start gap-2 px-3 py-2 text-sm text-[hsl(var(--tom-text-muted))] hover:text-[hsl(var(--tom-text))] hover:bg-[hsl(var(--tom-bg-surface))] rounded-md transition-colors text-left"
              >
                <MessageSquare size={14} className="mt-0.5 shrink-0 text-[hsl(var(--tom-text-dim))]" />
                <span className="truncate">{msg.content.slice(0, 60)}{msg.content.length > 60 ? '...' : ''}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ===== KNOWLEDGE SIDEBAR =====
function KnowledgeSidebar() {
  const { state, dispatch, loadMemoryItems } = useApp();

  useEffect(() => {
    loadMemoryItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-[hsl(var(--tom-border))]">
        <h3 className="text-sm font-semibold text-[hsl(var(--tom-text))]">Knowledge Bank</h3>
        <p className="text-xs text-[hsl(var(--tom-text-muted))] mt-0.5">{state.memoryItems.length} items</p>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2">
        {state.memoryItems.map((item) => (
          <button
            key={item.id}
            onClick={() => dispatch({
              type: 'ADD_CONTEXT',
              payload: { type: 'knowledge', id: item.id, label: item.content.slice(0, 40) + '...' }
            })}
            className="w-full flex items-start gap-2 px-3 py-2 text-sm text-[hsl(var(--tom-text-muted))] hover:text-[hsl(var(--tom-text))] hover:bg-[hsl(var(--tom-bg-surface))] rounded-md transition-colors text-left"
          >
            <BookOpen size={14} className="mt-0.5 shrink-0 text-[hsl(var(--tom-gold-dim))]" />
            <span className="truncate">{item.content.slice(0, 50)}{item.content.length > 50 ? '...' : ''}</span>
          </button>
        ))}
        {state.memoryItems.length === 0 && (
          <div className="text-sm text-[hsl(var(--tom-text-dim))] px-3 py-4 text-center">No knowledge items yet</div>
        )}
      </div>
    </div>
  );
}

// ===== PLACEHOLDER SIDEBARS =====
function PlaceholderSidebar({ title, icon: Icon, description }: { title: string; icon: typeof Bot; description: string }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-[hsl(var(--tom-border))]">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-[hsl(var(--tom-gold-dim))]" />
          <h3 className="text-sm font-semibold text-[hsl(var(--tom-text))]">{title}</h3>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <Icon size={32} className="text-[hsl(var(--tom-text-dim))] mb-3" />
        <p className="text-sm text-[hsl(var(--tom-text-muted))]">{description}</p>
      </div>
    </div>
  );
}

// ===== SETTINGS SIDEBAR =====
function SettingsSidebar() {
  const { state, dispatch, checkConnection } = useApp();
  const [urlInput, setUrlInput] = useState(state.settings.apiBaseUrl);

  const handleSave = () => {
    api.setBaseUrl(urlInput);
    dispatch({ type: 'SET_SETTINGS', payload: { apiBaseUrl: urlInput } });
    checkConnection();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-[hsl(var(--tom-border))]">
        <div className="flex items-center gap-2">
          <Cog size={16} className="text-[hsl(var(--tom-gold-dim))]" />
          <h3 className="text-sm font-semibold text-[hsl(var(--tom-text))]">Settings</h3>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-4">
        {/* API URL */}
        <div>
          <label className="text-xs font-medium text-[hsl(var(--tom-text-muted))] uppercase tracking-wider">API Base URL</label>
          <div className="flex gap-2 mt-1.5">
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm bg-[hsl(var(--tom-bg))] border border-[hsl(var(--tom-border))] rounded-md text-[hsl(var(--tom-text))] focus:outline-none focus:border-[hsl(var(--tom-gold-dim))]"
            />
            <button
              onClick={handleSave}
              className="px-3 py-1.5 text-sm bg-[hsl(var(--tom-bg-surface))] hover:bg-[hsl(var(--tom-border))] text-[hsl(var(--tom-text))] rounded-md transition-colors border border-[hsl(var(--tom-border))]"
            >
              Save
            </button>
          </div>
        </div>

        {/* Connection */}
        <div>
          <label className="text-xs font-medium text-[hsl(var(--tom-text-muted))] uppercase tracking-wider">Connection</label>
          <div className="flex items-center gap-2 mt-1.5">
            <div className={`w-2 h-2 rounded-full ${state.connectionStatus === 'online' ? 'bg-[hsl(var(--tom-green))]' : 'bg-[hsl(var(--tom-red))]'}`} />
            <span className="text-sm text-[hsl(var(--tom-text-muted))]">{state.connectionStatus}</span>
            <button
              onClick={() => checkConnection()}
              className="ml-auto px-3 py-1 text-xs bg-[hsl(var(--tom-bg-surface))] hover:bg-[hsl(var(--tom-border))] text-[hsl(var(--tom-text))] rounded transition-colors border border-[hsl(var(--tom-border))]"
            >
              Test
            </button>
          </div>
        </div>

        {/* Integrations */}
        <div>
          <label className="text-xs font-medium text-[hsl(var(--tom-text-muted))] uppercase tracking-wider">Integrations</label>
          <div className="mt-2 space-y-2">
            {[
              { name: 'Syncthing', url: state.settings.syncthingUrl, status: 'placeholder' },
              { name: 'Synology', url: state.settings.synologyUrl || 'Not configured', status: 'placeholder' },
              { name: 'Cloudflare R2', url: state.settings.r2Endpoint || 'Not configured', status: 'placeholder' },
              { name: 'AutoHotkey Bridge', url: state.settings.ahkBridgeUrl || 'Not configured', status: 'placeholder' },
            ].map((integration) => (
              <div key={integration.name} className="flex items-center justify-between px-3 py-2 bg-[hsl(var(--tom-bg-surface))] rounded-md border border-[hsl(var(--tom-border))]">
                <div>
                  <div className="text-sm text-[hsl(var(--tom-text))]">{integration.name}</div>
                  <div className="text-xs text-[hsl(var(--tom-text-dim))]">{integration.url}</div>
                </div>
                <span className="text-xs px-2 py-0.5 bg-[hsl(var(--tom-bg))] text-[hsl(var(--tom-text-dim))] rounded border border-[hsl(var(--tom-border))]">
                  {integration.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== MAIN SIDEBAR =====
export function Sidebar() {
  const { state } = useApp();

  if (state.sidebarCollapsed) {
    return null;
  }

  return (
    <div className="w-64 min-w-[256px] bg-[hsl(var(--tom-bg-elevated))] border-r border-[hsl(var(--tom-border))] flex flex-col overflow-hidden">
      {state.activeSidebarView === 'chats' && <ChatSidebar />}
      {state.activeSidebarView === 'prompts' && <PlaceholderSidebar title="Prompts" icon={Terminal} description="Prompt templates and snippets will appear here." />}
      {state.activeSidebarView === 'agents' && <PlaceholderSidebar title="Agents" icon={Bot} description="AI agents and personas will appear here." />}
      {state.activeSidebarView === 'models' && <PlaceholderSidebar title="Models" icon={Cpu} description="Available AI models will appear here." />}
      {state.activeSidebarView === 'tools' && <PlaceholderSidebar title="Tools & Plugins" icon={Wrench} description="Tools and plugins will appear here." />}
      {state.activeSidebarView === 'knowledge' && <KnowledgeSidebar />}
      {state.activeSidebarView === 'markdown' && <PlaceholderSidebar title="Markdown Workspace" icon={FileText} description="Create and edit markdown notes here." />}
      {state.activeSidebarView === 'files' && <PlaceholderSidebar title="File Search" icon={FolderSearch} description="Search cached files by name, path, or tag." />}
      {state.activeSidebarView === 'operator' && <PlaceholderSidebar title="Operator" icon={Terminal} description="File actions and command operations." />}
      {state.activeSidebarView === 'settings' && <SettingsSidebar />}
    </div>
  );
}
