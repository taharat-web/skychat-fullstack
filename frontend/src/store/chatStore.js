import { create } from 'zustand';

function sortConversationIds(conversations) {
  return Object.values(conversations)
    .sort((a, b) => new Date(b.lastMessageAt || b.updatedAt) - new Date(a.lastMessageAt || a.updatedAt))
    .map((c) => c.id);
}

const useChatStore = create((set, get) => ({
  conversations: {},
  conversationOrder: [],
  messagesByConversation: {},
  messageCursors: {},
  activeConversationId: null,
  typingByConversation: {}, // conversationId -> { [userId]: username }
  presenceByUser: {}, // userId -> { isOnline, lastSeenAt }

  setConversations(list) {
    const conversations = {};
    list.forEach((c) => {
      conversations[c.id] = c;
    });
    set({ conversations, conversationOrder: sortConversationIds(conversations) });
  },

  upsertConversation(partial) {
    set((state) => {
      const existing = state.conversations[partial.id] || {};
      const conversations = { ...state.conversations, [partial.id]: { ...existing, ...partial } };
      return { conversations, conversationOrder: sortConversationIds(conversations) };
    });
  },

  removeConversation(id) {
    set((state) => {
      const conversations = { ...state.conversations };
      delete conversations[id];
      return { conversations, conversationOrder: sortConversationIds(conversations) };
    });
  },

  setActiveConversationId(id) {
    set({ activeConversationId: id });
    if (id) get().resetUnread(id);
  },

  setMessages(conversationId, { messages, nextCursor }, { prepend = false } = {}) {
    set((state) => {
      const existing = state.messagesByConversation[conversationId] || [];
      const merged = prepend ? [...messages, ...existing] : messages;
      return {
        messagesByConversation: { ...state.messagesByConversation, [conversationId]: merged },
        messageCursors: { ...state.messageCursors, [conversationId]: nextCursor },
      };
    });
  },

  addMessage(message) {
    const { conversationId } = message;
    set((state) => {
      const existing = state.messagesByConversation[conversationId] || [];
      if (existing.some((m) => m.id === message.id)) return {};

      const isActive = state.activeConversationId === conversationId;
      const conversation = state.conversations[conversationId];
      const updatedConversation = conversation
        ? {
            ...conversation,
            lastMessage: message,
            lastMessageAt: message.createdAt,
            unreadCount: isActive ? 0 : (conversation.unreadCount || 0) + 1,
          }
        : conversation;

      const conversations = updatedConversation
        ? { ...state.conversations, [conversationId]: updatedConversation }
        : state.conversations;

      return {
        messagesByConversation: { ...state.messagesByConversation, [conversationId]: [...existing, message] },
        conversations,
        conversationOrder: sortConversationIds(conversations),
      };
    });
  },

  updateMessage(message) {
    set((state) => {
      const existing = state.messagesByConversation[message.conversationId] || [];
      const updated = existing.map((m) => (m.id === message.id ? message : m));
      const conversation = state.conversations[message.conversationId];
      const isLastMessage = conversation?.lastMessage?.id === message.id;
      const conversations = isLastMessage
        ? { ...state.conversations, [message.conversationId]: { ...conversation, lastMessage: message } }
        : state.conversations;

      return {
        messagesByConversation: { ...state.messagesByConversation, [message.conversationId]: updated },
        conversations,
      };
    });
  },

  markMessageDeleted({ conversationId, messageId }) {
    set((state) => {
      const existing = state.messagesByConversation[conversationId] || [];
      const updated = existing.map((m) =>
        m.id === messageId ? { ...m, isDeleted: true, content: 'This message was deleted' } : m
      );
      return { messagesByConversation: { ...state.messagesByConversation, [conversationId]: updated } };
    });
  },

  applyMessageStatuses({ conversationId, messageIds, userId, status }) {
    set((state) => {
      const existing = state.messagesByConversation[conversationId] || [];
      const idSet = new Set(messageIds);
      const updated = existing.map((m) => {
        if (!idSet.has(m.id)) return m;
        const statuses = (m.statuses || []).filter((s) => s.userId !== userId);
        statuses.push({ userId, status });
        return { ...m, statuses };
      });
      return { messagesByConversation: { ...state.messagesByConversation, [conversationId]: updated } };
    });
  },

  setTyping(conversationId, userId, username, isTyping) {
    set((state) => {
      const current = { ...(state.typingByConversation[conversationId] || {}) };
      if (isTyping) current[userId] = username;
      else delete current[userId];
      return { typingByConversation: { ...state.typingByConversation, [conversationId]: current } };
    });
  },

  setPresence(userId, isOnline, lastSeenAt) {
    set((state) => ({
      presenceByUser: { ...state.presenceByUser, [userId]: { isOnline, lastSeenAt } },
    }));

    // Also reflect it on any direct conversation showing this user as the peer.
    set((state) => {
      const conversations = { ...state.conversations };
      let changed = false;
      for (const id of Object.keys(conversations)) {
        const c = conversations[id];
        if (c.type === 'DIRECT' && c.peer?.id === userId) {
          conversations[id] = { ...c, peer: { ...c.peer, isOnline, lastSeenAt: lastSeenAt || c.peer.lastSeenAt } };
          changed = true;
        }
      }
      return changed ? { conversations } : {};
    });
  },

  resetUnread(conversationId) {
    set((state) => {
      const conversation = state.conversations[conversationId];
      if (!conversation || !conversation.unreadCount) return {};
      return {
        conversations: { ...state.conversations, [conversationId]: { ...conversation, unreadCount: 0 } },
      };
    });
  },

  reset() {
    set({
      conversations: {},
      conversationOrder: [],
      messagesByConversation: {},
      messageCursors: {},
      activeConversationId: null,
      typingByConversation: {},
      presenceByUser: {},
    });
  },
}));

export default useChatStore;
