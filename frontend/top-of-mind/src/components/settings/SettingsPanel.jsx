import React, { useState } from 'react';
import { Database, Download, Upload, Trash2, HardDrive, RefreshCw, Key, Shield, ExternalLink, Sparkles } from 'lucide-react';

export function SettingsPanel() {
  const [activeTab, setActiveTab] = useState('storage');
  const [hubUrl, setHubUrl] = useState('http://127.0.0.1:8000');
  const [vaultPath, setVaultPath] = useState('Z:\\Theophysics_Vault');
  const [autoSendEnter, setAutoSendEnter] = useState(true);

  return (
    <div className="settings-view-container">
      {/* Settings Navigation */}
      <div className="settings-sidebar-col">
        <div className="models-pane-title">Settings</div>
        <div className="models-cat-list">
          <button
            className={models-cat-item }
            onClick={() => setActiveTab('storage')}
          >
            <div className="cat-label">App Data & Storage</div>
            <div className="cat-count">Local Cache</div>
          </button>
          <button
            className={models-cat-item }
            onClick={() => setActiveTab('bridge')}
          >
            <div className="cat-label">AHK & Hub Bridge</div>
            <div className="cat-count">Desktop Control</div>
          </button>
          <button
            className={models-cat-item }
            onClick={() => setActiveTab('vault')}
          >
            <div className="cat-label">Theophysics Vault</div>
            <div className="cat-count">Knowledge Single Source</div>
          </button>
        </div>
      </div>

      {/* Main Settings Content */}
      <div className="settings-content-col">
        {activeTab === 'storage' && (
          <div className="settings-section-card">
            <h2>App Data & Storage Diagnostics</h2>
            <p className="detail-hint">
              All messages and multi-agent streams are preserved locally in browser storage and indexed in your local hub database.
            </p>

            <div className="storage-meter-group">
              <div className="storage-meter-header">
                <span>LocalStorage Meter (Metadata & UI Config)</span>
                <span>0.04 MB / 5.00 MB</span>
              </div>
              <div className="meter-track">
                <div className="meter-bar" style={{ width: '1.2%' }} />
              </div>
            </div>

            <div className="storage-meter-group">
              <div className="storage-meter-header">
                <span>IndexedDB Meter (Chat History & Cache)</span>
                <span>1.42 MB / 10.74 GB</span>
              </div>
              <div className="meter-track">
                <div className="meter-bar" style={{ width: '0.2%' }} />
              </div>
            </div>

            <div className="settings-actions-row">
              <button className="action-pill-btn">
                <Download size={13} />
                Export Chat History
              </button>
              <button className="action-pill-btn">
                <Upload size={13} />
                Import Data
              </button>
              <button className="action-pill-btn danger">
                <Trash2 size={13} />
                Clear Local Cache
              </button>
            </div>
          </div>
        )}

        {activeTab === 'bridge' && (
          <div className="settings-section-card">
            <h2>AutoHotkey & Local API Bridge</h2>
            <p className="detail-hint">
              Controls the local Python hub (<code>hub_bridge.py</code>) and Windows AHK desktop hooks.
            </p>

            <div className="editor-group">
              <label>Hub API Base URL</label>
              <input
                type="text"
                className="search-box"
                style={{ width: '100%', marginTop: 6, background: '#121212' }}
                value={hubUrl}
                onChange={(e) => setHubUrl(e.target.value)}
              />
            </div>

            <div className="editor-group" style={{ marginTop: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={autoSendEnter}
                  onChange={(e) => setAutoSendEnter(e.target.checked)}
                />
                Auto-press Enter after pasting prompt into target desktop AI window
              </label>
            </div>
          </div>
        )}

        {activeTab === 'vault' && (
          <div className="settings-section-card">
            <h2>Theophysics Vault Configuration</h2>
            <p className="detail-hint">
              Your primary single source of truth workspace. All axioms, claims, and note classifications sync directly here.
            </p>

            <div className="editor-group">
              <label>Vault Path</label>
              <input
                type="text"
                className="search-box"
                style={{ width: '100%', marginTop: 6, background: '#121212' }}
                value={vaultPath}
                onChange={(e) => setVaultPath(e.target.value)}
              />
            </div>

            <div className="editor-group" style={{ marginTop: 16 }}>
              <label>Lexicon Intake Destination</label>
              <input
                type="text"
                className="search-box"
                style={{ width: '100%', marginTop: 6, background: '#121212' }}
                readOnly
                value="Z:\\Theophysics_Vault\\07_System_and_Operations\\AG_Lexicon_Intake\\AG_SORTING_TERMS_INTAKE.csv"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
