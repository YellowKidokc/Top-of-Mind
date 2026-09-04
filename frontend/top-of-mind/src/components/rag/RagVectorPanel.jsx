import React, { useState } from 'react';
import { Database, Search, Cpu, RefreshCw, Send, CheckCircle2, Layers, BookOpen, Sparkles } from 'lucide-react';

const EMBEDDING_MODELS = [
  { id: 'text-embed-3-small', name: 'OpenAI text-embedding-3-small (1536 dim)' },
  { id: 'bge-large-en', name: 'Local BGE-Large (1024 dim - Ollama)' },
  { id: 'nomic-embed', name: 'Nomic Embed Text (768 dim)' }
];

const INDEXED_REPOSITORIES = [
  { id: 'theophysics-vault', name: 'Z:\\Theophysics_Vault', chunks: '4,821 chunks', status: 'Indexed', type: 'Obsidian / Markdown' },
  { id: 'faiththruphysics', name: 'FaithThruPhysics Codebase', chunks: '1,240 chunks', status: 'Indexed', type: 'React / Web' },
  { id: 'clipboard-history', name: 'Clipboard Streams & Snippets', chunks: '312 chunks', status: 'Live Sync', type: 'Desktop Stream' }
];

export function RagVectorPanel() {
  const [repos, setRepos] = useState(INDEXED_REPOSITORIES);
  const [selectedEmbed, setSelectedEmbed] = useState('bge-large-en');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setTimeout(() => {
      setResults([
        {
          id: 'res-1',
          source: 'Z:\\Theophysics_Vault\\01_Axioms\\Axiom_Triadic_Invariance.md',
          score: '0.942',
          text: 'The fundamental invariant of physical law mirrors the irreducible triadic relation of truth and observation.'
        },
        {
          id: 'res-2',
          source: 'Z:\\Theophysics_Vault\\03_Claims\\Claim_Quantum_Measurement.md',
          score: '0.887',
          text: 'Measurement collapse resolved through ontological tripartite boundary conditions.'
        }
      ]);
      setSearching(false);
    }, 450);
  }

  return (
    <div className="rag-view-container">
      {/* Sidebar: Repositories & Vector Stores */}
      <div className="rag-sidebar-col">
        <div className="models-pane-title">Vector Repositories</div>
        <div className="models-items-scroll">
          {repos.map((r) => (
            <div key={r.id} className="model-list-card selected">
              <div className="model-card-info">
                <div className="model-card-name">{r.name}</div>
                <div className="model-card-meta">{r.chunks} · {r.type}</div>
              </div>
              <span className="badge-provider">{r.status}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="models-pane-title">Embedding Engine</div>
          <select
            className="column-model-select"
            style={{ width: '100%', height: 36 }}
            value={selectedEmbed}
            onChange={(e) => setSelectedEmbed(e.target.value)}
          >
            {EMBEDDING_MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Semantic Search & Conveyance */}
      <div className="rag-content-col">
        <div className="rag-header-row">
          <div>
            <h2>Semantic Vectorization & RAG Conveyance</h2>
            <p className="detail-hint">
              Query millions of tokens of vault knowledge, code, and clipboards in milliseconds and pass high-density context straight to your models.
            </p>
          </div>
        </div>

        <div className="rag-search-row">
          <div className="search-box" style={{ flex: 1, margin: 0 }}>
            <Search size={14} />
            <input
              type="text"
              placeholder="Search concepts across Theophysics Vault & local history..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button className="send-btn" onClick={handleSearch} disabled={searching}>
            {searching ? 'Vector Searching...' : 'Vector Query'}
          </button>
        </div>

        <div className="rag-results-list">
          {results.length === 0 ? (
            <div className="empty-canvas" style={{ padding: '60px 20px' }}>
              <Sparkles size={24} style={{ color: 'var(--tom-gold)', marginBottom: 8 }} />
              <p>Type a query above to retrieve matching vector embeddings and semantic context.</p>
            </div>
          ) : (
            results.map((r) => (
              <div key={r.id} className="rag-result-card">
                <div className="rag-result-header">
                  <span className="rag-source-path">{r.source}</span>
                  <span className="rag-score">Similarity: {r.score}</span>
                </div>
                <p className="rag-result-text">{r.text}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
