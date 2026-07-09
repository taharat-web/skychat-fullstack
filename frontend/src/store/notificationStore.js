import { create } from 'zustand';

const useNotificationStore = create((set) => ({
  items: [],
  unreadCount: 0,
  nextCursor: null,

  setNotifications({ items, unreadCount, nextCursor }) {
    set({ items, unreadCount, nextCursor });
  },

  appendNotifications({ items, nextCursor }) {
    set((state) => ({ items: [...state.items, ...items], nextCursor }));
  },

  addNotification(notification) {
    set((state) => ({
      items: [notification, ...state.items],
      unreadCount: state.unreadCount + 1,
    }));
  },

  markRead(id) {
    set((state) => ({
      items: state.items.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      unreadCount: Math.max(0, state.unreadCount - (state.items.find((n) => n.id === id)?.isRead ? 0 : 1)),
    }));
  },

  markAllRead() {
    set((state) => ({ items: state.items.map((n) => ({ ...n, isRead: true })), unreadCount: 0 }));
  },

  reset() {
    set({ items: [], unreadCount: 0, nextCursor: null });
  },
}));

export default useNotificationStore;
