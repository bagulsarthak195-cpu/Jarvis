import React, { useState } from 'react';
import { ConversationSession, UserMemoryItem } from '../types/jarvis';
import {
  Brain,
  MessageSquare,
  Search,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ShieldAlert,
  Clock,
  Tag,
  CheckCircle2,
  FolderOpen,
} from 'lucide-react';
import { sfx } from '../utils/audioSynthesizer';

interface MemoryAndSessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ConversationSession[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onDeleteSession: (id: string) => void;
  memories: UserMemoryItem[];
  onAddMemory: (category: UserMemoryItem['category'], key: string, value: string) => boolean;
  onDeleteMemory: (id: string) => void;
  onClearAllMemories: () => void;
}

export const MemoryAndSessionsModal: React.FC<MemoryAndSessionsModalProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onRenameSession,
  onDeleteSession,
  memories,
  onAddMemory,
  onDeleteMemory,
  onClearAllMemories,
}) => {
  const [activeTab, setActiveTab] = useState<'sessions' | 'memory'>('sessions');

  // Search state across all sessions
  const [searchQuery, setSearchQuery] = useState('');

  // Inline rename state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // New memory input state
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState<UserMemoryItem['category']>('preference');
  const [memoryError, setMemoryError] = useState<string | null>(null);
  const [memorySuccess, setMemorySuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartRename = (session: ConversationSession) => {
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  const handleSaveRename = (id: string) => {
    if (editingTitle.trim()) {
      onRenameSession(id, editingTitle.trim());
    }
    setEditingSessionId(null);
  };

  const handleAddNewMemory = (e: React.FormEvent) => {
    e.preventDefault();
    setMemoryError(null);
    setMemorySuccess(null);

    if (!newValue.trim()) {
      setMemoryError('Please enter memory details to remember.');
      return;
    }

    // Safety checks against credentials or passwords
    const lower = (newKey + ' ' + newValue).toLowerCase();
    if (
      lower.includes('aiza') ||
      lower.includes('bearer') ||
      lower.includes('password') ||
      lower.includes('private_key') ||
      lower.includes('secret') ||
      newValue.startsWith('sk-')
    ) {
      setMemoryError('SECURITY PROTOCOL: Passwords, private keys, or API tokens cannot be stored in conversational memory.');
      sfx.playError();
      return;
    }

    const added = onAddMemory(newCategory, newKey.trim() || 'General Preference', newValue.trim());
    if (added) {
      sfx.playSuccess();
      setMemorySuccess('Memory registered in J.A.R.V.I.S. cognitive core.');
      setNewKey('');
      setNewValue('');
      setTimeout(() => setMemorySuccess(null), 3000);
    }
  };

  // Filter messages across all sessions
  const searchResults: Array<{ sessionId: string; sessionTitle: string; messageText: string; role: string; timestamp: string }> = [];
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    sessions.forEach((s) => {
      s.messages.forEach((m) => {
        if (m.text.toLowerCase().includes(q)) {
          searchResults.push({
            sessionId: s.id,
            sessionTitle: s.title,
            messageText: m.text,
            role: m.role,
            timestamp: m.timestamp,
          });
        }
      });
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-slate-950 border border-cyan-500/50 rounded-xl shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col max-h-[90vh] overflow-hidden text-slate-100 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500 flex items-center justify-center text-cyan-400">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-orbitron text-sm font-bold tracking-wider text-cyan-400">
                COGNITIVE ARCHIVES & SESSIONS
              </h2>
              <p className="text-[11px] font-mono-tech text-slate-400">
                Persistent Chat Sessions & Long-Term User Memory Bank
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sfx.playBeep();
              onClose();
            }}
            className="p-1.5 rounded-lg border border-slate-700 hover:border-red-500/60 text-slate-400 hover:text-red-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigator */}
        <div className="flex border-b border-slate-800 bg-slate-900/30 text-xs font-mono-tech">
          <button
            onClick={() => {
              sfx.playBeep();
              setActiveTab('sessions');
            }}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'sessions'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>CONVERSATION SESSIONS ({sessions.length})</span>
          </button>
          <button
            onClick={() => {
              sfx.playBeep();
              setActiveTab('memory');
            }}
            className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'memory'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Brain className="w-4 h-4" />
            <span>LONG-TERM MEMORY BANK ({memories.length})</span>
          </button>
        </div>

        {/* Tab 1: Sessions & History Search */}
        {activeTab === 'sessions' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search messages across all conversations..."
                  className="w-full bg-slate-900/80 border border-slate-800 rounded-lg pl-9 pr-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono-tech"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  sfx.playSuccess();
                  onCreateSession();
                }}
                className="px-3.5 py-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/50 text-cyan-300 text-xs font-mono-tech flex items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>NEW SESSION</span>
              </button>
            </div>

            {/* Global Search Results if query present */}
            {searchQuery.trim() ? (
              <div className="space-y-2">
                <div className="text-[11px] font-mono-tech text-cyan-400 flex items-center justify-between border-b border-slate-800 pb-1">
                  <span>SEARCH RESULTS ({searchResults.length} matches found)</span>
                  <span className="text-slate-500">Query: "{searchQuery}"</span>
                </div>
                {searchResults.length === 0 ? (
                  <div className="p-6 text-center text-xs font-mono-tech text-slate-500 border border-dashed border-slate-800 rounded-lg">
                    No matching messages found across any session.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {searchResults.map((res, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          onSelectSession(res.sessionId);
                          onClose();
                        }}
                        className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-all text-xs"
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono-tech text-slate-400 mb-1">
                          <span className="text-cyan-400 font-bold">{res.sessionTitle}</span>
                          <span>{res.role === 'user' ? 'USER' : 'J.A.R.V.I.S.'} • {new Date(res.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className="text-slate-300 line-clamp-2 font-sans">
                          {res.messageText}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Session Cards List */
              <div className="space-y-2">
                {sessions.map((session) => {
                  const isActive = session.id === activeSessionId;
                  const isEditing = editingSessionId === session.id;

                  return (
                    <div
                      key={session.id}
                      className={`p-3 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                        isActive
                          ? 'bg-cyan-950/30 border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                          : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div
                        className="flex-1 cursor-pointer min-w-0"
                        onClick={() => {
                          if (!isEditing) {
                            onSelectSession(session.id);
                            onClose();
                          }
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {isActive && (
                            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
                          )}
                          {isEditing ? (
                            <div className="flex items-center gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                className="bg-slate-950 border border-cyan-400 rounded px-2 py-1 text-xs text-slate-100 flex-1 font-sans"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveRename(session.id)}
                                className="p-1 rounded bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingSessionId(null)}
                                className="p-1 rounded bg-slate-800 text-slate-400 hover:text-slate-200"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="font-orbitron text-xs text-slate-200 font-bold truncate">
                              {session.title}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-mono-tech text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(session.updatedAt).toLocaleDateString()} {new Date(session.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span>• {session.messages.length} directives logged</span>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isEditing && (
                          <button
                            onClick={() => handleStartRename(session)}
                            title="Rename Session"
                            className="p-1.5 rounded border border-slate-800 hover:border-slate-600 text-slate-400 hover:text-cyan-300 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (sessions.length <= 1) {
                              alert('At least one operational session must remain active.');
                              return;
                            }
                            if (confirm(`Purge session "${session.title}"?`)) {
                              onDeleteSession(session.id);
                            }
                          }}
                          title="Purge Session"
                          className="p-1.5 rounded border border-slate-800 hover:border-red-500/50 text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Long-Term Memory Bank */}
        {activeTab === 'memory' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Security Guarantee Banner */}
            <div className="p-3 rounded-lg bg-emerald-950/25 border border-emerald-500/40 text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <div>
                <p className="font-bold font-mono-tech text-[11px] text-emerald-400">
                  PRIVACY & SECURITY CLEARANCE:
                </p>
                <p className="text-[11px] text-emerald-200/90 leading-relaxed font-sans mt-0.5">
                  Memories are stored locally in your browser storage and injected into J.A.R.V.I.S.'s cognitive prompt context. Passwords, private keys, and tokens are strictly prevented from entering the memory bank.
                </p>
              </div>
            </div>

            {/* Add Memory Form */}
            <form onSubmit={handleAddNewMemory} className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="text-[11px] font-mono-tech text-cyan-400 font-bold flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                <span>REGISTER NEW LONG-TERM MEMORY OR PREFERENCE</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10px] font-mono-tech text-slate-400 block mb-1">CATEGORY</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono-tech focus:border-cyan-500"
                  >
                    <option value="preference">Preference</option>
                    <option value="project">Project / Task</option>
                    <option value="fact">Personal Fact</option>
                    <option value="work">Workstation Rule</option>
                    <option value="general">General</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-mono-tech text-slate-400 block mb-1">TOPIC / KEY</label>
                  <input
                    type="text"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="e.g. Preferred Language, Work Hours, Project Name"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-sans focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono-tech text-slate-400 block mb-1">FACT OR INSTRUCTION FOR J.A.R.V.I.S.</label>
                <textarea
                  rows={2}
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="e.g. Always write code in TypeScript with functional components and Tailwind styling."
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 font-sans focus:border-cyan-500"
                />
              </div>

              {memoryError && (
                <div className="flex items-center gap-1.5 text-xs text-red-400 font-mono-tech">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{memoryError}</span>
                </div>
              )}

              {memorySuccess && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono-tech">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{memorySuccess}</span>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-orbitron font-bold flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>COMMIT TO MEMORY</span>
                </button>
              </div>
            </form>

            {/* List of Stored Memories */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono-tech text-slate-400 border-b border-slate-800 pb-1">
                <span>ACTIVE MEMORY RECORDS ({memories.length})</span>
                {memories.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('Erase all long-term memories from J.A.R.V.I.S.?')) {
                        onClearAllMemories();
                      }
                    }}
                    className="text-red-400 hover:text-red-300 flex items-center gap-1 text-[10px]"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>PURGE ALL</span>
                  </button>
                )}
              </div>

              {memories.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono-tech text-slate-500 border border-dashed border-slate-800 rounded-lg">
                  No custom facts or preferences recorded yet. Tell J.A.R.V.I.S. your habits or save them above.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
                  {memories.map((mem) => (
                    <div
                      key={mem.id}
                      className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 hover:border-slate-700 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[9px] font-mono-tech uppercase bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
                            {mem.category}
                          </span>
                          <span className="font-bold text-slate-200 font-sans">
                            {mem.key}
                          </span>
                        </div>
                        <p className="text-slate-300 font-sans leading-relaxed">
                          {mem.value}
                        </p>
                      </div>
                      <button
                        onClick={() => onDeleteMemory(mem.id)}
                        title="Forget this memory"
                        className="p-1 rounded border border-slate-800 hover:border-red-500/50 text-slate-500 hover:text-red-400 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-[11px] font-mono-tech text-slate-400">
          <span>J.A.R.V.I.S. SYNAPSE BUFFER // ZERO LEAK PROTOCOL</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors"
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
};
