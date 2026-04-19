import React, { useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import ChatWindow from '../components/chat/ChatWindow';
import { Terminal, Shield, Workflow } from 'lucide-react';

/**
 * Chat Workspace
 */

export const ChatPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Chat | CodeRAG';
  }, []);

  return (
    <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-700">
      {/* Page Header / Context Bar */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent/10 rounded-lg text-accent border border-accent/20">
            <Workflow size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Chat Workspace</h2>
            <p className="text-xs text-text-muted font-medium">Session isolation active</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 bg-surface-elevated border border-border rounded-full text-[10px] text-accent font-mono shadow-sm">
          <Shield size={12} />
          <span>SECURE SESSION</span>
        </div>
      </div>

      {/* The Chat Interface */}
      <div className="flex-1 bg-surface-elevated/20 border border-border rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm">
        <ChatWindow />
      </div>
    </div>
  );
};

export default ChatPage;
