import React, { useState } from 'react';
import { FileText, Plus, Trash2, Copy, Check, Sparkles, Wand2, ArrowRight } from 'lucide-react';

const INITIAL_NOTES = [
  {
    id: 'note-1',
    title: 'Top of Mind Architectural Intent',
    updated: 'Just now',
    content: `# Top of Mind Desk\n- Single command cockpit for multiple frontier models\n- AutoHotkey bridge attaches directly to desktop input windows\n- Multi-lane broadcasting with synthesis and consensus combine`
  },
  {
    id: 'note-2',
    title: 'Theophysics FIS Core Notes',
    updated: '10 mins ago',
    content: `# Theophysics & First Principles\n- Axiom validation and claim verification\n- Vector indexing of Z:\\Theophysics_Vault\n- Lexicon intake mapping to AG_SORTING_TERMS_INTAKE.csv`
  }
];

export function NotepadPanel({ onSendToComposer }) {
  const [notes, setNotes] = useState(INITIAL_NOTES);
  const [activeNoteId, setActiveNoteId] = useState(INITIAL_NOTES[0].id);
  const [aiSorting, setAiSorting] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0];

  function handleCreateNote() {
    const newNote = {
      id: 'note-' + Date.now(),
      title: 'Untitled Note',
      updated: 'Just now',
      content: '# Untitled Note\n\nType markdown notes here...'
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
  }

  function handleUpdateContent(val) {
    const lines = val.split('\n');
    let title = activeNote.title;
    if (lines[0] && lines[0].startsWith('# ')) {
      title = lines[0].replace('# ', '').trim();
    }
    setNotes((prev) =>
      prev.map((n) =>
        n.id === activeNoteId
          ? { ...n, content: val, title: title || n.title, updated: 'Just now' }
          : n
      )
    );
  }

  function handleAiTidy() {
    setAiSorting(true);
    setTimeout(() => {
      const sortedContent = activeNote.content + '\n\n---\n### [AI Summary & Action Items]\n- Categorized for multi-model broadcast.\n- Key points indexed for RAG vectorization.';
      handleUpdateContent(sortedContent);
      setAiSorting(false);
    }, 600);
  }

  return (
    <div className="notepad-view-container">
      {/* Notes Sidebar */}
      <div className="notepad-sidebar-col">
        <div className="models-pane-title">Markdown Notepad</div>
        <button className="new-chat" style={{ marginBottom: 12 }} onClick={handleCreateNote}>
          <Plus size={14} />
          New Note
        </button>

        <div className="models-items-scroll">
          {notes.map((n) => (
            <div
              key={n.id}
              className="model-list-card"
              onClick={() => setActiveNoteId(n.id)}
            >
              <div className="model-card-info">
                <div className="model-card-name">{n.title}</div>
                <div className="model-card-meta">{n.updated}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Note Editor */}
      <div className="notepad-editor-col">
        {activeNote ? (
          <div className="notepad-editor-layout">
            <div className="agent-editor-header">
              <input
                type="text"
                className="agent-title-input"
                value={activeNote.title}
                onChange={(e) => {
                  const val = e.target.value;
                  setNotes(notes.map((n) => (n.id === activeNoteId ? { ...n, title: val } : n)));
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="action-pill-btn"
                  onClick={handleAiTidy}
                  disabled={aiSorting}
                  title="AI organize, summarize, and categorize this note"
                >
                  <Wand2 size={13} style={{ color: 'var(--tom-gold)' }} />
                  {aiSorting ? 'Organizing...' : 'AI Tidy & Classify'}
                </button>
                <button
                  className="send-btn"
                  onClick={() => {
                    if (onSendToComposer) {
                      onSendToComposer(activeNote.content);
                    } else {
                      navigator.clipboard?.writeText(activeNote.content);
                    }
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? (
                    <>
                      <Check size={13} style={{ marginRight: 4 }} />
                      Sent to Composer
                    </>
                  ) : (
                    <>
                      <ArrowRight size={13} style={{ marginRight: 4 }} />
                      Broadcast Note
                    </>
                  )}
                </button>
              </div>
            </div>

            <textarea
              className="agent-textarea notepad-textarea"
              value={activeNote.content}
              onChange={(e) => handleUpdateContent(e.target.value)}
              placeholder="Write or paste your markdown thoughts here..."
            />
          </div>
        ) : (
          <div className="empty-canvas">Select or create a note</div>
        )}
      </div>
    </div>
  );
}
