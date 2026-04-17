import { useState } from 'react';
import { ChevronDown, ChevronUp, Bug, FileText, Wrench, Activity } from 'lucide-react';
import { DebugResult } from '../../types';
import { CodeBlock } from '../ui/CodeBlock';
import { ConfidenceBadge } from '../ui/ConfidenceBadge';
import { MarkdownRenderer } from '../ui/MarkdownRenderer';

export function DebugReport({ result }: { result: DebugResult }) {
  const [expandedEvidenceIndex, setExpandedEvidenceIndex] = useState<number | null>(null);
  const [showHypotheses, setShowHypotheses] = useState(false);

  const toggleEvidence = (index: number) => {
    setExpandedEvidenceIndex(expandedEvidenceIndex === index ? null : index);
  };

  return (
    <div className="space-y-6 mt-6 border-t border-gray-200 dark:border-gray-800 pt-6">
      {/* Root Cause Card */}
      <div className="bg-white dark:bg-gray-900 border border-red-100 dark:border-red-900/30 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-red-50/50 dark:bg-red-900/10 px-4 py-3 border-b border-red-100 dark:border-red-900/30 flex items-center gap-2">
          <Bug className="w-5 h-5 text-red-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Root Cause</h3>
        </div>
        <div className="p-4">
          <MarkdownRenderer content={result.root_cause || '_Not determined_'} />
        </div>
      </div>

      {/* Suggested Fix Card */}
      <div className="bg-white dark:bg-gray-900 border border-green-100 dark:border-green-900/30 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-green-50/50 dark:bg-green-900/10 px-4 py-3 border-b border-green-100 dark:border-green-900/30 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-green-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Suggested Fix</h3>
        </div>
        <div className="p-4">
          <MarkdownRenderer content={result.suggested_fix || '_Not available_'} />
        </div>
      </div>

      {/* Evidence Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <FileText className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
            Evidence ({result.evidence.length})
          </h3>
        </div>
        <div className="grid gap-3">
          {result.evidence.map((item, idx) => (
            <div key={idx} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm transition-all">
              <button
                onClick={() => toggleEvidence(idx)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors rounded-xl"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium font-mono truncate text-gray-700 dark:text-gray-300">
                    {item.file_path}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">
                    L{item.start_line}-{item.end_line}
                  </span>
                </div>
                {expandedEvidenceIndex === idx ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {expandedEvidenceIndex === idx && (
                <div className="p-4 pt-0">
                  <div className="rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 shadow-inner">
                    <CodeBlock code={item.content} language="python" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar / Metadata */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 rounded-full">
            <Activity className="w-3.5 h-3.5" />
            {result.iterations} reasoning iteration{result.iterations !== 1 ? 's' : ''}
          </div>
          <ConfidenceBadge confidence={result.confidence} />
        </div>

        {result.hypothesis_chain.length > 0 && (
          <div className="w-full sm:w-auto">
            <button
              onClick={() => setShowHypotheses(!showHypotheses)}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              {showHypotheses ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              View reasoning steps ({result.hypothesis_chain.length})
            </button>
          </div>
        )}
      </div>

      {showHypotheses && (
        <div className="bg-gray-50 dark:bg-gray-800/40 rounded-xl p-5 border border-gray-100 dark:border-gray-800 animate-fade-in">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-4">Reasoning Chain</h4>
          <div className="space-y-4 relative">
            <div className="absolute left-[7px] top-1 bottom-1 w-0.5 bg-blue-100 dark:bg-blue-900/30" />
            {result.hypothesis_chain.map((h, idx) => (
              <div key={idx} className="flex gap-4 relative">
                <div className="w-4 h-4 rounded-full bg-blue-500 border-4 border-white dark:border-gray-900 z-10 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{h}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
