import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none prose-pre:p-0 prose-pre:bg-transparent ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            const code = String(children).replace(/\n$/, '');

            if (!inline && language) {
              return (
                <CodeBlock
                  code={code}
                  language={language}
                />
              );
            }

            return (
              <code
                className={`${className} bg-gray-200 dark:bg-gray-700 rounded px-1.5 py-0.5 text-pink-600 dark:text-pink-400 font-mono text-xs`}
                {...props}
              >
                {children}
              </code>
            );
          },
          // Customize other elements for "premium" feel
          h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6 text-gray-900 dark:text-white border-b pb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 mt-5 text-gray-800 dark:text-gray-100">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-medium mb-2 mt-4 text-gray-800 dark:text-gray-200">{children}</h3>,
          p: ({ children }) => <p className="mb-4 leading-relaxed text-gray-700 dark:text-gray-300 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="list-disc ml-6 mb-4 space-y-2 text-gray-700 dark:text-gray-300">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal ml-6 mb-4 space-y-2 text-gray-700 dark:text-gray-300">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-brand-500 pl-4 italic my-4 text-gray-600 dark:text-gray-400">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700 text-sm">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => <th className="border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2 font-semibold">{children}</th>,
          td: ({ children }) => <td className="border border-gray-300 dark:border-gray-700 px-4 py-2">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
