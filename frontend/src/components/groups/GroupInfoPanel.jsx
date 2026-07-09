import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Settings2, LogOut, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { groupsApi, conversationsApi, backupApi } from '../../api';
import Avatar from '../common/Avatar';
import Spinner from '../common/Spinner';
import Button from '../common/Button';
import ConfirmDialog from '../common/ConfirmDialog';
import useAuthStore from '../../store/authStore';
import useChatStore from '../../store/chatStore';

export default function GroupInfoPanel({ conversationId, onClose }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const removeConversation = useChatStore((s) => s.removeConversation);
  const [group, setGroup] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    groupsApi
      .get(conversationId)
      .then(({ conversation }) => setGroup(conversation))
      .catch(() => toast.error('Could not load group info'))
      .finally(() => setIsLoading(false));
  }, [conversationId]);

  const myRole = group?.members?.find((m) => m.id === user?.id)?.role;
  const canManage = myRole === 'ADMIN' || myRole === 'MODERATOR';

  async function handleLeave() {
    setIsLeaving(true);
    try {
      await conversationsApi.remove(conversationId);
      removeConversation(conversationId);
      toast.success('You left the group');
      navigate('/app');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Could not leave the group');
    } finally {
      setIsLeaving(false);
    }
  }

  return (
    <aside className="w-full md:w-[340px] shrink-0 h-full flex flex-col border-l border-app-border bg-app-panel">
      <div className="h-16 shrink-0 flex items-center justify-between px-4 border-b border-app-border">
        <p className="font-medium text-ink-primary">Group info</p>
        <button onClick={onClose} className="p-1.5 rounded-full text-ink-secondary hover:text-ink-primary hover:bg-app-hover">
          <X size={18} />
        </button>
      </div>

      {isLoading || !group ? (
        <Spinner className="py-12" />
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-thin p-5 flex flex-col items-center gap-4">
          <Avatar src={group.group?.avatarUrl} name={group.group?.name || 'Group'} size="xl" />
          <div className="text-center">
            <h3 className="font-display font-semibold text-lg text-ink-primary">{group.group?.name}</h3>
            {group.group?.description && <p className="text-sm text-ink-secondary mt-1">{group.group.description}</p>}
          </div>

          <div className="w-full">
            <p className="text-xs uppercase tracking-wide text-ink-secondary mb-2">
              {group.members?.length || 0} members
            </p>
            <div className="flex flex-col gap-1">
              {group.members?.slice(0, 6).map((m) => (
                <div key={m.id} className="flex items-center gap-2.5 py-1">
                  <Avatar src={m.avatarUrl} name={m.username} size="sm" />
                  <span className="text-sm text-ink-primary">{m.username}</span>
                  {m.role !== 'MEMBER' && (
                    <span className="text-[11px] text-ink-secondary ml-auto">{m.role === 'ADMIN' ? 'Admin' : 'Moderator'}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="w-full flex flex-col gap-2 pt-2">
            {canManage && (
              <Button variant="secondary" className="w-full" onClick={() => navigate(`/app/groups/${conversationId}/manage`)}>
                <Settings2 size={16} className="mr-2" /> Manage group
              </Button>
            )}
            <Button variant="secondary" className="w-full" onClick={() => backupApi.exportConversation(conversationId)}>
              <Download size={16} className="mr-2" /> Export chat
            </Button>
            <Button variant="danger" className="w-full" onClick={() => setIsLeaveOpen(true)}>
              <LogOut size={16} className="mr-2" /> Leave group
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={isLeaveOpen}
        onClose={() => setIsLeaveOpen(false)}
        onConfirm={handleLeave}
        isLoading={isLeaving}
        title="Leave this group?"
        description="You'll stop receiving messages from this group. If you're the admin, another member will automatically take over."
        confirmLabel="Leave group"
      />
    </aside>
  );
}
