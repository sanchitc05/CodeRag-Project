import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { Copy, Check, User, Bot, Sparkles, Terminal } from 'lucide-react';
import { Message } from '../../types';
import { DebugReport } from './DebugReport';

/**
 * Enhanced Message Bubble Component
 * Features: Markdown rendering, Code Highlighting, Copy Button, Role Icons
 */

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isBot = message.role === 'assistant';
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className={`flex w-full mb-8 animate-in fade-in slide-in-from-bottom-2 duration-400 ${isBot ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex max-w-[85%] lg:max-w-[75%] gap-4 ${isBot ? 'flex-row' : 'flex-row-reverse'}`}>
        
        {/* Avatar Area */}
        <div className={`flex-shrink-0 w-9 h-9 rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:scale-110 ${
          isBot ? 'bg-accent text-background border border-accent/20' : 'bg-surface border border-border text-text-muted'
        }`}>
          {isBot ? <Bot size={18} strokeWidth={2.5} /> : <User size={18} />}
        </div>

        {/* Content Area */}
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className={`flex items-center gap-2 mb-0.5 ${isBot ? 'justify-start' : 'justify-end'}`}>
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted/70">
              {isBot ? 'CodeRAG Intelligence' : 'You'}
            </span>
            {isBot && (
              <div className="flex items-center gap-1 bg-accent/10 border border-accent/20 px-1.5 py-0.5 rounded-md">
                <Sparkles size={10} className="text-accent" />
                <span className="text-[9px] font-bold text-accent uppercase tracking-tighter">AI Optimized</span>
              </div>
            )}
          </div>

          <div className={`
            px-5 py-4 rounded-2xl shadow-xl transition-theme overflow-hidden
            ${isBot 
              ? 'bg-surface-elevated/80 backdrop-blur-sm border border-border text-text-primary rounded-tl-none' 
              : 'bg-accent text-background font-medium rounded-tr-none'}
          `}>
            {isBot ? (
              <div className="markdown-content">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      const codeString = String(children).replace(/\n$/, '');
                      
                      return !inline && match ? (
                        <div className="relative group/code my-6 first:mt-2 last:mb-2">
                          <div className="absolute right-3 top-3 z-10 opacity-0 group-hover/code:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleCopy(codeString)}
                              className="p-1.5 rounded-lg bg-background/50 backdrop-blur-md border border-border/50 text-text-muted hover:text-accent hover:border-accent/40 shadow-sm transition-all"
                              title="Copy code"
                            >
                              {copiedCode === codeString ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                            </button>
                          </div>
                          
                          <div className="flex items-center justify-between px-4 py-2 bg-background/50 border-b border-border/50 rounded-t-xl">
                            <div className="flex items-center gap-2">
                              <Terminal size={12} className="text-accent" />
                              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{match[1]}</span>
                            </div>
                          </div>

                          <div className="rounded-b-xl overflow-hidden text-xs">
                            <SyntaxHighlighter
                              style={vscDarkPlus as any}
                              language={match[1]}
                              PreTag="div"
                              customStyle={{
                                margin: 0,
                                borderRadius: '0 0 12px 12px',
                                padding: '1.25rem',
                                background: 'transparent'
                              }}
                              {...props}
                            >
                              {codeString}
                            </SyntaxHighlighter>
                          </div>
                        </div>
                      ) : (
                        <code className={`${className} bg-background/50 px-1.5 py-0.5 rounded text-accent font-bold`} {...props}>
                          {children}
                        </code>
                      );
                    },
                    p: ({children}) => <p className="mb-4 last:mb-0 leading-relaxed text-sm">{children}</p>,
                    h1: ({children}) => <h1 className="text-xl font-bold mt-6 mb-4 text-text-primary tracking-tight">{children}</h1>,
                    h2: ({children}) => <h2 className="text-lg font-bold mt-5 mb-3 text-text-primary tracking-tight">{children}</h2>,
                    h3: ({children}) => <h3 className="text-base font-bold mt-4 mb-2 text-text-primary tracking-tight">{children}</h3>,
                    ul: ({children}) => <ul className="list-disc pl-6 mb-4 space-y-1 text-sm">{children}</ul>,
                    ol: ({children}) => <ol className="list-decimal pl-6 mb-4 space-y-1 text-sm">{children}</ol>,
                    li: ({children}) => <li className="mb-1">{children}</li>,
                    blockquote: ({children}) => (
                      <blockquote className="border-l-4 border-accent bg-accent/5 px-4 py-3 my-4 italic text-text-secondary rounded-r-lg">
                        {children}
                      </blockquote>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
            )}
            
            {/* If there's a result object, render the full DebugReport */}
            {isBot && message.result && (
              <div className="mt-4 border-t border-border pt-4">
                <DebugReport result={message.result} />
              </div>
            )}
          </div>
          
          {/* Timestamp or Status */}
          <div className={`flex items-center gap-2 mt-1 ${isBot ? 'justify-start' : 'justify-end'}`}>
            <span className="text-[9px] text-text-muted font-medium opacity-50">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
