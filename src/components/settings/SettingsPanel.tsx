import { useApp } from '@/store/AppContext';
import { useState } from 'react';
import { Cog, Wifi, WifiOff, Save, TestTube, Loader2 } from 'lucide-react';
import * as api from '@/lib/api/client';

export function SettingsPanel() {
  const { state, dispatch, checkConnection } = useApp();
  const [urlInput, setUrlInput] = useState(state.settings.apiBaseUrl);
  const [testing, setTesting] = useState(false);

  const handleSaveUrl = () => {
    api.setBaseUrl(urlInput);
    dispatch({ type: 'SET_SETTINGS', payload: { apiBaseUrl: urlInput } });
  };

  const handleTest = async () => {
    setTesting(true);
    await checkConnection();
    setTesting(false);
  };

  const integrations = [
    {
      name: 'Syncthing',
      url: state.settings.syncthingUrl,
      secretRef: state.settings.syncthingSecretRef,
      description: 'File sync integration',
      actions: ['status', 'folders', 'refresh', 'send-file'],
    },
    {
      name: 'Synology',
      url: state.settings.synologyUrl || 'Not configured',
      description: 'NAS storage integration',
      actions: [],
    },
    {
      name: 'Cloudflare R2',
      url: state.settings.r2Endpoint || 'Not configured',
      description: 'Cloud object storage',
      actions: [],
    },
    {
      name: 'AutoHotkey Bridge',
      url: state.settings.ahkBridgeUrl || 'Not configured',
      description: 'AHK input capture bridge',
      actions: [],
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[hsl(var(--tom-bg))]">
      {/* Header */}
      <div className="h-10 border-b border-[hsl(var(--tom-border))] flex items-center px-4 shrink-0">
        <Cog size={16} className="text-[hsl(var(--tom-gold-dim))] mr-2" />
        <span className="text-sm font-medium text-[hsl(var(--tom-text))]">Settings & Integrations</span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-6 max-w-2xl space-y-8">
        {/* API Configuration */}
        <section>
          <h3 className="text-sm font-semibold text-[hsl(var(--tom-text))] mb-4 flex items-center gap-2">
            <Wifi size={14} className="text-[hsl(var(--tom-gold-dim))]" />
            API Configuration
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[hsl(var(--tom-text-muted))] uppercase tracking-wider">Base URL</label>
              <div className="flex gap-2 mt-1">
                <input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="http://127.0.0.1:10000"
                  className="flex-1 px-3 py-2 text-sm bg-[hsl(var(--tom-bg-elevated))] border border-[hsl(var(--tom-border))] rounded-md text-[hsl(var(--tom-text))] placeholder:text-[hsl(var(--tom-text-dim))] focus:outline-none focus:border-[hsl(var(--tom-gold-dim))]"
                />
                <button
                  onClick={handleSaveUrl}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm bg-[hsl(var(--tom-bg-surface))] hover:bg-[hsl(var(--tom-border))] text-[hsl(var(--tom-text))] rounded-md transition-colors border border-[hsl(var(--tom-border))]"
                >
                  <Save size={14} />
                  Save
                </button>
              </div>
              <p className="text-xs text-[hsl(var(--tom-text-dim))] mt-1">
                Override with env: VITE_TOP_OF_MIND_API
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {state.connectionStatus === 'online' ? (
                  <Wifi size={14} className="text-[hsl(var(--tom-green))]" />
                ) : (
                  <WifiOff size={14} className="text-[hsl(var(--tom-red))]" />
                )}
                <span className="text-sm text-[hsl(var(--tom-text-muted))]">
                  Status: <span className={state.connectionStatus === 'online' ? 'text-[hsl(var(--tom-green))]' : 'text-[hsl(var(--tom-red))]'}>{state.connectionStatus}</span>
                </span>
              </div>
              <button
                onClick={handleTest}
                disabled={testing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[hsl(var(--tom-bg-surface))] hover:bg-[hsl(var(--tom-border))] text-[hsl(var(--tom-text))] rounded transition-colors border border-[hsl(var(--tom-border))]"
              >
                {testing ? <Loader2 size={12} className="animate-spin" /> : <TestTube size={12} />}
                Test Connection
              </button>
            </div>
          </div>
        </section>

        {/* Integrations */}
        <section>
          <h3 className="text-sm font-semibold text-[hsl(var(--tom-text))] mb-4">Integrations</h3>
          <div className="grid gap-3">
            {integrations.map((integration) => (
              <div
                key={integration.name}
                className="p-4 bg-[hsl(var(--tom-bg-elevated))] border border-[hsl(var(--tom-border))] rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-[hsl(var(--tom-text))]">{integration.name}</div>
                    <div className="text-xs text-[hsl(var(--tom-text-muted))] mt-0.5">{integration.description}</div>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-[hsl(var(--tom-bg))] text-[hsl(var(--tom-text-dim))] rounded border border-[hsl(var(--tom-border))]">
                    {integration.url === 'Not configured' ? 'Not configured' : 'Active'}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-[hsl(var(--tom-text-dim))] font-mono">{integration.url}</span>
                  {integration.secretRef && (
                    <span className="text-xs text-[hsl(var(--tom-text-dim))]">· {integration.secretRef}</span>
                  )}
                </div>
                {integration.actions.length > 0 && (
                  <div className="flex gap-1.5 mt-3">
                    {integration.actions.map((action) => (
                      <span
                        key={action}
                        className="text-xs px-2 py-0.5 bg-[hsl(var(--tom-bg))] text-[hsl(var(--tom-text-dim))] rounded border border-[hsl(var(--tom-border))]"
                      >
                        {action}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* About */}
        <section>
          <h3 className="text-sm font-semibold text-[hsl(var(--tom-text))] mb-4">About</h3>
          <div className="p-4 bg-[hsl(var(--tom-bg-elevated))] border border-[hsl(var(--tom-border))] rounded-lg">
            <div className="text-sm text-[hsl(var(--tom-text))]">Top of Mind</div>
            <div className="text-xs text-[hsl(var(--tom-text-muted))] mt-1">
              Multi-AI command desk. Unified surface for all your AI agents.
            </div>
            <div className="text-xs text-[hsl(var(--tom-text-dim))] mt-3 space-y-1">
              <div>API Port: 10000</div>
              <div>Frontend: React + Vite + Tailwind</div>
              <div>Run locally: npm run dev</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
