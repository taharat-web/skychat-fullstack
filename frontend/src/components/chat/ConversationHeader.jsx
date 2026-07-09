import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Download } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Avatar from '../common/Avatar';

export default function ConversationHeader({ conversation, typingUsers = {}, onOpenInfo, onExport }) {
  const navigate = useNavigate();
  const isGroup = conversation.type === 'GROUP';
  const isTyping = Object.keys(typingUsers).length > 0;

  const title = isGroup ? conversation.group?.name : conversation.peer?.username;
  const avatarSrc = isGroup ? conversation.group?.avatarUrl : conversation.peer?.avatarUrl;

  let subtitle;
  if (isTyping) {
    subtitle = isGroup ? `${Object.values(typingUsers).join(', ')} typing…` : 'typing…';
  } else if (isGroup) {
    subtitle = `${conversation.members?.length || 0} members`;
  } else if (conversation.peer?.isOnline) {
    subtitle = 'Online';
  } else if (conversation.peer?.lastSeenAt) {
    subtitle = `Last seen ${formatDistanceToNow(new Date(conversation.peer.lastSeenAt), { addSuffix: true })}`;
  } else {
    subtitle = 'Offline';
  }

  return (
    <div className="h-16 shrink-0 flex items-center gap-3 px-3 md:px-4 border-b border-app-border bg-app-panel">
      <button
        onClick={() => navigate('/app')}
        className="md:hidden text-ink-secondary hover:text-ink-primary p-1 -ml-1"
        aria-label="Back to conversations"
      >
        <ArrowLeft size={20} />
      </button>

      <button onClick={onOpenInfo} className="flex items-center gap-3 min-w-0 flex-1 text-left">
        <Avatar src={avatarSrc} name={title || '?'} isOnline={!isGroup ? conversation.peer?.isOnline : undefined} />
        <div className="min-w-0">
          <p className="font-medium text-ink-primary truncate">{title}</p>
          <p className="text-xs text-ink-secondary truncate">{subtitle}</p>
        </div>
      </button>

      <button
        onClick={onExport}
        aria-label="Export conversation"
        className="p-2 rounded-full text-ink-secondary hover:text-ink-primary hover:bg-app-hover transition-colors"
        title="Export this conversation"
      >
        <Download size={18} />
      </button>
      {isGroup && (
        <button
          onClick={onOpenInfo}
          aria-label="Group info"
          className="p-2 rounded-full text-ink-secondary hover:text-ink-primary hover:bg-app-hover transition-colors"
        >
          <Info size={18} />
        </button>
      )}
    </div>
  );
}
