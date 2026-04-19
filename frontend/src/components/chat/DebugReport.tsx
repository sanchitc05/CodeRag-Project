import React, { useState } from 'react';
import { 
  Bug, 
  Wrench, 
  ChevronDown, 
  ChevronUp, 
  FileCode, 
  Search, 
  Share2, 
  History,
  FileText
} from 'lucide-react';
import { DebugResult } from '../../types';
import { CodeBlock } from '../ui/CodeBlock';
import { ConfidenceBadge } from '../ui/ConfidenceBadge';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';

/**
 * DebugReport: High-fidelity analysis visualization
 */

export const DebugReport: React.FC<{ result: DebugResult }> = ({ result }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="space-y-8 mt-4 animate-in fade-in slide-in-from-top-4 duration-700">
      
      {/* Primary Goal / Root Cause */}
      <div className="group relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-rose-500/20 to-orange-500/20 rounded-3xl blur opacity-25 group-hover:opacity-100 transition duration-1000"></div>
        <div className="relative bg-surface border border-border rounded-3xl overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-rose-500/5 to-transparent flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/10 rounded-xl text-rose-500 border border-rose-500/20">
                <Bug size={18} />
              </div>
              <h3 className="font-bold text-text-primary uppercase tracking-wider text-sm">
                {result.intent === 'REPO_LEVEL' ? 'Repository Overview' : 'Root Cause Identification'}
              </h3>
            </div>
            <ConfidenceBadge confidence={result.confidence} />
          </div>
          <div className="p-6">
            <MarkdownRenderer content={result.root_cause} />
          </div>
        </div>
      </div>

      {/* Suggested Solution */}
      <div className="group relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-3xl blur opacity-25 group-hover:opacity-100 transition duration-1000"></div>
        <div className="relative bg-surface border border-border rounded-3xl overflow-hidden shadow-2xl">
          <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-emerald-500/5 to-transparent flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500 border border-emerald-500/20">
                <Wrench size={18} />
              </div>
              <h3 className="font-bold text-text-primary uppercase tracking-wider text-sm">
                {result.intent === 'REPO_LEVEL' ? 'Strategic Context' : 'Remediation Strategy'}
              </h3>
            </div>
            <div className="flex items-center gap-2">
               <button className="p-2 hover:bg-surface-elevated rounded-lg text-text-muted transition-colors">
                  <Share2 size={16} />
               </button>
            </div>
          </div>
          <div className="p-6">
            <MarkdownRenderer content={result.suggested_fix} />
          </div>
        </div>
      </div>

      {/* Evidence Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-xl text-accent border border-accent/20">
                <FileCode size={18} />
              </div>
              <h3 className="font-bold text-text-primary uppercase tracking-wider text-sm">Supporting Evidence</h3>
           </div>
           <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{result.evidence.length} Code References</span>
        </div>

        <div className="evidence-grid">
          {result.evidence.map((item, idx) => (
            <div 
              key={idx} 
              className={`
                bg-surface-elevated/50 border border-border rounded-2xl overflow-hidden transition-all duration-300
                ${expandedIndex === idx ? 'ring-2 ring-accent/30 border-accent/30 shadow-2xl' : 'hover:border-text-muted/30 shadow-sm'}
              `}
            >
              <button 
                onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                className="w-full flex items-center justify-between p-4 px-6 text-left"
              >
                <div className="flex items-center gap-4 overflow-hidden">
                   <div className={`p-2 rounded-lg transition-colors ${expandedIndex === idx ? 'bg-accent text-background' : 'bg-background text-text-muted'}`}>
                      <FileText size={16} />
                   </div>
                   <div className="flex flex-col truncate">
                      <span className="text-xs font-bold font-mono text-text-primary truncate">{item.file_path}</span>
                      <span className="text-[10px] text-text-muted font-mono uppercase tracking-tighter">Line {item.start_line} - {item.end_line}</span>
                   </div>
                </div>
                {expandedIndex === idx ? <ChevronUp size={16} className="text-accent" /> : <ChevronDown size={16} className="text-text-muted" />}
              </button>
              
              {expandedIndex === idx && (
                <div className="p-6 pt-0 animate-in slide-in-from-top-2 duration-300">
                   <CodeBlock code={item.content} language="typescript" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Reasoning History Toggle */}
      {result.hypothesis_chain && result.hypothesis_chain.length > 0 && (
         <div className="pt-4">
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-surface-elevated hover:bg-surface transition-all text-[10px] font-bold uppercase tracking-widest text-text-secondary"
            >
              <History size={14} className={showHistory ? 'text-accent' : ''} />
              {showHistory ? 'Hide Reasoning Process' : `View ${result.hypothesis_chain.length} Reasoning Iterations`}
            </button>
            
            {showHistory && (
              <div className="mt-6 p-6 rounded-3xl bg-surface-elevated/30 border border-border border-dashed space-y-4 animate-in fade-in zoom-in duration-500">
                <div className="flex items-center gap-2 mb-4">
                   <Search size={14} className="text-accent" />
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-text-muted">Analysis Trajectory</h4>
                </div>
                {result.hypothesis_chain.map((h, i) => (
                  <div key={i} className="flex gap-4 relative">
                    <div className="absolute left-[7px] top-6 bottom-0 w-px bg-border group-last:hidden" />
                    <div className="w-4 h-4 rounded-full bg-accent border-4 border-background shrink-0 z-10" />
                    <p className="text-xs text-text-secondary leading-relaxed pb-6 last:pb-0">{h}</p>
                  </div>
                ))}
              </div>
            )}
         </div>
      )}
    </div>
  );
};

export default DebugReport;
