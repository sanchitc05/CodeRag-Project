import React from 'react';
import {
  User,
  Settings as SettingsIcon,
  Bell,
  Monitor,
  Check,
  ChevronRight,
  Zap,
  Globe
} from 'lucide-react';
import { useConfigStore } from '../store/configStore';
import { toast } from 'react-hot-toast';

/**
 * Settings Page
 * User configuration and interface preferences.
 */

export const SettingsPage: React.FC = () => {
  const { theme, toggleTheme, settingsTab, setSettingsTab, userProfile, updateProfile } = useConfigStore();
  const [formData, setFormData] = React.useState(userProfile);
  const [isSaving, setIsSaving] = React.useState(false);

  // Sync formData when userProfile changes
  React.useEffect(() => {
    setFormData(userProfile);
  }, [userProfile]);

  const sections = [
    { id: 'profile', title: 'Profile', icon: User, description: 'Manage your public identity and account details.' },
    { id: 'appearance', title: 'Appearance', icon: Monitor, description: 'Customize themes and interface settings.' },
    { id: 'account', title: 'Account', icon: Globe, description: 'Manage regional settings and account status.' },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    updateProfile(formData);
    setIsSaving(false);
    toast.success('Settings saved successfully');
  };

  const renderProfileSection = () => (
    <div className="space-y-8 animate-fade-in text-text-primary">
      {/* Avatar Section */}
      <div className="flex items-start gap-6 pb-8 border-b border-border/50">
        <div className="relative group">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center text-background text-3xl font-black shadow-xl group-hover:scale-[1.02] transition-transform">
            {formData.fullName.charAt(0)}
          </div>
          <button className="absolute -bottom-2 -right-2 p-2 bg-surface-elevated border border-border rounded-xl shadow-lg hover:text-accent transition-colors">
            <SettingsIcon size={14} />
          </button>
        </div>
        <div className="space-y-2">
          <h4 className="text-lg font-bold text-text-primary">{formData.fullName}</h4>
          <p className="text-xs text-text-muted">@{formData.username}</p>
          <div className="flex gap-2">
            <span className="px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20 text-[9px] font-bold text-accent uppercase tracking-tighter">Verified Account</span>
            <span className="px-2 py-0.5 rounded-md bg-surface border border-border text-[9px] font-bold text-text-muted uppercase tracking-tighter">Active Workspace</span>
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Full Name</label>
          <input
            type="text"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            className="w-full px-4 py-3 bg-background border border-border rounded-2xl text-sm text-text-primary focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all outline-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">Username</label>
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            className="w-full px-4 py-3 bg-background border border-border rounded-2xl text-sm text-text-primary focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all outline-none"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 items-center">
        <button
          onClick={() => setFormData(userProfile)}
          className="px-6 py-2.5 rounded-xl text-xs font-bold text-text-secondary hover:bg-background transition-all"
        >
          Discard
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-8 py-2.5 rounded-xl text-xs font-bold bg-accent text-background shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );

  const renderAppearanceSection = () => (
    <div className="space-y-8 animate-fade-in text-text-primary">
      <div className="grid grid-cols-2 gap-4">
        <div
          onClick={theme === 'light' ? toggleTheme : undefined}
          className={`
            p-6 rounded-2xl border-2 cursor-pointer transition-all
            ${theme === 'dark' ? 'border-accent bg-accent/5 shadow-inner' : 'border-border bg-background hover:border-accent/30'}
          `}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white">
              <Zap size={18} fill="currentColor" />
            </div>
            {theme === 'dark' && <Check size={16} className="text-accent" />}
          </div>
          <p className="text-sm font-bold text-text-primary">Dark Mode</p>
          <p className="text-[10px] text-text-muted mt-1">High contrast, low strain environment.</p>
        </div>

        <div
          onClick={theme === 'dark' ? toggleTheme : undefined}
          className={`
            p-6 rounded-2xl border-2 cursor-pointer transition-all
            ${theme === 'light' ? 'border-accent bg-accent/5 shadow-inner' : 'border-border bg-background hover:border-accent/30'}
          `}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-900">
              <Zap size={18} />
            </div>
            {theme === 'light' && <Check size={16} className="text-accent" />}
          </div>
          <p className="text-sm font-bold text-text-primary">Light Mode</p>
          <p className="text-[10px] text-text-muted mt-1">Minimalist and clean aesthetics.</p>
        </div>
      </div>
    </div>
  );

  const renderAccountSection = () => (
    <div className="space-y-6 animate-fade-in text-text-primary">
      <div className="p-6 bg-background border border-border rounded-2xl">
        <h4 className="text-sm font-bold mb-4">Regional Settings</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-secondary">Language</span>
            <span className="font-bold">English (US)</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-secondary">Timezone</span>
            <span className="font-bold">UTC-5 (New York)</span>
          </div>
        </div>
      </div>

      <div className="p-6 bg-rose-500/5 border border-rose-500/20 rounded-2xl group">
        <h4 className="text-sm font-bold text-rose-500 mb-2">Danger Zone</h4>
        <p className="text-[10px] text-text-muted mb-4 leading-relaxed">Permanently delete your account and all associated data. This action is irreversible.</p>
        <button className="px-4 py-2 border border-rose-500 text-rose-500 rounded-xl text-[10px] font-bold hover:bg-rose-500 hover:text-white transition-all uppercase tracking-widest">
          Delete Account
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000 last:pb-20">

      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-4xl font-black text-text-primary tracking-tighter uppercase">Settings</h2>
        <p className="text-text-muted text-sm leading-relaxed max-w-xl">
          Manage your CodeRAG account and interface preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

        {/* Navigation - Left Sidebar */}
        <div className="md:col-span-1 space-y-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setSettingsTab(section.id)}
              className={`
                w-full flex items-center justify-between p-3 rounded-xl transition-all group text-left
                ${settingsTab === section.id ? 'bg-accent/10 border border-accent/20 text-accent' : 'hover:bg-surface border border-transparent text-text-secondary'}
              `}
            >
              <div className="flex items-center gap-3">
                <section.icon size={16} />
                <span className="text-xs font-semibold">{section.title}</span>
              </div>
              <ChevronRight size={14} className={`transition-all ${settingsTab === section.id ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}`} />
            </button>
          ))}
        </div>

        {/* Content Area - Right 3 Columns */}
        <div className="md:col-span-3 space-y-8">

          <div className="bg-surface border border-border rounded-[32px] overflow-hidden shadow-2xl min-h-[500px]">
            <div className="px-8 py-6 border-b border-border bg-gradient-to-r from-accent/5 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent/10 rounded-xl text-accent">
                    {React.createElement(sections.find(s => s.id === settingsTab)?.icon || User, { size: 20 })}
                  </div>
                  <div className="flex flex-col">
                    <h3 className="font-black text-text-primary uppercase tracking-widest text-xs">
                      {sections.find(s => s.id === settingsTab)?.title}
                    </h3>
                    <p className="text-[10px] text-text-muted">
                      {sections.find(s => s.id === settingsTab)?.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8">
              {settingsTab === 'profile' && renderProfileSection()}
              {settingsTab === 'appearance' && renderAppearanceSection()}
              {settingsTab === 'account' && renderAccountSection()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
