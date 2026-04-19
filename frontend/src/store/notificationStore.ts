import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type NotificationType = 'success' | 'info' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'high' | 'low'; // High priority = persist, Low = session only
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  getUnreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [
        {
          id: '1',
          type: 'success',
          title: 'System Ready',
          message: 'CodeRAG Engine sequence initialized successfully.',
          timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), // 2h ago
          read: false,
          priority: 'high'
        },
        {
          id: '2',
          type: 'info',
          title: 'New Feature',
          message: 'Command Palette (Cmd+K) is now available for quick navigation.',
          timestamp: new Date(Date.now() - 3600000 * 24).toISOString(), // 1d ago
          read: true,
          priority: 'low'
        }
      ],

      addNotification: (n) => {
        const id = Math.random().toString(36).substring(2, 11);
        const timestamp = new Date().toISOString();
        const newNotification: Notification = { ...n, id, timestamp, read: false };
        
        set((state) => ({
          notifications: [newNotification, ...state.notifications]
        }));
      },

      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) => 
            n.id === id ? { ...n, read: true } : n
          )
        }));
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true }))
        }));
      },

      clearAll: () => {
        set({ notifications: [] });
      },

      getUnreadCount: () => {
        return get().notifications.filter(n => !n.read).length;
      }
    }),
    {
      name: 'coderag-notifications',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Hybrid persistence: Only save 'high' priority notifications to localStorage
        notifications: state.notifications.filter(n => n.priority === 'high')
      }),
    }
  )
);
