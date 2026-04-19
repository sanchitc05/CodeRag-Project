import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Settings,
  Shield,
  LogOut,
  CreditCard,
  ExternalLink
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useConfigStore } from '../../store/configStore';

/**
 * User Profile Dropdown
 */

const UserProfileDropdown: React.FC = () => {
  const { logout } = useAuthStore();
  const { setProfileOpen, userProfile, setSettingsTab } = useConfigStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setProfileOpen(false);
    navigate('/login');
  };

  const navToSettings = (tab: string = 'profile') => {
    setSettingsTab(tab);
    navigate('/settings');
    setProfileOpen(false);
  };

  return (
    <div className="absolute top-full right-0 mt-2 w-64 bg-surface-elevated/95 backdrop-blur-xl border border-border rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 animate-in fade-in zoom-in-95 duration-200 z-50">
      {/* Header */}
      <div className="px-3 py-4 border-b border-border mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent text-background flex items-center justify-center shadow-lg font-black text-sm">
            {userProfile.fullName.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-text-primary truncate">{userProfile.fullName}</p>
            <p className="text-[10px] text-text-muted truncate uppercase tracking-widest">@{userProfile.username}</p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="space-y-1">
        <button
          onClick={() => navToSettings('profile')}
          className="w-full flex items-center gap-3 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface rounded-xl transition-all group"
        >
          <User size={14} className="group-hover:text-accent transition-colors" />
          <span>My Profile</span>
        </button>
        <button
          onClick={() => navToSettings('account')}
          className="w-full flex items-center gap-3 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface rounded-xl transition-all group"
        >
          <Settings size={14} className="group-hover:text-accent transition-colors" />
          <span>Account Settings</span>
        </button>
        <button
          onClick={() => navToSettings('appearance')}
          className="w-full flex items-center gap-3 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface rounded-xl transition-all group"
        >
          <CreditCard size={14} className="group-hover:text-accent transition-colors" />
          <span>Billing & Account</span>
        </button>
        <button
          onClick={() => navToSettings('security')}
          className="w-full flex items-center gap-3 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface rounded-xl transition-all group"
        >
          <Shield size={14} className="group-hover:text-accent transition-colors" />
          <span>Security</span>
        </button>
      </div>

      <div className="my-2 border-t border-border" />

      <div className="space-y-1">
        <a
          href="https://github.com/snehas-05/CodeRag-Project"
          target="_blank"
          rel="noreferrer"
          className="w-full flex items-center justify-between px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-surface rounded-xl transition-all group"
        >
          <div className="flex items-center gap-3">
            <ExternalLink size={14} />
            <span>Project Repository</span>
          </div>
        </a>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-xs text-danger hover:bg-danger/5 rounded-xl transition-all group"
        >
          <LogOut size={14} />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
};

export default UserProfileDropdown;
