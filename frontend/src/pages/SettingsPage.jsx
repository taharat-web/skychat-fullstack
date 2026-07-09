import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Download, ShieldAlert, History, KeyRound } from 'lucide-react';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import Spinner from '../components/common/Spinner';
import { usersApi, backupApi } from '../api';

const ACTION_LABELS = {
  AUTH_SIGNUP: 'Account created',
  AUTH_EMAIL_VERIFIED: 'Email verified',
  AUTH_LOGIN: 'Logged in',
  AUTH_LOGOUT: 'Logged out',
  AUTH_PASSWORD_RESET_REQUESTED: 'Requested a password reset',
  AUTH_PASSWORD_RESET_COMPLETED: 'Password reset completed',
  AUTH_PASSWORD_CHANGED: 'Password changed',
  PROFILE_UPDATED: 'Profile updated',
  AVATAR_UPDATED: 'Profile photo updated',
  FRIEND_REQUEST_SENT: 'Sent a friend request',
  FRIEND_REQUEST_ACCEPTED: 'Accepted a friend request',
  FRIEND_REQUEST_REJECTED: 'Rejected a friend request',
  FRIEND_REQUEST_CANCELLED: 'Cancelled a friend request',
  FRIEND_REMOVED: 'Removed a friend',
  USER_BLOCKED: 'Blocked a user',
  USER_UNBLOCKED: 'Unblocked a user',
  GROUP_CREATED: 'Created a group',
  GROUP_UPDATED: 'Updated group info',
  GROUP_DELETED: 'Deleted a group',
  GROUP_MEMBER_ADDED: 'Added a group member',
  GROUP_MEMBER_REMOVED: 'Removed a group member',
  GROUP_MEMBER_LEFT: 'Left a group',
  GROUP_MEMBER_BANNED: 'Banned a group member',
  GROUP_MEMBER_UNBANNED: 'Unbanned a group member',
  GROUP_ROLE_CHANGED: "Changed a member's role",
  GROUP_OWNERSHIP_TRANSFERRED: 'Group ownership transferred',
  MESSAGE_DELETED_BY_MODERATOR: 'Deleted a message as a moderator',
  CHAT_EXPORTED: 'Exported chat history',
};

function SectionCard({ icon: Icon, title, children }) {
  return (
    <section className="bg-app-panel border border-app-border rounded-2xl p-5 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} className="text-accent-strong" />
        <h2 className="font-display font-semibold text-ink-primary">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [blockedUsers, setBlockedUsers] = useState([]);
  const [isLoadingBlocked, setIsLoadingBlocked] = useState(true);

  const [activityLog, setActivityLog] = useState([]);
  const [isLoadingLog, setIsLoadingLog] = useState(true);

  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    usersApi
      .listBlocked()
      .then(({ users }) => setBlockedUsers(users))
      .catch(() => toast.error('Could not load blocked users'))
      .finally(() => setIsLoadingBlocked(false));

    usersApi
      .getActivityLog()
      .then(({ entries }) => setActivityLog(entries))
      .catch(() => toast.error('Could not load activity log'))
      .finally(() => setIsLoadingLog(false));
  }, []);

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordError('');
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPasswordError('New password needs at least 8 characters, with a letter and a number');
      return;
    }
    setIsChangingPassword(true);
    try {
      await usersApi.changePassword(currentPassword, newPassword);
      toast.success('Password updated. Other sessions have been signed out.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPasswordError(err.response?.data?.error?.message || 'Could not update password');
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleUnblock(userId) {
    try {
      await usersApi.unblock(userId);
      setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch {
      toast.error('Could not unblock user');
    }
  }

  async function handleExportAll() {
    setIsExporting(true);
    try {
      await backupApi.exportAll();
      toast.success('Backup downloaded');
    } catch {
      toast.error('Could not export your chats');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto px-6 py-10 flex flex-col gap-6">
        <h1 className="font-display font-semibold text-2xl text-ink-primary">Settings</h1>

        <SectionCard icon={KeyRound} title="Change password">
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
            <Input
              label="Current password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              label="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            {passwordError && <p className="text-danger text-sm">{passwordError}</p>}
            <Button type="submit" isLoading={isChangingPassword} className="self-start">
              Update password
            </Button>
          </form>
        </SectionCard>

        <SectionCard icon={ShieldAlert} title="Blocked users">
          {isLoadingBlocked && <Spinner className="py-4" />}
          {!isLoadingBlocked && blockedUsers.length === 0 && (
            <p className="text-sm text-ink-secondary">You haven't blocked anyone.</p>
          )}
          <div className="flex flex-col gap-2">
            {blockedUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-3">
                <Avatar src={u.avatarUrl} name={u.username} size="sm" />
                <span className="flex-1 text-sm text-ink-primary">{u.username}</span>
                <Button variant="outline" size="sm" onClick={() => handleUnblock(u.id)}>
                  Unblock
                </Button>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard icon={Download} title="Chat backup">
          <p className="text-sm text-ink-secondary mb-4">
            Download a JSON export of every conversation you're part of, including message history.
          </p>
          <Button onClick={handleExportAll} isLoading={isExporting}>
            <Download size={16} className="mr-2" /> Export all chats
          </Button>
        </SectionCard>

        <SectionCard icon={History} title="Recent account activity">
          {isLoadingLog && <Spinner className="py-4" />}
          {!isLoadingLog && activityLog.length === 0 && (
            <p className="text-sm text-ink-secondary">No activity recorded yet.</p>
          )}
          <div className="flex flex-col gap-2.5 font-mono text-xs">
            {activityLog.map((entry) => (
              <div key={entry.id} className="flex justify-between gap-4 text-ink-secondary">
                <span className="text-ink-primary">{ACTION_LABELS[entry.action] || entry.action}</span>
                <span>{format(new Date(entry.createdAt), 'MMM d, HH:mm')}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
