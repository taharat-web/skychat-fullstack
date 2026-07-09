import { useRef, useState, useEffect } from 'react';
import { SendHorizontal } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

const TYPING_STOP_DELAY_MS = 1500;

export default function MessageInput({ conversationId, onSend, disabled = false, disabledReason }) {
  const [value, setValue] = useState('');
  const { socket } = useSocket();
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    // Reset draft + typing state when switching conversations.
    setValue('');
    stopTyping();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  function startTyping() {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket?.emit('typing:start', { conversationId });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(stopTyping, TYPING_STOP_DELAY_MS);
  }

  function stopTyping() {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      socket?.emit('typing:stop', { conversationId });
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    stopTyping();
  }

  if (disabled) {
    return (
      <div className="px-4 py-3.5 border-t border-app-border text-center text-sm text-ink-secondary bg-app-panel">
        {disabledReason || 'You cannot send messages in this conversation'}
      </div>
    );
  }

  return (
    <div className="px-3 md:px-4 py-3 border-t border-app-border bg-app-panel flex items-end gap-2">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (e.target.value) startTyping();
          else stopTyping();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder="Type a message"
        rows={1}
        className="flex-1 resize-none bg-app-elevated rounded-2xl px-4 py-2.5 text-sm text-ink-primary placeholder:text-ink-muted outline-none max-h-[120px] scrollbar-thin"
      />
      <button
        onClick={handleSend}
        disabled={!value.trim()}
        aria-label="Send message"
        className="w-10 h-10 shrink-0 rounded-full bg-accent hover:bg-accent-deep disabled:opacity-40 disabled:hover:bg-accent flex items-center justify-center text-white transition-colors"
      >
        <SendHorizontal size={18} />
      </button>
    </div>
  );
}
