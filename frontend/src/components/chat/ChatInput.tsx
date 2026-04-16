import {
  useRef,
  useState,
  useEffect,
  ChangeEvent,
  KeyboardEvent,
} from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSendQuery: (query: string, repoId: string) => Promise<void>;
  isLoading: boolean;
  availableRepos: string[];
}

export function ChatInput({
  onSendQuery,
  isLoading,
  availableRepos,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState('');
  const [selectedRepo, setSelectedRepo] = useState(
    availableRepos[0] || ''
  );

  useEffect(() => {
    if (!availableRepos.length) {
      setSelectedRepo('');
      return;
    }

    if (!availableRepos.includes(selectedRepo)) {
      setSelectedRepo(availableRepos[0]);
    }
  }, [availableRepos, selectedRepo]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(
        textareaRef.current.scrollHeight,
        120
      ) + 'px';
    }
  }, [query]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!query.trim() || isLoading || !selectedRepo) return;
    await onSendQuery(query, selectedRepo);
    setQuery('');
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900">
      <div className="flex gap-2">
        <select
          value={selectedRepo}
          onChange={(e) => setSelectedRepo(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
        >
          <option value="">Select repository</option>
          {availableRepos.map((repo) => (
            <option key={repo} value={repo}>
              {repo}
            </option>
          ))}
        </select>

        <div className="flex-1 relative flex">
          <textarea
            ref={textareaRef}
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask a debugging question... (Ctrl+Enter to send)"
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={1}
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={handleSubmit}
            disabled={isLoading || !query.trim() || !selectedRepo}
            className="ml-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white flex items-center gap-2 transition disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
