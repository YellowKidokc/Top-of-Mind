import { AppProvider, useApp } from '@/store/AppContext';
import { IconRail } from '@/components/sidebar/IconRail';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { FunnelSidebar } from '@/components/funnel/FunnelSidebar';
import { ChatArea } from '@/components/chat/ChatArea';
import { CommandBar } from '@/components/chat/CommandBar';
import { Composer } from '@/components/chat/Composer';
import { KnowledgePanel } from '@/components/knowledge/KnowledgePanel';
import { MarkdownWorkspace } from '@/components/markdown/MarkdownWorkspace';
import { FileSearchPanel } from '@/components/files/FileSearchPanel';
import { OperatorPanel } from '@/components/operator/OperatorPanel';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { useEffect } from 'react';
import './App.css';

function MainContent() {
  const { state } = useApp();

  // Show errors as toasts
  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }
  }, [state.error]);

  const renderMainView = () => {
    switch (state.mainView) {
      case 'knowledge':
        return <KnowledgePanel />;
      case 'markdown':
        return <MarkdownWorkspace />;
      case 'files':
        return <FileSearchPanel />;
      case 'operator':
        return <OperatorPanel />;
      case 'settings':
        return <SettingsPanel />;
      case 'chat':
      default:
        return (
          <>
            <ChatArea />
            <CommandBar />
            <Composer />
          </>
        );
    }
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[hsl(var(--tom-bg))] text-[hsl(var(--tom-text))]">
      {/* 1. Far-left icon rail */}
      <IconRail />

      {/* 2. Second sidebar (TypingMind-like) */}
      <Sidebar />

      {/* 3. Optional third funnel sidebar */}
      <FunnelSidebar />

      {/* 4. Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {renderMainView()}
      </div>

      {/* Toast notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'hsl(var(--tom-bg-elevated))',
            border: '1px solid hsl(var(--tom-border))',
            color: 'hsl(var(--tom-text))',
          },
        }}
      />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
}

export default App;
