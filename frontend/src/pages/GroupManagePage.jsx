import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Camera, UserPlus, Trash2, History, Search } from 'lucide-react';
import { groupsApi, usersApi } from '../api';
import useAuthStore from '../store/authStore';
import useChatStore from '../store/chatStore';
import useDebounce from '../hooks/useDebounce';
import Avatar from '../components/common/Avatar';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import ConfirmDialog from '../components/common/ConfirmDialog';
import GroupMembersList from '../components/groups/GroupMembersList';

const ACTION_LABELS = {
  GROUP_CREATED: 'Group created',
  GROUP_UPDATED: 'Group info updated',
  GROUP_MEMBER_ADDED: 'Member added',
  GROUP_MEMBER_REMOVED: 'Member removed',
  GROUP_MEMBER_LEFT: 'Member left',
  GROUP_MEMBER_BANNED: 'Member banned',
  GROUP_MEMBER_UNBANNED: 'Member unbanned',
  GROUP_ROLE_CHANGED: "Member role changed",
  GROUP_OWNERSHIP_TRANSFERRED: 'Ownership transferred',
  MESSAGE_DELETED_BY_MODERATOR: 'Message removed by a moderator',
};

export default function GroupManagePage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const removeConversation = useChatStore((s) => s.removeConversation);
  const fileInputRef = useRef(null);

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  const [addQuery, setAddQuery] = useState('');
  const [addResults, setAddResults] = useState([]);
  const debouncedAddQuery = useDebounce(addQuery, 350);

  const [activityLog, setActivityLog] = useState([]);
  const [isLoadingLog, setIsLoadingLog] = useState(true);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function loadAll() {
    setIsLoading(true);
    try {
      const [{ conversation }, { members }] = await Promise.all([
        groupsApi.get(conversationId),
        groupsApi.listMembers(conversationId),
      ]);
      setGroup(conversation);
      setMembers(members);
      setName(conversation.group?.name || '');
      setDescription(conversation.group?.description || '');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Could not load this group');
      navigate('/app');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    groupsApi
      .getActivityLog(conversationId)
      .then(({ entries }) => setActivityLog(entries))
      .catch(() => {})
      .finally(() => setIsLoadingLog(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    if (debouncedAddQuery.trim().length < 2) {
      setAddResults([]);
      return;
    }
    let cancelled = false;
    usersApi.search(debouncedAddQuery.trim()).then(({ users }) => {
      if (!cancelled) {
        const memberIds = new Set(members.map((m) => m.id));
        setAddResults(users.filter((u) => !memberIds.has(u.id)));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedAddQuery, members]);

  const myRole = members.find((m) => m.id === user?.id)?.role;
  const isAdmin = myRole === 'ADMIN';
  const isModerator = myRole === 'MODERATOR';

  if (!isAdmin && !isModerator && !isLoading) {
    return (
      <div className="h-full flex items-center justify-center px-6 text-center">
        <p className="text-ink-secondary">Only group admins and moderators can manage this group.</p>
      </div>
    );
  }

  async function handleSaveInfo(e) {
    e.preventDefault();
    setIsSavingInfo(true);
    try {
      await groupsApi.update(conversationId, { name, description });
      toast.success('Group info updated');
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Could not update group');
    } finally {
      setIsSavingInfo(false);
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await groupsApi.uploadAvatar(conversationId, file);
      toast.success('Group photo updated');
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Could not upload photo');
    } finally {
      e.target.value = '';
    }
  }

  async function handleAddMember(targetUser) {
    try {
      await groupsApi.addMember(conversationId, targetUser.id);
      toast.success(`${targetUser.username} added to the group`);
      setAddQuery('');
      setAddResults([]);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Could not add member');
    }
  }

  async function handleChangeRole(userId, role) {
    try {
      await groupsApi.changeRole(conversationId, userId, role);
      toast.success('Role updated');
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Could not change role');
    }
  }

  async function handleRemove(userId) {
    try {
      await groupsApi.removeMember(conversationId, userId);
      toast.success('Member removed');
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Could not remove member');
    }
  }

  async function handleBan(userId) {
    try {
      await groupsApi.banMember(conversationId, userId);
      toast.success('Member banned');
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Could not ban member');
    }
  }

  async function handleDeleteGroup() {
    setIsDeleting(true);
    try {
      await groupsApi.delete(conversationId);
      removeConversation(conversationId);
      toast.success('Group deleted');
      navigate('/app');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Could not delete group');
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-6">
        <div>
          <button onClick={() => navigate(`/app/c/${conversationId}`)} className="text-sm text-accent-strong hover:underline mb-2">
            ← Back to conversation
          </button>
          <h1 className="font-display font-semibold text-2xl text-ink-primary">Manage "{group?.group?.name}"</h1>
        </div>

        {isAdmin && (
          <section className="bg-app-panel border border-app-border rounded-2xl p-5 md:p-6">
            <h2 className="font-display font-semibold text-ink-primary mb-4">Group info</h2>
            <div className="flex flex-col items-center mb-5">
              <div className="relative">
                <Avatar src={group?.group?.avatarUrl} name={group?.group?.name || 'Group'} size="xl" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-accent hover:bg-accent-deep flex items-center justify-center text-white"
                  aria-label="Change group photo"
                >
                  <Camera size={15} />
                </button>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleAvatarChange} />
              </div>
            </div>
            <form onSubmit={handleSaveInfo} className="flex flex-col gap-4">
              <Input label="Group name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
              <div>
                <label className="block text-sm text-ink-secondary mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  rows={2}
                  className="w-full bg-app-elevated border border-app-border focus:border-accent rounded-lg px-3.5 py-2.5 text-sm text-ink-primary outline-none resize-none"
                />
              </div>
              <Button type="submit" isLoading={isSavingInfo} className="self-start">
                Save changes
              </Button>
            </form>
          </section>
        )}

        <section className="bg-app-panel border border-app-border rounded-2xl p-5 md:p-6">
          <h2 className="font-display font-semibold text-ink-primary mb-4 flex items-center gap-2">
            <UserPlus size={18} className="text-accent-strong" /> Add members
          </h2>
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
            <input
              value={addQuery}
              onChange={(e) => setAddQuery(e.target.value)}
              placeholder="Search by username or email"
              className="w-full bg-app-elevated rounded-lg pl-9 pr-3 py-2.5 text-sm text-ink-primary placeholder:text-ink-muted outline-none"
            />
          </div>
          {addResults.length > 0 && (
            <div className="flex flex-col gap-1">
              {addResults.map((u) => (
                <div key={u.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-app-elevated/60">
                  <Avatar src={u.avatarUrl} name={u.username} size="sm" />
                  <span className="flex-1 text-sm text-ink-primary">{u.username}</span>
                  <Button size="sm" variant="outline" onClick={() => handleAddMember(u)}>
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-app-panel border border-app-border rounded-2xl p-5 md:p-6">
          <h2 className="font-display font-semibold text-ink-primary mb-4">Members ({members.length})</h2>
          <GroupMembersList
            members={members}
            currentUserId={user?.id}
            currentUserRole={myRole}
            onChangeRole={handleChangeRole}
            onRemove={handleRemove}
            onBan={handleBan}
          />
        </section>

        <section className="bg-app-panel border border-app-border rounded-2xl p-5 md:p-6">
          <h2 className="font-display font-semibold text-ink-primary mb-4 flex items-center gap-2">
            <History size={18} className="text-accent-strong" /> Group activity log
          </h2>
          {isLoadingLog && <Spinner className="py-4" />}
          {!isLoadingLog && activityLog.length === 0 && <p className="text-sm text-ink-secondary">No activity yet.</p>}
          <div className="flex flex-col gap-2.5 font-mono text-xs">
            {activityLog.map((entry) => (
              <div key={entry.id} className="flex justify-between gap-4 text-ink-secondary">
                <span className="text-ink-primary">
                  {entry.actor?.username || 'Someone'}: {ACTION_LABELS[entry.action] || entry.action}
                </span>
                <span>{format(new Date(entry.createdAt), 'MMM d, HH:mm')}</span>
              </div>
            ))}
          </div>
        </section>

        {isAdmin && (
          <section className="bg-app-panel border border-danger/40 rounded-2xl p-5 md:p-6">
            <h2 className="font-display font-semibold text-danger mb-2">Danger zone</h2>
            <p className="text-sm text-ink-secondary mb-4">
              Deleting the group removes it and its message history for every member. This cannot be undone.
            </p>
            <Button variant="danger" onClick={() => setIsDeleteOpen(true)}>
              <Trash2 size={16} className="mr-2" /> Delete group
            </Button>
          </section>
        )}
      </div>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteGroup}
        isLoading={isDeleting}
        title="Delete this group?"
        description="This permanently deletes the group and all of its messages for every member."
        confirmLabel="Delete group"
      />
    </div>
  );
}
