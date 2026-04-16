import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, Moon, Sun } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { useAuthStore } from '../store/authStore';
import { ingestRepo } from '../api/query';
import { Spinner } from '../components/ui/Spinner';

function formatIngestError(err: any): string {
  const detail = err?.response?.data?.detail;

  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (typeof first?.msg === 'string' && first.msg.trim()) {
      return first.msg;
    }
  }

  return err?.message || 'Ingestion failed';
}

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [githubUrl, setGithubUrl] = useState('');
  const [repoId, setRepoId] = useState('');
  const [isIngestLoading, setIsIngestLoading] = useState(false);
  const [repos, setRepos] = useState<string[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Load repos and theme from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('coderag_repos');
    setRepos(stored ? JSON.parse(stored) : []);

    const darkMode = localStorage.getItem('coderag_dark_mode') === 'true';
    setIsDarkMode(darkMode);
    applyTheme(darkMode);
  }, []);

  const applyTheme = (dark: boolean) => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('coderag_dark_mode', newDarkMode.toString());
    applyTheme(newDarkMode);
    toast.success(newDarkMode ? 'Dark mode enabled' : 'Light mode enabled');
  };

  const handleIngestRepo = async () => {
    if (!githubUrl || !repoId) {
      toast.error('Please fill in both fields');
      return;
    }

    setIsIngestLoading(true);
    try {
      await ingestRepo(githubUrl, repoId);
      const newRepos = [...repos, repoId];
      setRepos(newRepos);
      localStorage.setItem('coderag_repos', JSON.stringify(newRepos));
      toast.success(`Repository "${repoId}" ingested successfully`);
      setGithubUrl('');
      setRepoId('');
    } catch (err: any) {
      toast.error(formatIngestError(err));
    } finally {
      setIsIngestLoading(false);
    }
  };

  const handleRemoveRepo = (repoToRemove: string) => {
    const newRepos = repos.filter((r) => r !== repoToRemove);
    setRepos(newRepos);
    localStorage.setItem('coderag_repos', JSON.stringify(newRepos));
    toast.success(`Repository removed`);
  };

  return (
    <AppLayout title="Settings">
      <div className="p-6 max-w-2xl h-full overflow-y-auto">
        {/* Ingest Repository Section */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Ingest Repository
          </h2>
          <div className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                GitHub URL
              </label>
              <input
                type="text"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Repository ID
              </label>
              <input
                type="text"
                value={repoId}
                onChange={(e) => setRepoId(e.target.value)}
                placeholder="e.g., my-project-v1"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleIngestRepo}
              disabled={isIngestLoading}
              className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium transition flex items-center justify-center gap-2"
            >
              {isIngestLoading && <Spinner size="sm" />}
              {isIngestLoading ? 'Ingesting...' : 'Ingest Repository'}
            </button>

            {/* Ingested Repos */}
            {repos.length > 0 && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Ingested Repositories
                </h3>
                <div className="space-y-2">
                  {repos.map((repo) => (
                    <div
                      key={repo}
                      className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg"
                    >
                      <span className="text-sm text-gray-900 dark:text-white">
                        {repo}
                      </span>
                      <button
                        onClick={() => handleRemoveRepo(repo)}
                        className="px-2 py-1 rounded text-xs bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/40 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Account Section */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Account
          </h2>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </section>

        {/* Theme Section */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Theme
          </h2>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Dark Mode
              </span>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
