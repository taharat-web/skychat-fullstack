import { useEffect, useRef, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { MessageCircleMore } from 'lucide-react';
import { conversationsApi, messagesApi, backupApi } from '../../api';
import useChatStore from '../../store/chatStore';
import useAuthStore from '../../store/authStore';
import { useSocket } from '../../context/SocketContext';
import ConversationHeader from './ConversationHeader';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import GroupInfoPanel from '../groups/GroupInfoPanel';
import ContactInfoPanel from './ContactInfoPanel';
import ConfirmDialog from '../common/ConfirmDialog';
import Spinner from '../common/Spinner';

export default function ChatWindow({ conversationId }) {
  const { socket } = useSocket();
  const currentUser = useAuthStore((s) => s.user);

  const conversation = useChatStore((s) => s.conversations[conversationId]);
  const messages = useChatStore((s) => s.messagesByConversation[conversationId] || []);
  const nextCursor = useChatStore((s) => s.messageCursors[conversationId]);
  const typingUsers = useChatStore((s) => s.typingByConversation[conversationId] || {});
  const setMessages = useChatStore((s) => s.setMessages);
  const addMessage = useChatStore((s) => s.addMessage);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const markMessageDeleted = useChatStore((s) => s.markMessageDeleted);
  const upsertConversation = useChatStore((s) => s.upsertConversation);
  const setActiveConversationId = useChatStore((s) => s.setActiveConversationId);

  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const hasLoadedInitially = useRef(false);

  // Mark conversation active + join its socket room.
  useEffect(() => {
    setActiveConversationId(conversationId);
    socket?.emit('conversation:join', { conversationId });
    return () => setActiveConversationId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, socket]);

  // Fallback fetch if this conversation isn't in the store yet (e.g. deep link).
  useEffect(() => {
    if (conversation) return;
    conversationsApi
      .get(conversationId)
      .then(({ conversation: detail }) => upsertConversation({ id: conversationId, ...detail }))
      .catch(() => toast.error('Could not load this conversation'));
  }, [conversationId, conversation, upsertConversation]);

  // Load message history.
  useEffect(() => {
    hasLoadedInitially.current = false;
    setIsLoadingMessages(true);
    conversationsApi
      .getMessages(conversationId)
      .then((result) => {
        setMessages(conversationId, result);
      })
      .catch(() => toast.error('Could not load messages'))
      .finally(() => setIsLoadingMessages(false));
  }, [conversationId, setMessages]);

  // Scroll to bottom on initial load and when a new message arrives while
  // already near the bottom.
  useEffect(() => {
    if (!hasLoadedInitially.current && messages.length >= 0 && !isLoadingMessages) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
      hasLoadedInitially.current = true;
    }
  }, [isLoadingMessages, messages.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 200) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  // Mark read whenever we're actively viewing and messages update.
  useEffect(() => {
    if (isLoadingMessages) return;
    conversationsApi.markRead(conversationId).catch(() => {});
  }, [conversationId, isLoadingMessages, messages.length]);

  const handleLoadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight || 0;
    try {
      const result = await conversationsApi.getMessages(conversationId, nextCursor);
      setMessages(conversationId, result, { prepend: true });
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevHeight;
      });
    } catch {
      toast.error('Could not load older messages');
    } finally {
      setIsLoadingMore(false);
    }
  }, [conversationId, nextCursor, isLoadingMore, setMessages]);

  function handleScroll(e) {
    if (e.target.scrollTop < 80) handleLoadMore();
  }

  function handleSend(content) {
    if (socket?.connected) {
      socket.emit('message:send', { conversationId, content }, (res) => {
        if (!res?.ok) {
          toast.error(res?.error || 'Message failed to send');
        } else if (res.message) {
          addMessage(res.message);
        }
      });
    } else {
      conversationsApi
        .sendMessage(conversationId, content)
        .then(({ message }) => addMessage(message))
        .catch(() => toast.error('Message failed to send'));
    }
  }

  function handleEdit(messageId, content) {
    if (socket?.connected) {
      socket.emit('message:edit', { messageId, content }, (res) => {
        if (!res?.ok) toast.error(res?.error || 'Could not edit message');
        else if (res.message) updateMessage(res.message);
      });
    } else {
      messagesApi
        .edit(messageId, content)
        .then(({ message }) => updateMessage(message))
        .catch(() => toast.error('Could not edit message'));
    }
  }

  function requestDelete(message) {
    setPendingDelete(message);
  }

  async function confirmDelete() {
    const message = pendingDelete;
    setPendingDelete(null);
    if (socket?.connected) {
      socket.emit('message:delete', { messageId: message.id }, (res) => {
        if (!res?.ok) toast.error(res?.error || 'Could not delete message');
        else markMessageDeleted({ conversationId: message.conversationId, messageId: message.id });
      });
    } else {
      try {
        await messagesApi.delete(message.id);
        markMessageDeleted({ conversationId: message.conversationId, messageId: message.id });
      } catch {
        toast.error('Could not delete message');
      }
    }
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size={28} />
      </div>
    );
  }

  const isGroup = conversation.type === 'GROUP';
  const canModerate = conversation.myRole === 'ADMIN' || conversation.myRole === 'MODERATOR';
  const isBanned = false; // banned participants are removed from the conversation list entirely

  return (
    <div className="flex-1 flex min-w-0 h-full">
      <div className="flex-1 flex flex-col min-w-0">
        <ConversationHeader
          conversation={conversation}
          typingUsers={typingUsers}
          onOpenInfo={() => setIsInfoOpen((v) => !v)}
          onExport={() => backupApi.exportConversation(conversationId)}
        />

        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto scrollbar-thin px-3 md:px-6 py-4">
          {isLoadingMessages && <Spinner className="py-10" />}
          {isLoadingMore && <Spinner size={18} className="py-2" />}

          {!isLoadingMessages && messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-ink-secondary">
              <MessageCircleMore size={32} className="text-ink-muted" />
              <p className="text-sm">No messages yet. Say hello 👋</p>
            </div>
          )}

          {messages.map((message, i) => {
            const prev = messages[i - 1];
            const showSender = isGroup && (!prev || prev.senderId !== message.senderId);
            return (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.senderId === currentUser?.id}
                showSender={showSender}
                canModerate={canModerate && message.senderId !== currentUser?.id}
                onEdit={handleEdit}
                onRequestDelete={requestDelete}
              />
            );
          })}
          <div ref={bottomRef} />
        </div>

        <TypingIndicator typingUsers={typingUsers} isGroup={isGroup} />
        <MessageInput
          conversationId={conversationId}
          onSend={handleSend}
          disabled={isBanned}
          disabledReason="You have been banned from this conversation"
        />
      </div>

      {isInfoOpen && isGroup && <GroupInfoPanel conversationId={conversationId} onClose={() => setIsInfoOpen(false)} />}
      {isInfoOpen && !isGroup && (
        <ContactInfoPanel conversationId={conversationId} peer={conversation.peer} onClose={() => setIsInfoOpen(false)} />
      )}

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title="Delete this message?"
        description="This can't be undone. Other participants will see that the message was deleted."
        confirmLabel="Delete"
      />
    </div>
  );
}
