import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '../types';

/**
 * CodeRAG AuthStore
 * 
 * Bridges the existing backend identity (user_id, email, access_token)
 * with the modern Stitch state management pattern.
 */

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  
  // Actions
  login: (user: User) => void;
  logout: () => void;
  
  // Modern Stitch-style helpers (bridged to current schema)
  setAuth: (user: User) => void;
  clearAuth: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      accessToken: null,

      // Classic actions (preserved for existing code)
      login: (user) => set({ user, accessToken: user.access_token, isAuthenticated: true }),
      logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),

      // Modern actions (adopted from Stitch logic)
      setAuth: (user) => set({ user, accessToken: user.access_token, isAuthenticated: true }),
      clearAuth: () => set({ user: null, accessToken: null, isAuthenticated: false }),
      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      })),
    }),
    {
      name: 'coderag-auth-v2', // New storage key for the premium upgrade
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
