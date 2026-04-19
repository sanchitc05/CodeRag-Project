import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { Code2, ArrowRight, CheckCircle2, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';

/**
 * CodeRAG Register
 */

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const passwordStrength = useMemo(() => {
    const pw = formData.password;
    if (!pw) return 0;
    let strength = 0;
    if (pw.length >= 8) strength += 25;
    if (/[A-Z]/.test(pw)) strength += 25;
    if (/[0-9]/.test(pw)) strength += 25;
    if (/[^A-Za-z0-9]/.test(pw)) strength += 25;
    return strength;
  }, [formData.password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (passwordStrength < 50) {
      setError("Please choose a stronger password (min 8 chars, mixed case/numbers).");
      return;
    }

    setIsLoading(true);

    try {
      // Current backend only takes email and password
      const response = await register(formData.email, formData.password);
      setAuth(response);
      navigate('/chat');
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <div className="container mx-auto max-w-5xl flex-1 flex flex-col lg:flex-row items-center justify-center p-6 gap-12 lg:gap-24">

        {/* Left Side: Context */}
        <div className="hidden lg:block w-full lg:w-1/2">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-8">
            <ShieldCheck className="text-accent" size={32} />
          </div>
          <h1 className="text-5xl font-bold text-text-primary mb-6 leading-tight">
            Secure <span className="text-accent">code analysis</span>.
          </h1>
          <p className="text-text-secondary text-xl leading-relaxed mb-10">
            Join developers using CodeRAG to analyze their codebases with secure, isolated sessions.
          </p>

          <div className="space-y-6">
            {[
              "End-to-end encrypted codebase analysis",
              "Session isolation by default",
              "Advanced agentic code reasoning"
            ].map((text, i) => (
              <div key={i} className="flex items-center gap-3 text-text-secondary font-medium">
                <CheckCircle2 size={20} className="text-accent shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Register Form */}
        <div className="w-full lg:w-1/2 max-w-md bg-surface border border-border rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <Code2 className="text-text-muted/10" size={64} />
          </div>

          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-text-primary mb-2">Create Account</h2>
            <p className="text-text-secondary text-sm mb-8">Set up your workspace and get started.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 flex items-start gap-3 text-danger text-sm animate-in fade-in slide-in-from-top-2">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-1">Work Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:border-accent/50 focus:ring-1 focus:ring-accent/10 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-1">Password</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:border-accent/50 focus:ring-1 focus:ring-accent/10 outline-none transition-all"
                />

                {/* Password Strength Meter */}
                <div className="flex gap-1 mt-2">
                  {[25, 50, 75, 100].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-colors ${passwordStrength >= level
                          ? (passwordStrength <= 50 ? 'bg-amber-500' : 'bg-accent')
                          : 'bg-border'
                        }`}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 pb-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-text-muted ml-1">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => updateField('confirmPassword', e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-text-primary focus:border-accent/50 focus:ring-1 focus:ring-accent/10 outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-accent text-background font-bold py-3 px-4 rounded-xl hover:bg-accent/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 group"
              >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-text-secondary text-xs mt-8">
              Already have an account?{' '}
              <Link to="/login" className="text-accent font-bold hover:text-accent/80 transition-colors">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
