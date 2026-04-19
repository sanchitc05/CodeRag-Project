import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * CodeRAG Configuration Store
 * Manages global UI settings, theme, and persistent choices.
 */

export type Theme = 'dark' | 'light';

export interface Repository {
  id: string;
  name: string;
  url: string;
  status?: string;
  lastIndexed?: string;
}

export interface UserProfile {
  fullName: string;
  username: string;
  email: string;
  avatar?: string;
}

interface ConfigState {
  // Appearance
  theme: Theme;
  
  // Data Context
  activeRepoId: string | null;
  repositories: Repository[];

  // UI State
  isSearchOpen: boolean;
  isNotificationsOpen: boolean;
  isProfileOpen: boolean;
  isRepoSelectorOpen: boolean;
  settingsTab: string;
  
  // User Profile State
  userProfile: UserProfile;
  
  // Actions
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setActiveRepo: (id: string) => void;
  addRepository: (repo: Repository) => void;
  setSearchOpen: (isOpen: boolean) => void;
  setNotificationsOpen: (isOpen: boolean) => void;
  setProfileOpen: (isOpen: boolean) => void;
  setRepoSelectorOpen: (isOpen: boolean) => void;
  setSettingsTab: (tab: string) => void;
  updateProfile: (profile: Partial<UserProfile>) => void;
}

const DEFAULT_REPOS: Repository[] = [
  { id: '1',    name: 'CodeRAG-Project',
    url: 'https://github.com/snehas-05/CodeRag-Project',
    status: 'Ready',
    lastIndexed: '2h ago'
  },
  {
    id: '2',
    name: 'frontend-toolkit',
    url: 'https://github.com/internal/frontend-toolkit',
    status: 'Ready',
    lastIndexed: '1d ago'
  },
  {
    id: '3',
    name: 'api-service',
    url: 'https://github.com/internal/api-service',
    status: 'Error',
    lastIndexed: '5h ago'
  }
];

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      // Appearance Defaults
      theme: 'dark',
      
      // Data Context Defaults
      activeRepoId: '1',
      repositories: DEFAULT_REPOS,

      // UI State Defaults
      isSearchOpen: false,
      isNotificationsOpen: false,
      isProfileOpen: false,
      isRepoSelectorOpen: false,
      settingsTab: 'profile',

      userProfile: {
        fullName: 'Dev User',
        username: 'devmode',
        email: 'dev@coderag.io'
      },

      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      
      setActiveRepo: (activeRepoId) => set({ activeRepoId, isRepoSelectorOpen: false }),
      
      addRepository: (repo) => set((state) => ({ 
        repositories: [...state.repositories, repo] 
      })),

      setSearchOpen: (isSearchOpen) => set({ isSearchOpen }),
      setNotificationsOpen: (isNotificationsOpen) => set({ isNotificationsOpen }),
      setProfileOpen: (isProfileOpen) => set({ isProfileOpen }),
      setRepoSelectorOpen: (isRepoSelectorOpen) => set({ isRepoSelectorOpen }),
      setSettingsTab: (settingsTab) => set({ settingsTab }),
      
      updateProfile: (profile) => set((state) => ({
        userProfile: { ...state.userProfile, ...profile }
      }))
    }),
    {
      name: 'coderag-config',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        activeRepoId: state.activeRepoId,
        settingsTab: state.settingsTab,
        repositories: state.repositories, // Persist repo list (including any added ones)
      }),
    }
  )
);
