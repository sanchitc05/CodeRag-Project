import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { login } from '../api/auth';
import { Code2, Github, Layout, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

/**
 * CodeRAG Login
 */

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();

  const from = location.state?.from?.pathname || '/chat';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await login(email, password);
      setAuth(response);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex font-sans">
      {/* Left Side - Visual Content (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-surface-elevated items-center justify-center p-12 overflow-hidden border-r border-border">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_30%,rgba(0,212,255,0.1),transparent)]" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent/10 blur-[120px] rounded-full" />

        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center shadow-[0_0_30px_rgba(0,212,255,0.4)]">
              <Code2 className="text-background" size={32} />
            </div>
            <span className="font-bold text-3xl tracking-tight text-text-primary">
              Code<span className="text-accent">RAG</span>
            </span>
          </div>

          <h1 className="text-4xl font-bold text-text-primary mb-6 leading-tight">
            Advanced <span className="text-accent">code intelligence</span>.
          </h1>
          <p className="text-lg text-text-secondary mb-8">
            CodeRAG uses agentic reasoning to analyze your repositories and help resolve complex development issues.
          </p>

          <div className="space-y-4">
            {[
              { icon: Layout, text: "Interactive RAG visualizations" },
              { icon: Github, text: "Secure GitHub integration" },
              { icon: ArrowRight, text: "Context-aware automated analysis" }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-text-secondary">
                <item.icon size={20} className="text-accent" />
                <span className="font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center p-8 md:p-16 lg:p-24 relative">
        <div className="lg:hidden absolute top-8 left-8 flex items-center gap-2">
          <Code2 className="text-accent" size={24} />
          <span className="font-bold text-xl text-text-primary">CodeRAG</span>
        </div>

        <div className="max-w-md w-full mx-auto">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-text-primary mb-2">Welcome back</h2>
            <p className="text-text-secondary">Enter your credentials to access your workspace.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 flex items-start gap-3 text-danger text-sm animate-in fade-in slide-in-from-top-2">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-text-muted ml-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-accent/50 focus:ring-1 focus:ring-accent/20 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-bold uppercase tracking-widest text-text-muted">
                  Password
                </label>
                <a href="#" className="text-xs text-accent hover:text-accent/80 transition-colors font-medium">
                  Forgot password?
                </a>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-accent/50 focus:ring-1 focus:ring-accent/20 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-accent hover:bg-accent/90 text-background font-bold py-3 px-4 rounded-xl shadow-lg shadow-accent/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-border">
            <p className="text-center text-text-secondary text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-accent hover:text-accent/80 font-bold transition-colors">
                Create one now
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
