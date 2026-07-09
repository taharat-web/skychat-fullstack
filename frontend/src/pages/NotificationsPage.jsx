import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { UserPlus, Users, Shield, AlertTriangle, MessageSquare, CheckCheck } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { notificationsApi } from '../api';
import useNotificationStore from '../store/notificationStore';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';

const NOTIFICATION_META = {
  FRIEND_REQUEST_RECEIVED: { icon: UserPlus, describe: (p) => `${p.fromUser?.username || 'Someone'} sent you a friend request` },
  FRIEND_REQUEST_ACCEPTED: { icon: UserPlus, describe: (p) => `${p.byUser?.username || 'Someone'} accepted your friend request` },
  GROUP_INVITE: { icon: Users, describe: (p) => `You were added to "${p.groupName || 'a group'}"` },
  GROUP_ROLE_CHANGED: { icon: Shield, describe: (p) => `Your role in "${p.groupName || 'a group'}" is now ${p.newRole}` },
  GROUP_KICKED: { icon: AlertTriangle, describe: (p) => `You were removed from "${p.groupName || 'a group'}"` },
  GROUP_BANNED: { icon: AlertTriangle, describe: (p) => `You were banned from "${p.groupName || 'a group'}"` },
  MODERATION_ACTION: { icon: Shield, describe: (p) => `A moderation action happened in "${p.groupName || 'a group'}"` },
  ACCOUNT_SECURITY: { icon: AlertTriangle, describe: (p) => p.message || 'A security event happened on your account' },
  NEW_MESSAGE: { icon: MessageSquare, describe: (p) => `New message: "${p.preview || ''}"` },
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const items = useNotificationStore((s) => s.items);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const setNotifications = useNotificationStore((s) => s.setNotifications);
  const appendNotifications = useNotificationStore((s) => s.appendNotifications);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllReadStore = useNotificationStore((s) => s.markAllRead);
  const [isLoading, setIsLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await notificationsApi.list();
      setNotifications(result);
      setNextCursor(result.nextCursor);
    } catch {
      toast.error('Could not load notifications');
    } finally {
      setIsLoading(false);
    }
  }, [setNotifications]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleLoadMore() {
    if (!nextCursor) return;
    setIsLoadingMore(true);
    try {
      const result = await notificationsApi.list();
      appendNotifications(result);
      setNextCursor(result.nextCursor);
    } finally {
      setIsLoadingMore(false);
    }
  }

  async function handleMarkAllRead() {
    try {
      await notificationsApi.markAllRead();
      markAllReadStore();
    } catch {
      toast.error('Could not mark all as read');
    }
  }

  async function handleClick(notification) {
    if (!notification.isRead) {
      markRead(notification.id);
      notificationsApi.markRead(notification.id).catch(() => {});
    }
    const conversationId = notification.payload?.conversationId;
    navigate(conversationId ? `/app/c/${conversationId}` : '/app');
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display font-semibold text-2xl text-ink-primary">Notifications</h1>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
              <CheckCheck size={15} className="mr-1.5" /> Mark all as read
            </Button>
          )}
        </div>

        {isLoading && <Spinner className="py-10" />}

        {!isLoading && items.length === 0 && (
          <p className="text-center text-sm text-ink-secondary py-10">You're all caught up.</p>
        )}

        <div className="flex flex-col gap-1">
          {items.map((notification) => {
            const meta = NOTIFICATION_META[notification.type] || {
              icon: MessageSquare,
              describe: () => 'Notification',
            };
            const Icon = meta.icon;
            return (
              <button
                key={notification.id}
                onClick={() => handleClick(notification)}
                className={clsx(
                  'flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-colors',
                  notification.isRead ? 'hover:bg-app-elevated/60' : 'bg-app-elevated hover:bg-app-hover'
                )}
              >
                <div
                  className={clsx(
                    'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                    notification.isRead ? 'bg-app-elevated text-ink-secondary' : 'bg-accent/15 text-accent-strong'
                  )}
                >
                  <Icon size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink-primary">{meta.describe(notification.payload || {})}</p>
                  <p className="text-xs text-ink-secondary mt-0.5">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </p>
                </div>
                {!notification.isRead && <span className="w-2 h-2 rounded-full bg-accent-strong mt-2 shrink-0" />}
              </button>
            );
          })}
        </div>

        {nextCursor && (
          <div className="flex justify-center mt-4">
            <Button variant="secondary" size="sm" onClick={handleLoadMore} isLoading={isLoadingMore}>
              Load more
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
