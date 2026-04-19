import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Terminal, 
  Settings, 
  LayoutDashboard, 
  MessageSquare,
  Zap,
  Command,
  X,
  History,
  FileCode2,
  Database
} from 'lucide-react';
import { useConfigStore } from '../../store/configStore';

/**
 * Command Palette overlay
 * Triggered by Cmd/Ctrl + K
 */

const CommandPalette: React.FC = () => {
  const navigate = useNavigate();
  const { isSearchOpen, setSearchOpen } = useConfigStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const actions = [
    { icon: <MessageSquare size={16} />, label: 'Chat', description: 'Query your codebase using RAG', path: '/chat' },
    { icon: <LayoutDashboard size={16} />, label: 'Dashboard', description: 'System health and analytics', path: '/dashboard' },
    { icon: <Terminal size={16} />, label: 'System', description: 'Resource and worker management', path: '/command-center' },
    { icon: <Settings size={16} />, label: 'Settings', description: 'User preferences and security', path: '/settings' },
    { icon: <Database size={16} />, label: 'Re-index', description: 'Update current repository context', action: () => alert('Re-indexing...') },
    { icon: <Zap size={16} />, label: 'Security Scan', description: 'Check for codebase vulnerabilities', action: () => alert('Scanning...') },
  ];

  const filteredActions = actions.filter(a => 
    a.label.toLowerCase().includes(query.toLowerCase()) || 
    a.description.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(!isSearchOpen);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, setSearchOpen]);

  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleSelect = (action: typeof actions[0]) => {
    if (action.path) navigate(action.path);
    if (action.action) action.action();
    setSearchOpen(false);
    setQuery('');
  };

  if (!isSearchOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 backdrop-blur-sm bg-background/60 animate-in fade-in duration-300"
      onClick={() => setSearchOpen(false)}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-surface-elevated border border-border rounded-3xl shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden animate-in slide-in-from-top-4 duration-300"
      >
        {/* Search Header */}
        <div className="relative flex items-center px-6 py-5 border-b border-border/50">
          <Search size={22} className={query ? 'text-accent' : 'text-text-muted'} />
          <input 
            ref={inputRef}
            type="text"
            placeholder="Search commands, tools, or files..."
            className="flex-1 bg-transparent border-none outline-none px-4 text-lg font-medium text-text-primary placeholder:text-text-muted/40"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-background border border-border/50 text-text-muted text-[10px] font-bold">
            ESC
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto p-3 custom-scrollbar">
          {filteredActions.length > 0 ? (
            <div className="space-y-1">
              {query === '' && (
                <div className="px-3 py-2 text-[10px] font-bold text-text-muted/60 uppercase tracking-widest flex items-center gap-2">
                  <Command size={10} /> Quick Access
                </div>
              )}
              {filteredActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelect(action)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`
                    w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all
                    ${selectedIndex === idx ? 'bg-accent/10 shadow-lg border-accent/20' : 'hover:bg-surface border-transparent'}
                    border
                  `}
                >
                  <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center transition-colors
                    ${selectedIndex === idx ? 'bg-accent text-background' : 'bg-background text-text-muted'}
                  `}>
                    {action.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-bold ${selectedIndex === idx ? 'text-text-primary' : 'text-text-secondary'}`}>
                        {action.label}
                      </span>
                      {selectedIndex === idx && (
                        <span className="text-[10px] font-bold text-accent px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20">
                          ENTER
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted truncate mt-0.5">{action.description}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-text-muted">
               <X size={40} strokeWidth={1} className="mb-4 opacity-20" />
               <p className="text-sm font-bold">No results for "{query}"</p>
               <p className="text-xs opacity-60">Try searching for standard commands like Dashboard or Settings.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border/50 bg-surface/30 flex items-center justify-between gap-4">
           <div className="flex items-center gap-3">
             <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded border border-border bg-background text-[9px] font-bold text-text-muted">↑↓</kbd>
                <span className="text-[10px] text-text-muted/60 font-bold uppercase tracking-wider">Navigate</span>
             </div>
             <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded border border-border bg-background text-[9px] font-bold text-text-muted">ENTER</kbd>
                <span className="text-[10px] text-text-muted/60 font-bold uppercase tracking-wider">Select</span>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
