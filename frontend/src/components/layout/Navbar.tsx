import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  ChevronDown,
  Database,
  Search,
  Bell,
  Sun,
  Moon,
  Command,
  Code2
} from 'lucide-react';
import { useConfigStore } from '../../store/configStore';
import { useNotificationStore } from '../../store/notificationStore';
import RepoSelector from './RepoSelector';
import NotificationCenter from './NotificationCenter';
import UserProfileDropdown from './UserProfileDropdown';

/**
 * CodeRAG Navbar
 */

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    isSearchOpen, 
    setSearchOpen,
    isNotificationsOpen,
    setNotificationsOpen,
    isProfileOpen,
    setProfileOpen,
    isRepoSelectorOpen,
    setRepoSelectorOpen,
    theme,
    toggleTheme,
    activeRepoId,
    repositories
  } = useConfigStore();

  const { notifications } = useNotificationStore();
  const unreadCount = notifications.filter(n => !n.read).length;

  const navRef = useRef<HTMLDivElement>(null);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/chat')) return 'Chat';
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/command-center') return 'Command Center';
    if (path === '/settings') return 'Settings';
    return 'CodeRAG';
  };

  // Close all dropdowns when clicking outside the navbar area
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setRepoSelectorOpen(false);
        setNotificationsOpen(false);
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setRepoSelectorOpen, setNotificationsOpen, setProfileOpen]);

  const activeRepo = repositories.find(r => r.id === activeRepoId) || repositories[0];

  const handleNotificationsToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNotificationsOpen(!isNotificationsOpen);
    setRepoSelectorOpen(false);
    setProfileOpen(false);
  };

  const handleRepoToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRepoSelectorOpen(!isRepoSelectorOpen);
    setNotificationsOpen(false);
    setProfileOpen(false);
  };

  return (
    <header className="h-16 border-b border-border bg-background/50 backdrop-blur-md px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 transition-theme" ref={navRef}>
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 text-text-secondary hover:text-text-primary md:hidden transition-colors"
        >
          <Menu size={20} />
        </button>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-text-primary tracking-tight hidden sm:block">
            {getPageTitle()}
          </h1>
          <div className="flex items-center gap-1.5 md:hidden">
            <Code2 className="text-accent" size={16} />
            <span className="text-xs font-bold text-text-primary">Code<span className="text-accent">RAG</span></span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-4 lg:gap-6">
        {/* Command Palette Trigger */}
        <button
          className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-surface-elevated border border-border rounded-xl text-text-muted hover:text-text-secondary hover:border-accent/30 transition-all text-xs group"
          onClick={() => {
            setSearchOpen(true);
            setRepoSelectorOpen(false);
            setNotificationsOpen(false);
            setProfileOpen(false);
          }}
        >
          <Search size={14} className="group-hover:text-accent transition-colors" />
          <span className="font-medium">Quick Find...</span>
          <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-background border border-border text-[9px] font-bold">
            <Command size={8} /> K
          </div>
        </button>

        {/* Repo Selector */}
        <div className="relative">
          <button
            onClick={handleRepoToggle}
            className={`
              flex items-center gap-2.5 px-3.5 py-2 rounded-xl border transition-all duration-300
              ${isRepoSelectorOpen
                ? 'bg-accent/10 border-accent/30 text-accent shadow-[0_0_15px_rgba(0,212,255,0.15)]'
                : 'bg-surface border-border text-text-secondary hover:border-accent/40 hover:text-text-primary hover:shadow-lg'}
            `}
          >
            <div className={`p-1.5 rounded-lg ${isRepoSelectorOpen ? 'bg-accent text-background' : 'bg-background text-accent'}`}>
              <Database size={14} strokeWidth={2.5} />
            </div>
            <div className="flex flex-col items-start leading-tight">
              <span className="text-[10px] uppercase tracking-tighter font-bold opacity-60">Active Context</span>
              <span className="text-xs font-bold truncate max-w-[120px]">
                {activeRepo?.name || 'Select Repository'}
              </span>
            </div>
            <ChevronDown size={14} className={`transition-transform duration-300 ${isRepoSelectorOpen ? 'rotate-180' : ''}`} />
          </button>

          {isRepoSelectorOpen && <RepoSelector />}
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-1 md:gap-2 border-l border-border pl-3 md:pl-4">
          <button
            onClick={toggleTheme}
            className="p-2 text-text-secondary hover:text-accent hover:bg-accent/10 rounded-xl transition-all group"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={18} className="group-hover:rotate-12 transition-transform" /> : <Moon size={18} className="group-hover:-rotate-12 transition-transform" />}
          </button>

          <div className="relative">
            <button
              onClick={handleNotificationsToggle}
              className={`
                relative p-2 rounded-xl transition-all group
                ${isNotificationsOpen ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:text-accent hover:bg-accent/10'}
              `}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-background animate-pulse" />
              )}
            </button>

            {isNotificationsOpen && <NotificationCenter />}
          </div>

          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setProfileOpen(!isProfileOpen); setNotificationsOpen(false); setRepoSelectorOpen(false); }}
              className={`flex items-center gap-2 p-1 rounded-full border transition-all ${isProfileOpen ? 'border-accent ring-4 ring-accent/10' : 'border-border hover:border-accent/40'}`}
            >
              <div className="w-8 h-8 rounded-full bg-accent text-background flex items-center justify-center text-xs font-black">
                D
              </div>
              <ChevronDown size={12} className={`text-text-muted transition-transform duration-300 ${isProfileOpen ? 'rotate-180' : ''}`} />
            </button>
            {isProfileOpen && <UserProfileDropdown />}
          </div>

          <button
            onClick={() => {
              setSearchOpen(true);
              setRepoSelectorOpen(false);
              setNotificationsOpen(false);
              setProfileOpen(false);
            }}
            className="p-2 text-text-secondary hover:text-accent hover:bg-accent/10 rounded-xl transition-all md:hidden"
          >
            <Search size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};


export default Navbar;
