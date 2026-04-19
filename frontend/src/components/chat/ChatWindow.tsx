import React, { useRef, useEffect, useState } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import { useStream } from '../../hooks/useStream';
import { getAvailableRepos } from '../../api/query';
import { getSession } from '../../api/history';
import { Sparkles, Terminal, Book, Code2, Cpu } from 'lucide-react';

/**
 * Enhanced AI Debugger Workspace: ChatWindow
 * Replaced brittle components with premium UI blocks.
 */

const ChatWindow: React.FC = () => {
  const { messages, isStreaming, sendMessage, setMessages } = useStream();
  const [searchParams] = useSearchParams();
  const [availableRepos, setAvailableRepos] = useState<string[]>([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load available repositories for context selection
  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const repos = await getAvailableRepos();
        setAvailableRepos(repos);
        if (repos.length > 0) setSelectedRepo(repos[0]);
      } catch (err) {
        console.error('Failed to load repositories for workspace:', err);
      }
    };
    fetchRepos();
  }, []);

  const location = useLocation();

  // Handle session loading from History (state or URL param)
  useEffect(() => {
    const sessionFromState = location.state?.session;
    const sessionId = searchParams.get('session');

    if (sessionFromState) {
      setMessages([
        {
          id: `user-${sessionFromState.id}`,
          role: 'user',
          content: sessionFromState.query,
          timestamp: sessionFromState.created_at,
        },
        {
          id: `assistant-${sessionFromState.id}`,
          role: 'assistant',
          content: `Showing analysis for: "${sessionFromState.query}"`,
          result: sessionFromState.response,
          timestamp: sessionFromState.created_at,
        }
      ]);
    } else if (sessionId) {
      const loadSession = async () => {
        try {
          const session = await getSession(parseInt(sessionId));
          if (session) {
            setMessages([
              {
                id: `user-${session.id}`,
                role: 'user',
                content: session.query,
                timestamp: session.created_at,
              },
              {
                id: `assistant-${session.id}`,
                role: 'assistant',
                content: `Showing analysis for: "${session.query}"`,
                result: session.response,
                timestamp: session.created_at,
              }
            ]);
          }
        } catch (err) {
          console.error('Failed to load session:', err);
        }
      };
      loadSession();
    }
  }, [location.state, searchParams, setMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  const suggests = [
    { icon: <Terminal size={14} />, text: "Analyze the database schema" },
    { icon: <Code2 size={14} />, text: "Refactor the authentication flow" },
    { icon: <Cpu size={14} />, text: "Optimize backend query performance" },
    { icon: <Book size={14} />, text: "Explain the current project structure" },
  ];

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-background">
      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-8 pt-8 pb-32">
        <div className="max-w-4xl mx-auto w-full">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
              <div className="relative mb-8">
                <div className="absolute -inset-4 bg-accent/20 blur-2xl rounded-full animate-pulse" />
                <div className="relative w-20 h-20 bg-accent rounded-3xl flex items-center justify-center shadow-2xl shadow-accent/20 border border-accent/30 rotate-3">
                  <Sparkles size={40} className="text-background animate-pulse" strokeWidth={2.5} />
                </div>
              </div>
              
              <h2 className="text-3xl font-black text-text-primary tracking-tight mb-3">
                Hello, <span className="text-accent">Engineer</span>
              </h2>
              <p className="text-text-muted max-w-lg mb-12 font-medium leading-relaxed">
                Connect your repository knowledge and let's build something exceptional. I can help with architecture, debugging, or deep code analysis.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
                {suggests.map((s, idx) => (
                  <button 
                    key={idx}
                    onClick={() => sendMessage(s.text, selectedRepo)}
                    disabled={!selectedRepo}
                    className="flex items-center gap-3 p-4 bg-surface-elevated/50 border border-border rounded-2xl text-left hover:border-accent/40 hover:bg-accent/5 transition-all group shadow-sm disabled:opacity-50"
                  >
                    <div className="p-2 bg-background border border-border rounded-lg text-text-muted group-hover:text-accent group-hover:border-accent/20 transition-colors">
                      {s.icon}
                    </div>
                    <span className="text-xs font-bold text-text-secondary group-hover:text-text-primary">
                      {s.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
              {isStreaming && (
                <div className="flex justify-start gap-4 mb-8 animate-pulse">
                  <div className="w-9 h-9 rounded-2xl bg-surface-elevated border border-border" />
                  <div className="flex flex-col gap-2">
                    <div className="h-4 w-32 bg-surface-elevated rounded-lg" />
                    <div className="h-20 w-full bg-surface-elevated rounded-2xl" />
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 bg-gradient-to-t from-background via-background/90 to-transparent pointer-events-none">
        <div className="max-w-4xl mx-auto w-full pointer-events-auto">
          <ChatInput 
            onSend={(query, repo) => sendMessage(query, repo)} 
            isLoading={isStreaming}
            availableRepos={availableRepos}
            selectedRepo={selectedRepo}
            onRepoChange={setSelectedRepo}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
