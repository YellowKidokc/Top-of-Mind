import { useApp } from '@/store/AppContext';
import type { SidebarView, MainView } from '@/types';
import {
  MessageSquare,
  Terminal,
  Bot,
  Cpu,
  Wrench,
  BookOpen,
  FileText,
  FolderSearch,
  Cog,
  PanelLeft,
} from 'lucide-react';

const navItems: { view: SidebarView; main: MainView; icon: typeof MessageSquare; label: string }[] = [
  { view: 'chats', main: 'chat', icon: MessageSquare, label: 'Chats' },
  { view: 'prompts', main: 'chat', icon: Terminal, label: 'Prompts' },
  { view: 'agents', main: 'chat', icon: Bot, label: 'Agents' },
  { view: 'models', main: 'chat', icon: Cpu, label: 'Models' },
  { view: 'tools', main: 'chat', icon: Wrench, label: 'Tools' },
  { view: 'knowledge', main: 'knowledge', icon: BookOpen, label: 'Knowledge' },
  { view: 'markdown', main: 'markdown', icon: FileText, label: 'Markdown' },
  { view: 'files', main: 'files', icon: FolderSearch, label: 'Files' },
  { view: 'operator', main: 'operator', icon: Terminal, label: 'Operator' },
  { view: 'settings', main: 'settings', icon: Cog, label: 'Settings' },
];

export function IconRail() {
  const { state, dispatch } = useApp();

  const handleNav = (view: SidebarView, main: MainView) => {
    dispatch({ type: 'SET_SIDEBAR_VIEW', payload: view });
    dispatch({ type: 'SET_MAIN_VIEW', payload: main });
  };

  return (
    <div className="w-12 min-w-[48px] bg-[#0a0a0a] border-r border-[hsl(var(--tom-border))] flex flex-col items-center py-3 gap-1 z-20">
      {/* Toggle sidebar */}
      <button
        onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
        className="w-9 h-9 flex items-center justify-center rounded-md text-[hsl(var(--tom-text-muted))] hover:text-[hsl(var(--tom-gold))] hover:bg-[hsl(var(--tom-bg-surface))] transition-colors mb-2"
        title="Toggle sidebar"
      >
        <PanelLeft size={18} />
      </button>

      <div className="w-6 h-px bg-[hsl(var(--tom-border))] mb-2" />

      {/* Nav icons */}
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = state.activeSidebarView === item.view;
        return (
          <button
            key={item.view}
            onClick={() => handleNav(item.view, item.main)}
            className={`w-9 h-9 flex items-center justify-center rounded-md transition-all duration-150 group relative ${
              isActive
                ? 'text-[hsl(var(--tom-gold))] bg-[hsl(var(--tom-bg-surface))]'
                : 'text-[hsl(var(--tom-text-muted))] hover:text-[hsl(var(--tom-text))] hover:bg-[hsl(var(--tom-bg-surface))]'
            }`}
            title={item.label}
          >
            <Icon size={18} />
            {/* Tooltip */}
            <span className="absolute left-full ml-2 px-2 py-1 bg-[hsl(var(--tom-bg-surface))] border border-[hsl(var(--tom-border))] rounded text-xs text-[hsl(var(--tom-text))] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
