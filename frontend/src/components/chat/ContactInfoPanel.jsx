import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Download, UserMinus, Ban, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { usersApi, friendsApi, conversationsApi, backupApi } from '../../api';
import Avatar from '../common/Avatar';
import Button from '../common/Button';
import ConfirmDialog from '../common/ConfirmDialog';
import useChatStore from '../../store/chatStore';

export default function ContactInfoPanel({ conversationId, peer, onClose }) {
  const navigate = useNavigate();
  const removeConversation = useChatStore((s) => s.removeConversation);
  const [confirmAction, setConfirmAction] = useState(null); // 'remove' | 'block'
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRemoveFriend() {
    setIsSubmitting(true);
    try {
      await friendsApi.remove(peer.id);
      await conversationsApi.remove(conversationId);
      removeConversation(conversationId);
      toast.success(`Removed ${peer.username} from your friends`);
      navigate('/app');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Could not remove friend');
    } finally {
      setIsSubmitting(false);
      setConfirmAction(null);
    }
  }

  async function handleBlock() {
    setIsSubmitting(true);
    try {
      await usersApi.block(peer.id);
      removeConversation(conversationId);
      toast.success(`Blocked ${peer.username}`);
      navigate('/app');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Could not block user');
    } finally {
      setIsSubmitting(false);
      setConfirmAction(null);
    }
  }

  return (
    <aside className="w-full md:w-[340px] shrink-0 h-full flex flex-col border-l border-app-border bg-app-panel">
      <div className="h-16 shrink-0 flex items-center justify-between px-4 border-b border-app-border">
        <p className="font-medium text-ink-primary">Contact info</p>
        <button onClick={onClose} className="p-1.5 rounded-full text-ink-secondary hover:text-ink-primary hover:bg-app-hover">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-5 flex flex-col items-center gap-4">
        <Avatar src={peer?.avatarUrl} name={peer?.username || '?'} size="xl" isOnline={peer?.isOnline} />
        <div className="text-center">
          <h3 className="font-display font-semibold text-lg text-ink-primary">{peer?.username}</h3>
          <p className="text-sm text-ink-secondary mt-1">
            {peer?.isOnline
              ? 'Online'
              : peer?.lastSeenAt
                ? `Last seen ${formatDistanceToNow(new Date(peer.lastSeenAt), { addSuffix: true })}`
                : 'Offline'}
          </p>
          {peer?.bio && <p className="text-sm text-ink-secondary mt-3">{peer.bio}</p>}
        </div>

        <div className="w-full flex flex-col gap-2 pt-2">
          <Button variant="secondary" className="w-full" onClick={() => backupApi.exportConversation(conversationId)}>
            <Download size={16} className="mr-2" /> Export chat
          </Button>
          <Button variant="secondary" className="w-full" onClick={() => setConfirmAction('remove')}>
            <UserMinus size={16} className="mr-2" /> Remove friend
          </Button>
          <Button variant="danger" className="w-full" onClick={() => setConfirmAction('block')}>
            <Ban size={16} className="mr-2" /> Block {peer?.username}
          </Button>
        </div>

        <p className="flex items-center gap-1.5 text-xs text-ink-muted pt-2">
          <ShieldCheck size={13} /> Only you and {peer?.username} are in this conversation
        </p>
      </div>

      <ConfirmDialog
        isOpen={confirmAction === 'remove'}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleRemoveFriend}
        isLoading={isSubmitting}
        title="Remove friend?"
        description={`You'll need to send a new friend request to message ${peer?.username} again.`}
        confirmLabel="Remove"
      />
      <ConfirmDialog
        isOpen={confirmAction === 'block'}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleBlock}
        isLoading={isSubmitting}
        title={`Block ${peer?.username}?`}
        description="They won't be able to message you or send friend requests. You can unblock them later from Settings."
        confirmLabel="Block"
      />
    </aside>
  );
}
