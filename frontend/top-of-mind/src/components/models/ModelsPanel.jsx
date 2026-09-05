import React, { useState } from 'react';
import { Search, Plus, Sliders, Check, Settings, Sparkles, ExternalLink, Globe, Code, FileText, Cpu, Wrench } from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All models', count: '7 / 7 enabled' },
  { id: 'openai', label: 'OpenAI', count: '1 enabled' },
  { id: 'anthropic', label: 'Anthropic', count: '1 enabled' },
  { id: 'google', label: 'Google', count: '1 enabled' },
  { id: 'deepseek', label: 'DeepSeek', count: '1 enabled' },
  { id: 'moonshot', label: 'Moonshot / Kimi', count: '1 enabled' },
  { id: 'ollama', label: 'Local Ollama', count: '1 enabled' },
  { id: 'ahk', label: 'AutoHotkey Desktop', count: 'Active' }
];

const MODEL_LIST = [
  { id: 'claude-3-7', cat: 'anthropic', name: 'Claude 3.7 Sonnet', context: '1,000,000', provider: 'Anthropic', enabled: true, release: '2026-03-01', pricing: ' / ', features: ['Vision', 'Streaming', 'Thinking mode', 'Background mode', 'Plugins'] },
  { id: 'deepseek-r1', cat: 'deepseek', name: 'DeepSeek R1 / V3', context: '128,000', provider: 'DeepSeek', enabled: true, release: '2026-01-20', pricing: '.55 / .19', features: ['Reasoning', 'Streaming', 'Code Sandbox'] },
  { id: 'kimi-2-5', cat: 'moonshot', name: 'Kimi 2.5', context: '2,000,000', provider: 'Moonshot', enabled: true, release: '2026-02-15', pricing: '.00 / .00', features: ['Long Context', 'Vision', 'Web Search'] },
  { id: 'gpt-5-4', cat: 'openai', name: 'GPT-5.4', context: '1,050,000', provider: 'OpenAI', enabled: true, release: '2026-03-05', pricing: '.50 / ', features: ['Plugins', 'Vision', 'Prompt caching', 'Thinking mode', 'Web Browser'] },
  { id: 'gemini-3-8', cat: 'google', name: 'Gemini 3.8 Flash', context: '1,000,000', provider: 'Google', enabled: true, release: '2026-02-28', pricing: '.15 / .60', features: ['Multimodal', 'Streaming', 'Fast Execution'] },
  { id: 'ollama-local', cat: 'ollama', name: 'Local Ollama (Llama 3.3)', context: '32,000', provider: 'Local (127.0.0.1:11434)', enabled: true, release: 'Local', pricing: 'Free / Local GPU', features: ['Offline', 'Zero Latency', 'Private'] },
  { id: 'ahk-bridge', cat: 'ahk', name: 'AHK Desktop Dispatcher', context: 'Native Windows', provider: 'AutoHotkey v2', enabled: true, release: 'Local Service', pricing: 'Local Inter-Process', features: ['Window Focus', 'Clipboard Send', 'Auto-Type Enter'] }
];

export function ModelsPanel() {
  const [selectedCat, setSelectedCat] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [models, setModels] = useState(MODEL_LIST);
  const [selectedModel, setSelectedModel] = useState(MODEL_LIST[0]);

  const filtered = models.filter((m) => {
    const matchesCat = selectedCat === 'all' || m.cat === selectedCat;
    const matchesSearch = !searchQuery.trim() || m.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  function toggleModel(id, e) {
    e.stopPropagation();
    setModels((prev) =>
      prev.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m))
    );
  }

  return (
    <div className="models-view-container">
      {/* Category List */}
      <div className="models-cat-col">
        <div className="models-pane-title">Providers & Lanes</div>
        <div className="models-cat-list">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className="models-cat-item"
              onClick={() => setSelectedCat(cat.id)}
            >
              <div className="cat-label">{cat.label}</div>
              <div className="cat-count">{cat.count}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Center Model Toggle List */}
      <div className="models-list-col">
        <div className="models-search-row">
          <div className="search-box" style={{ margin: 0, flex: 1 }}>
            <Search size={14} />
            <input
              type="text"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="models-items-scroll">
          {filtered.map((m) => {
            const isSelected = selectedModel?.id === m.id;
            return (
              <div
                key={m.id}
                className="model-list-card"
                onClick={() => setSelectedModel(m)}
              >
                <div className="model-card-info">
                  <div className="model-card-name">{m.name}</div>
                  <div className="model-card-meta">{m.context} tokens · {m.provider}</div>
                </div>
                <div
                  className={model-toggle-pill }
                  onClick={(e) => toggleModel(m.id, e)}
                  title="Toggle active model lane"
                >
                  <div className="toggle-handle" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Detail Pane */}
      <div className="models-detail-col">
        {selectedModel ? (
          <div className="model-detail-body">
            <div className="model-detail-header">
              <div>
                <h2>{selectedModel.name}</h2>
                <span className="badge-provider">{selectedModel.provider}</span>
              </div>
              <button
                className="action-pill-btn"
                style={{ background: 'var(--tom-gold)', color: '#0a0a0a', fontWeight: 600 }}
              >
                Set Default
              </button>
            </div>

            <div className="detail-meta-grid">
              <div className="meta-field">
                <span className="meta-k">Context Window</span>
                <span className="meta-v">{selectedModel.context}</span>
              </div>
              <div className="meta-field">
                <span className="meta-k">Release / Target</span>
                <span className="meta-v">{selectedModel.release}</span>
              </div>
              <div className="meta-field">
                <span className="meta-k">Pricing / Overhead</span>
                <span className="meta-v">{selectedModel.pricing}</span>
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-subtitle">Features & Capabilities</div>
              <div className="features-tags">
                {selectedModel.features.map((f) => (
                  <span key={f} className="feature-tag">
                    <Check size={11} style={{ marginRight: 4, color: 'var(--tom-gold)' }} />
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-subtitle">Desktop Window & Dispatch Target</div>
              <p className="detail-hint">
                When active in a split lane, AutoHotkey attaches directly to the window matching{' '}
                <code>{selectedModel.provider}</code> to automatically paste text and trigger execution.
              </p>
            </div>
          </div>
        ) : (
          <div className="empty-canvas">Select a model to view specs</div>
        )}
      </div>
    </div>
  );
}
