import React, { useState } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import { Copy, Check, Terminal } from 'lucide-react';

/**
 * CodeBlock: Code Visualization
 */

interface CodeBlockProps {
  code: string;
  language: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group relative rounded-2xl overflow-hidden border border-border bg-slate-950 shadow-2xl transition-all hover:border-accent/30">
      {/* Code Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/5">
        <div className="flex items-center gap-2">
           <Terminal size={14} className="text-accent" />
           <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{language || 'code'}</span>
        </div>
        
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/10 text-[10px] font-bold uppercase tracking-wider text-text-muted transition-all"
        >
          {copied ? (
            <><Check size={12} className="text-emerald-400" /> <span className="text-emerald-400">Copied</span></>
          ) : (
            <><Copy size={12} /> <span>Copy</span></>
          )}
        </button>
      </div>

      <Highlight theme={themes.vsDark} code={code} language={language}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={`${className} p-4 overflow-x-auto text-[13px] leading-relaxed custom-scrollbar`}
            style={{ ...style, backgroundColor: 'transparent' }}
          >
            <code>
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line, key: i })} className="table-row">
                  <span className="table-cell pr-4 text-slate-700 text-right select-none w-10">{i + 1}</span>
                  <span className="table-cell">
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token, key })} />
                    ))}
                  </span>
                </div>
              ))}
            </code>
          </pre>
        )}
      </Highlight>
    </div>
  );
};

export default CodeBlock;
