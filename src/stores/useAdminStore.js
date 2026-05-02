import { create } from 'zustand';
import { getAdminNotifications, markAdminNotifRead, markAllAdminNotifsRead } from '../firebase/notifications';

const useAdminStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  searchQuery: '',
  notificationsLoaded: false,

  // Load notifications from Firestore + localStorage
  loadNotifications: async () => {
    try {
      const notifs = await getAdminNotifications();
      const unread = notifs.filter((n) => !n.read).length;
      set({ notifications: notifs, unreadCount: unread, notificationsLoaded: true });
    } catch (e) {
      console.warn('Failed to load admin notifications:', e);
    }
  },

  // Add a notification locally (for instant UI update)
  addNotification: (notification) =>
    set((state) => {
      const updated = [notification, ...state.notifications];
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    }),

  dismissNotification: async (id) => {
    await markAdminNotifRead(id);
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    });
  },

  markAllRead: async () => {
    await markAllAdminNotifsRead();
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  setSearch: (query) => set(() => ({ searchQuery: query })),
}));

export default useAdminStore;
