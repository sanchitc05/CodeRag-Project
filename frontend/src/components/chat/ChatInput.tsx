import React, { useRef, useState, useEffect } from 'react';
import { Send, Terminal, Loader2, Sparkles, Command } from 'lucide-react';

/**
 * Chat Input Component
 */

interface ChatInputProps {
  onSend: (query: string, repo: string) => void;
  isLoading: boolean;
  availableRepos: string[];
  selectedRepo: string;
  onRepoChange: (repo: string) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSend, 
  isLoading, 
  availableRepos, 
  selectedRepo, 
  onRepoChange 
}) => {
  const [query, setQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!query.trim() || isLoading || !selectedRepo) return;
    onSend(query.trim(), selectedRepo);
    setQuery('');
  };

  return (
    <div className="max-w-4xl mx-auto w-full group animate-in slide-in-from-bottom-4 duration-500">
      <div className="relative flex flex-col bg-surface/90 backdrop-blur-md border border-border shadow-2xl rounded-3xl overflow-hidden transition-all focus-within:border-accent/40 focus-within:ring-4 focus-within:ring-accent/5">
        
        {/* Repo Selector Bar */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-border/50 bg-background/30">
           <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-accent/10 border border-accent/20 text-accent text-[9px] font-black uppercase tracking-wider">
              <Terminal size={12} />
              <span>Context</span>
           </div>
           
           <select 
             value={selectedRepo}
             onChange={(e) => onRepoChange(e.target.value)}
             className="bg-transparent text-xs font-bold text-text-secondary outline-none cursor-pointer hover:text-accent transition-colors appearance-none"
           >
             {!selectedRepo && <option value="">Select scope...</option>}
             {availableRepos.map(repo => (
               <option key={repo} value={repo} className="bg-surface">{repo}</option>
             ))}
           </select>

           <div className="ml-auto hidden md:flex items-center gap-2 text-text-muted text-[10px] uppercase font-black tracking-widest opacity-30">
              <Command size={10} />
              <span>Enter to Push</span>
           </div>
        </div>

        {/* Input Area */}
        <div className="flex items-end gap-4 p-5">
          <div className="flex-1 flex flex-col pt-1">
             <textarea
               ref={textareaRef}
               rows={1}
               value={query}
               onChange={(e) => setQuery(e.target.value)}
               onKeyDown={handleKeyDown}
               spellCheck="true"
               autoCorrect="on"
               autoCapitalize="sentences"
               placeholder="How does the authentication strategy work in this repo?"
               className="w-full bg-transparent border-none outline-none resize-none text-[15px] leading-relaxed text-text-primary placeholder:text-text-muted/30 py-1 custom-scrollbar"
             />
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={isLoading || !query.trim() || !selectedRepo}
            className={`
              w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all
              ${isLoading || !query.trim() || !selectedRepo 
                ? 'bg-surface-elevated text-text-muted cursor-not-allowed opacity-50' 
                : 'bg-accent text-background shadow-[0_8px_20px_rgba(var(--accent-rgb),0.4)] hover:scale-110 active:scale-95 group/btn'
              }
            `}
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <div className="relative">
                <Send size={18} className="transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                <Sparkles size={10} className="absolute -top-3 -right-3 text-background opacity-0 group-hover/btn:opacity-100 transition-opacity" />
              </div>
            )}
          </button>
        </div>

        {/* Progress Bar (Visible during stream) */}
        <div className="h-[2px] w-full bg-border overflow-hidden">
           <div className={`h-full bg-accent transition-all duration-500 ease-in-out ${isLoading ? 'w-full animate-pulse' : 'w-0'}`} />
        </div>
      </div>
      
      <p className="mt-3 text-center text-[10px] text-text-muted font-bold uppercase tracking-widest opacity-40">
        Engine: CodeRAG v2.4 Pulse | Contextual Security Enabled
      </p>
    </div>
  );
};

export default ChatInput;
