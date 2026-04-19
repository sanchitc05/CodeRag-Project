import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Trash2, Search, Calendar, ArrowRight, History, Activity, Database } from 'lucide-react';
import { useHistory, useDeleteSession } from '../hooks/useHistory';
import { ConfidenceBadge } from '../components/ui/ConfidenceBadge';
import { HistoryItem } from '../types';

/**
 * DashboardPage: Session History
 */

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: historyData, isLoading } = useHistory(page);
  const deleteSessionMutation = useDeleteSession();

  const filteredItems = useMemo(() => {
    if (!historyData?.items) return [];
    return historyData.items.filter((item) =>
      item.query.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [historyData?.items, searchQuery]);

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this session?')) {
      try {
        await deleteSessionMutation.mutateAsync(id);
        toast.success('Session removed');
      } catch (err) {
        toast.error('Failed to delete session');
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-text-primary tracking-tight mb-2">Analysis History</h2>
          <p className="text-text-muted text-sm max-w-lg leading-relaxed">
            Review your previous code analysis sessions and explorations.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-surface border border-border p-1 rounded-2xl shadow-lg">
          <div className="flex flex-col px-4 py-2 border-r border-border">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Total Sessions</span>
            <span className="text-xl font-black text-accent">{historyData?.total || 0}</span>
          </div>
          <div className="px-4 py-2 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
              <Activity size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search queries, filenames, or root causes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-surface border border-border rounded-2xl text-sm text-text-primary focus:border-accent/40 focus:ring-4 focus:ring-accent/5 outline-none transition-all shadow-xl"
          />
        </div>
      </div>

      {/* Sessions Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 bg-surface-elevated/50 border border-border animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-surface/30 border border-dashed border-border rounded-[40px]">
          <div className="w-16 h-16 rounded-3xl bg-surface-elevated flex items-center justify-center text-text-muted mb-4 border border-border">
            <History size={32} />
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-2">No history matches your search</h3>
          <p className="text-text-muted text-sm">Try using different keywords or start a new debugging session.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <HistoryCard
              key={item.id}
              item={item}
              onNavigate={() => navigate('/chat', { state: { session: item } })}
              onDelete={() => handleDelete(item.id)}
              isDeleting={deleteSessionMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {historyData && historyData.total > 10 && (
        <div className="flex justify-center items-center gap-6 pt-10">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-6 py-2.5 rounded-xl bg-surface border border-border text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold text-xs uppercase tracking-widest shadow-lg"
          >
            Previous
          </button>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-background font-bold text-xs">{page}</span>
            <span className="text-text-muted text-xs font-medium">of {Math.ceil(historyData.total / 10)}</span>
          </div>
          <button
            onClick={() =>
              setPage((p) =>
                Math.min(Math.ceil(historyData.total / 10), p + 1)
              )
            }
            disabled={page >= Math.ceil(historyData.total / 10)}
            className="px-6 py-2.5 rounded-xl bg-surface border border-border text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold text-xs uppercase tracking-widest shadow-lg"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

interface HistoryCardProps {
  item: HistoryItem;
  onNavigate: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

function HistoryCard({
  item,
  onNavigate,
  onDelete,
  isDeleting,
}: HistoryCardProps) {
  return (
    <div
      onClick={onNavigate}
      className="group relative flex flex-col bg-surface border border-border rounded-3xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:border-accent/30 hover:-translate-y-1 cursor-pointer overflow-hidden"
    >
      <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="p-2 bg-accent/20 rounded-xl text-accent">
          <ArrowRight size={16} />
        </div>
      </div>

      <div className="space-y-4 flex-1">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 bg-accent/10 rounded-lg text-accent">
            <Database size={12} />
          </div>
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">Code Context Active</span>
        </div>

        <h3 className="text-sm font-bold text-text-primary line-clamp-2 leading-snug group-hover:text-accent transition-colors">
          {item.query}
        </h3>

        <div className="p-3 rounded-2xl bg-surface-elevated/50 border border-border">
          <p className="text-xs text-text-secondary italic line-clamp-2 leading-relaxed">
            {item.response?.root_cause || 'Analysis incomplete...'}
          </p>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <ConfidenceBadge confidence={item.response?.confidence || 0} />
          <div className="flex items-center gap-1.5 text-text-muted">
            <Calendar size={12} />
            <span className="text-[10px] font-medium">{new Date(item.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          disabled={isDeleting}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest bg-danger/5 text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
        >
          <Trash2 size={12} />
          Archive
        </button>

        <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
      </div>
    </div>
  );
}

export default DashboardPage;
