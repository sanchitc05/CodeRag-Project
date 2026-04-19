import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  MessageSquare,
  LayoutDashboard,
  Settings,
  LogOut,
  Code2,
  Terminal,
  History
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useConfigStore } from '../../store/configStore';
import UserProfileDropdown from './UserProfileDropdown';

/**
 * CodeRAG Sidebar
 */

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { name: 'Chat', icon: MessageSquare, path: '/chat' },
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'System', icon: Terminal, path: '/command-center' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  const { isProfileOpen, setProfileOpen } = useConfigStore();

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-50 w-64 bg-background border-r border-border transition-transform duration-300 ease-in-out
      md:translate-x-0 md:static md:w-20 lg:w-64
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      <div className="flex flex-col h-full">
        {/* Branding */}
        <div className="h-16 flex items-center px-6 md:justify-center lg:justify-start border-b border-border">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/chat')}>
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shadow-[0_0_15px_rgba(0,212,255,0.4)]">
              <Code2 className="text-background" size={20} />
            </div>
            <span className="font-bold text-xl tracking-tight text-text-primary md:hidden lg:block">
              Code<span className="text-accent">RAG</span>
            </span>
          </div>
        </div>

        {/* Main Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              onClick={onClose}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group
                md:justify-center lg:justify-start
                ${isActive
                  ? 'bg-accent/10 text-accent border border-accent/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface/50 border border-transparent'}
              `}
            >
              <link.icon size={20} className="shrink-0" />
              <span className="font-medium text-sm md:hidden lg:block">{link.name}</span>
            </NavLink>
          ))}

          {/* Activity Section */}
          <div className="mt-8 pt-8 border-t border-border md:hidden lg:block">
            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                Recent Context
              </span>
              <History size={12} className="text-text-muted transition-theme" />
            </div>
            <div className="space-y-1">
              <div className="px-3 py-2 text-[10px] text-text-muted italic">
                Active indexing session.
              </div>
            </div>
          </div>
        </nav>

        {/* User Profile / Interactive */}
        <div className="p-4 border-t border-border relative">
          <div
            onClick={() => setProfileOpen(!isProfileOpen)}
            className={`
              flex items-center gap-3 cursor-pointer p-2 rounded-xl transition-all
              md:justify-center lg:justify-start
              ${isProfileOpen ? 'bg-surface-elevated ring-1 ring-border shadow-lg' : 'hover:bg-surface/50'}
            `}
          >
            <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-[10px] font-bold text-accent">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="min-w-0 md:hidden lg:block">
              <p className="text-xs font-semibold text-text-primary truncate">{user?.email?.split('@')[0]}</p>
              <p className="text-[10px] text-text-muted truncate">Standard Access</p>
            </div>
          </div>

          {/* Dropdown Menu */}
          {isProfileOpen && <UserProfileDropdown />}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;


