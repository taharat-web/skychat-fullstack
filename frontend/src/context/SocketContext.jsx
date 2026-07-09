import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import useChatStore from '../store/chatStore';
import useNotificationStore from '../store/notificationStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined;

const SocketContext = createContext({ socket: null, isConnected: false });

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const status = useAuthStore((s) => s.status);
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (status !== 'authenticated' || !accessToken) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    const chat = useChatStore.getState();
    const notifications = useNotificationStore.getState();

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('message:new', (message) => {
      chat.addMessage(message);
      const activeId = useChatStore.getState().activeConversationId;
      if (message.conversationId !== activeId) {
        toast(`${message.sender?.username || 'Someone'}: ${message.content}`.slice(0, 120));
      }
    });

    socket.on('message:updated', (message) => chat.updateMessage(message));
    socket.on('message:deleted', (payload) => chat.markMessageDeleted(payload));
    socket.on('message:status', (payload) => chat.applyMessageStatuses(payload));

    socket.on('typing:update', ({ conversationId, userId, username, isTyping }) => {
      chat.setTyping(conversationId, userId, username, isTyping);
    });

    socket.on('presence:update', ({ userId, isOnline, lastSeenAt }) => {
      chat.setPresence(userId, isOnline, lastSeenAt);
    });

    socket.on('notification:new', (notification) => {
      notifications.addNotification(notification);
      const label = describeNotification(notification);
      if (label) toast(label);
    });

    socket.on('conversation:new', () => {
      // A new DM or group invite arrived - the conversation list page will
      // refetch on focus/mount; a light nudge here keeps multi-tab usage sane.
      window.dispatchEvent(new CustomEvent('skychat:conversations-changed'));
    });

    socket.on('group:updated', (payload) => {
      chat.upsertConversation({
        id: payload.conversationId,
        group: { name: payload.name, description: payload.description, avatarUrl: payload.avatarUrl },
      });
    });

    socket.on('group:deleted', ({ conversationId }) => {
      chat.removeConversation(conversationId);
    });

    socket.on('group:member_removed', ({ conversationId, userId }) => {
      if (userId === useAuthStore.getState().user?.id) {
        chat.removeConversation(conversationId);
      }
    });

    socket.on('group:banned', ({ conversationId }) => {
      chat.removeConversation(conversationId);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, status]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected }}>{children}</SocketContext.Provider>
  );
}

function describeNotification(notification) {
  switch (notification.type) {
    case 'FRIEND_REQUEST_RECEIVED':
      return `${notification.payload?.fromUser?.username || 'Someone'} sent you a friend request`;
    case 'FRIEND_REQUEST_ACCEPTED':
      return `${notification.payload?.byUser?.username || 'Someone'} accepted your friend request`;
    case 'GROUP_INVITE':
      return `You were added to "${notification.payload?.groupName || 'a group'}"`;
    case 'GROUP_ROLE_CHANGED':
      return `Your role in "${notification.payload?.groupName || 'a group'}" changed to ${notification.payload?.newRole}`;
    case 'GROUP_BANNED':
      return `You were removed from "${notification.payload?.groupName || 'a group'}"`;
    case 'MODERATION_ACTION':
      return `A moderation action happened in "${notification.payload?.groupName || 'a group'}"`;
    default:
      return null;
  }
}
