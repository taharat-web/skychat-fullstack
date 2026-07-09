import { format, isToday, isThisYear } from 'date-fns';
import clsx from 'clsx';
import Avatar from '../common/Avatar';

function formatTimestamp(dateStr) {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, 'p');
  if (isThisYear(date)) return format(date, 'MMM d');
  return format(date, 'MM/dd/yy');
}

export default function ConversationListItem({ conversation, isActive, onClick }) {
  const isGroup = conversation.type === 'GROUP';
  const title = isGroup ? conversation.group?.name : conversation.peer?.username || 'Unknown user';
  const avatarSrc = isGroup ? conversation.group?.avatarUrl : conversation.peer?.avatarUrl;
  const lastMessage = conversation.lastMessage;

  const preview = lastMessage
    ? lastMessage.isDeleted
      ? 'This message was deleted'
      : lastMessage.content
    : 'No messages yet';

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
        isActive ? 'bg-app-elevated' : 'hover:bg-app-elevated/60'
      )}
    >
      <Avatar src={avatarSrc} name={title} isOnline={!isGroup ? conversation.peer?.isOnline : undefined} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium text-ink-primary truncate">{title}</p>
          {conversation.lastMessageAt && (
            <span
              className={clsx(
                'text-[11px] shrink-0 font-mono',
                conversation.unreadCount > 0 ? 'text-accent-strong' : 'text-ink-secondary'
              )}
            >
              {formatTimestamp(conversation.lastMessageAt)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-sm text-ink-secondary truncate">{preview}</p>
          {conversation.unreadCount > 0 && (
            <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-accent-strong text-app-bg text-[11px] font-semibold flex items-center justify-center">
              {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
