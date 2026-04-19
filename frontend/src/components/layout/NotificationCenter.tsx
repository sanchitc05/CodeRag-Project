import React from 'react';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  Info, 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  Clock,
  X
} from 'lucide-react';
import { useNotificationStore, NotificationType } from '../../store/notificationStore';
import { formatDistanceToNow } from 'date-fns';

/**
 * Notification Center Component
 */

const NotificationCenter: React.FC = () => {
  const { 
    notifications, 
    markAsRead, 
    markAllAsRead, 
    clearAll 
  } = useNotificationStore();

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'info': return <Info size={16} className="text-accent" />;
      case 'warning': return <AlertCircle size={16} className="text-amber-500" />;
      case 'error': return <XCircle size={16} className="text-rose-500" />;
    }
  };

  const getTypeStyles = (type: NotificationType) => {
    switch (type) {
      case 'success': return 'bg-emerald-500/10 border-emerald-500/20';
      case 'info': return 'bg-accent/10 border-accent/20';
      case 'warning': return 'bg-amber-500/10 border-amber-500/20';
      case 'error': return 'bg-rose-500/10 border-rose-500/20';
    }
  };

  return (
    <div className="absolute top-full right-0 mt-2 w-96 bg-surface-elevated/95 backdrop-blur-xl border border-border rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col animate-in fade-in zoom-in-95 duration-200 z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-accent" />
          <h3 className="text-sm font-bold text-text-primary tracking-tight">Notifications</h3>
          {notifications.some(n => !n.read) && (
            <span className="px-1.5 py-0.5 rounded-full bg-accent/20 text-accent text-[10px] font-bold">
              {notifications.filter(n => !n.read).length} New
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={markAllAsRead}
            disabled={!notifications.some(n => !n.read)}
            className="p-1.5 text-text-muted hover:text-accent hover:bg-accent/10 rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent"
            title="Mark all as read"
          >
            <CheckCheck size={16} />
          </button>
          <button 
            onClick={clearAll}
            disabled={notifications.length === 0}
            className="p-1.5 text-text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-transparent"
            title="Clear all"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-[440px] overflow-y-auto custom-scrollbar">
        {notifications.length > 0 ? (
          <div className="divide-y divide-border/30">
            {notifications.map((n) => (
              <div 
                key={n.id}
                onClick={() => !n.read && markAsRead(n.id)}
                className={`
                  group relative flex gap-4 p-5 transition-all cursor-pointer hover:bg-accent/[0.03]
                  ${!n.read ? 'bg-accent/[0.02]' : ''}
                `}
              >
                {/* Status Indicator */}
                {!n.read && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent shadow-[0_0_10px_rgba(0,212,255,0.4)]" />
                )}

                <div className={`
                  flex-shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center
                  ${getTypeStyles(n.type)}
                `}>
                  {getIcon(n.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className={`text-xs font-bold leading-tight truncate ${!n.read ? 'text-text-primary' : 'text-text-secondary'}`}>
                      {n.title}
                    </h4>
                    <span className="text-[10px] text-text-muted/60 whitespace-nowrap flex items-center gap-1 font-medium italic">
                      <Clock size={10} />
                      {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-text-muted line-clamp-2">
                    {n.message}
                  </p>
                  
                  {!n.read && (
                    <div className="mt-3 flex items-center gap-2">
                       <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                       <span className="text-[9px] font-bold text-accent uppercase tracking-widest">Mark as read</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-3xl bg-surface border border-border flex items-center justify-center mb-4 text-text-muted/20">
              <Bell size={32} />
            </div>
            <h4 className="text-sm font-bold text-text-secondary mb-1">No notifications</h4>
            <p className="text-xs text-text-muted max-w-[200px]">We'll let you know when something important happens.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-3 border-t border-border/50 bg-surface/30">
           <button className="w-full py-2 text-[11px] font-bold text-text-muted hover:text-accent transition-colors uppercase tracking-widest">
             See History
           </button>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
