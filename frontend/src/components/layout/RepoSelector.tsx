import React, { useState, useMemo } from 'react';
import { Database, Check, History, Search, Plus } from 'lucide-react';
import { useConfigStore } from '../../store/configStore';

/**
 * Repo Selector Component
 * Allows users to switch knowledge context.
 */

const RepoSelector: React.FC = () => {
  const { activeRepoId, setActiveRepo, repositories } = useConfigStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRepos = useMemo(() => {
    return repositories.filter(repo => 
      repo.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [repositories, searchQuery]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ready': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'Syncing': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'Error': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default: return 'bg-text-muted/10 text-text-muted border-text-muted/20';
    }
  };

  return (
    <div className="absolute top-full left-0 mt-2 w-80 bg-surface-elevated/95 backdrop-blur-xl border border-border rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 animate-in fade-in zoom-in-95 duration-200 z-50 overflow-hidden">
      {/* Search Header */}
      <div className="relative mb-2 px-1">
        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
        <input 
          type="text" 
          placeholder="Filter context..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-background/50 border border-border rounded-xl py-2 pl-10 pr-4 text-xs focus:border-accent/50 focus:ring-4 focus:ring-accent/10 outline-none transition-all placeholder:text-text-muted/50"
          autoFocus
        />
      </div>

      <div className="space-y-1 max-h-[320px] overflow-y-auto custom-scrollbar px-1">
        <div className="flex items-center justify-between px-2 py-1.5 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted/70">
            Available Repositories
          </span>
          <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-md font-bold">
            {filteredRepos.length} Total
          </span>
        </div>
        
        {filteredRepos.length > 0 ? (
          filteredRepos.map((repo) => (
            <div 
              key={repo.id}
              onClick={() => setActiveRepo(repo.id)}
              className={`
                flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer transition-all group relative overflow-hidden
                ${activeRepoId === repo.id 
                  ? 'bg-accent/5 border border-accent/20' 
                  : 'hover:bg-accent/5 border border-transparent hover:border-accent/10'}
              `}
            >
              {/* Active Highlight Effect */}
              {activeRepoId === repo.id && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent shadow-[0_0_10px_rgba(0,212,255,0.5)]" />
              )}

              <div className="flex items-center gap-3">
                <div className={`
                  p-2.5 rounded-lg transition-all
                  ${activeRepoId === repo.id 
                    ? 'bg-accent shadow-lg shadow-accent/20 text-background' 
                    : 'bg-surface text-text-muted group-hover:text-accent group-hover:bg-accent/10'}
                `}>
                  <Database size={16} strokeWidth={activeRepoId === repo.id ? 2.5 : 2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className={`text-xs font-bold truncate ${activeRepoId === repo.id ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}`}>
                    {repo.name}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-tighter ${getStatusColor(repo.status)}`}>
                      {repo.status}
                    </span>
                    {repo.lastIndexed && (
                      <span className="text-[9px] text-text-muted/70 font-medium">
                        IDX: {repo.lastIndexed}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {activeRepoId === repo.id ? (
                  <div className="bg-accent/20 p-1 rounded-full">
                    <Check size={12} className="text-accent" strokeWidth={3} />
                  </div>
                ) : (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Check size={12} className="text-text-muted/30" />
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
             <Search size={32} className="text-text-muted/20 mb-2" />
             <p className="text-xs text-text-muted font-medium">No repositories found matching "{searchQuery}"</p>
          </div>
        )}
      </div>

      <div className="mt-2 pt-2 border-t border-border px-1">
        <button className="group w-full flex items-center justify-between gap-2 px-3 py-2.5 text-xs font-bold text-text-secondary hover:text-accent hover:bg-accent/5 rounded-xl transition-all">
          <div className="flex items-center gap-2">
             <History size={14} className="group-hover:rotate-[-45deg] transition-transform" />
             <span>Context Management</span>
          </div>
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
};

export default RepoSelector;
