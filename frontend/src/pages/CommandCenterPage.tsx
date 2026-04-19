import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  Plus,
  Trash2,
  Moon,
  Sun,
  Github,
  Database,
  Shield,
  Cpu,
  Globe,
  Loader2,
  Terminal,
  Activity
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { ingestRepo } from '../api/query';

function formatIngestError(err: any): string {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (typeof first?.msg === 'string' && first.msg.trim()) return first.msg;
  }
  return err?.message || 'Ingestion failed';
}

/**
 * CommandCenterPage: System Management
 */

export const CommandCenterPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [githubUrl, setGithubUrl] = useState('');
  const [repoId, setRepoId] = useState('');
  const [isIngestLoading, setIsIngestLoading] = useState(false);
  const [repos, setRepos] = useState<string[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('coderag_repos');
    setRepos(stored ? JSON.parse(stored) : []);
  }, []);

  const handleIngestRepo = async () => {
    if (!githubUrl || !repoId) {
      toast.error('Missing configuration parameters');
      return;
    }

    setIsIngestLoading(true);
    try {
      await ingestRepo(githubUrl, repoId);
      const newRepos = [...repos, repoId];
      setRepos(newRepos);
      localStorage.setItem('coderag_repos', JSON.stringify(newRepos));
      toast.success(`Repository "${repoId}" indexed`);
      setGithubUrl('');
      setRepoId('');
    } catch (err: any) {
      toast.error(formatIngestError(err));
    } finally {
      setIsIngestLoading(false);
    }
  };

  const handleRemoveRepo = (repoToRemove: string) => {
    const newRepos = repos.filter((r) => r !== repoToRemove);
    setRepos(newRepos);
    localStorage.setItem('coderag_repos', JSON.stringify(newRepos));
    toast.success(`Repository context removed`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">

      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-4xl font-black text-text-primary tracking-tighter">System</h2>
        <p className="text-text-muted text-sm leading-relaxed max-w-xl">
          Manage your repo contexts, configure indexing parameters, and monitor system performance.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Main Controls - Left 2 Columns */}
        <div className="lg:col-span-2 space-y-8">

          {/* Repository Ingestion Card */}
          <div className="bg-surface border border-border rounded-[32px] overflow-hidden shadow-2xl">
            <div className="px-8 py-6 border-b border-border bg-gradient-to-r from-accent/5 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-xl text-accent">
                  <Github size={20} />
                </div>
                <h3 className="font-bold text-text-primary uppercase tracking-widest text-xs">Repository Indexing</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">Ready</span>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">GitHub URL</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                    <input
                      type="text"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/microsoft/vscode"
                      className="w-full pl-12 pr-4 py-4 bg-background border border-border rounded-2xl text-sm text-text-primary focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Context ID</label>
                  <div className="relative">
                    <Terminal className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                    <input
                      type="text"
                      value={repoId}
                      onChange={(e) => setRepoId(e.target.value)}
                      placeholder="vscode-main"
                      className="w-full pl-12 pr-4 py-4 bg-background border border-border rounded-2xl text-sm text-text-primary focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleIngestRepo}
                disabled={isIngestLoading}
                className={`
                  w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3
                  ${isIngestLoading
                    ? 'bg-surface-elevated text-text-muted cursor-not-allowed'
                    : 'bg-accent text-background shadow-[0_8px_30px_rgba(var(--accent-rgb),0.2)] hover:scale-[1.02] active:scale-[0.98]'
                  }
                `}
              >
                {isIngestLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {isIngestLoading ? 'Indexing Repository...' : 'Start Indexing'}
              </button>
            </div>
          </div>

          {/* Active Contexts Card */}
          <div className="bg-surface border border-border rounded-[32px] overflow-hidden shadow-xl">
            <div className="px-8 py-6 border-b border-border bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500">
                  <Database size={20} />
                </div>
                <h3 className="font-bold text-text-primary uppercase tracking-widest text-xs">Managed Contexts</h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-background border border-border text-[10px] font-bold text-text-muted">
                {repos.length} INDEXED
              </span>
            </div>

            <div className="divide-y divide-border">
              {repos.length === 0 ? (
                <div className="p-12 text-center text-text-muted text-sm italic">
                  No repositories indexed yet.
                </div>
              ) : (
                repos.map((repo) => (
                  <div key={repo} className="flex items-center justify-between p-6 px-8 hover:bg-white/5 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-text-primary font-mono">{repo}</span>
                      <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-1">Status: Operational</span>
                    </div>
                    <button
                      onClick={() => handleRemoveRepo(repo)}
                      className="p-3 rounded-xl bg-danger/5 text-danger hover:bg-danger/10 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Info - Right Column */}
        <div className="space-y-8">

          {/* Account Status */}
          <div className="p-8 bg-surface border border-border rounded-[32px] shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
              <Shield size={64} className="text-accent" />
            </div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-6">User Session</h4>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-accent-dim flex items-center justify-center text-background font-black text-xl">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex flex-col min-w-0">
                <p className="text-sm font-bold text-text-primary truncate">{user?.email}</p>
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Active User</p>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-background/50 border border-border flex items-center justify-between">
              <span className="text-[10px] text-text-muted font-bold uppercase">Auth Status</span>
              <span className="text-[10px] text-text-primary font-mono bg-accent/20 px-2 py-0.5 rounded">Verified</span>
            </div>
          </div>

          {/* System Performance */}
          <div className="p-8 bg-surface border border-border rounded-[32px] shadow-lg">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-6">System Health</h4>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Cpu size={16} className="text-text-muted" />
                  <span className="text-xs font-bold text-text-secondary">Engine Load</span>
                </div>
                <span className="text-xs font-mono text-accent">12.4%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity size={16} className="text-text-muted" />
                  <span className="text-xs font-bold text-text-secondary">RAG Latency</span>
                </div>
                <span className="text-xs font-mono text-accent">42ms</span>
              </div>
              <div className="w-full h-1.5 bg-background rounded-full overflow-hidden border border-border">
                <div className="h-full w-1/4 bg-accent animate-pulse" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CommandCenterPage;
