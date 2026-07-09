import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Users, MessagesSquare, UserRoundPlus } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { conversationsApi } from '../../api';
import useChatStore from '../../store/chatStore';
import ConversationListItem from './ConversationListItem';
import UserSearch from '../friends/UserSearch';
import FriendRequestsPanel from '../friends/FriendRequestsPanel';
import CreateGroupModal from '../groups/CreateGroupModal';
import Avatar from '../common/Avatar';
import Spinner from '../common/Spinner';
import useAuthStore from '../../store/authStore';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'direct', label: 'Direct' },
  { key: 'group', label: 'Groups' },
];

export default function Sidebar({ activeConversationId }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const conversations = useChatStore((s) => s.conversations);
  const conversationOrder = useChatStore((s) => s.conversationOrder);
  const setConversations = useChatStore((s) => s.setConversations);

  const [tab, setTab] = useState('chats');
  const [filter, setFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const { conversations } = await conversationsApi.list('all');
      setConversations(conversations);
    } catch {
      toast.error('Could not load conversations');
    } finally {
      setIsLoading(false);
    }
  }, [setConversations]);

  useEffect(() => {
    loadConversations();
    const handler = () => loadConversations();
    window.addEventListener('skychat:conversations-changed', handler);
    return () => window.removeEventListener('skychat:conversations-changed', handler);
  }, [loadConversations]);

  const visibleIds = conversationOrder.filter((id) => {
    if (filter === 'all') return true;
    return conversations[id]?.type?.toLowerCase() === filter;
  });

  return (
    <aside className="w-full md:w-[380px] shrink-0 h-full flex flex-col border-r border-app-border bg-app-panel">
      <div className="h-16 shrink-0 flex items-center justify-between px-4 border-b border-app-border">
        <button onClick={() => navigate('/app/profile')} className="flex items-center gap-2.5">
          <Avatar src={user?.avatarUrl} name={user?.username || '?'} size="sm" />
          <span className="font-display font-semibold text-ink-primary hidden sm:inline">SkyChat</span>
        </button>
        <div className="flex gap-1">
          <button
            onClick={() => setIsGroupModalOpen(true)}
            className="p-2 rounded-full text-ink-secondary hover:text-ink-primary hover:bg-app-hover transition-colors"
            aria-label="Create group"
            title="Create group"
          >
            <Users size={19} />
          </button>
          <button
            onClick={() => setTab(tab === 'requests' ? 'chats' : 'requests')}
            className={clsx(
              'p-2 rounded-full transition-colors',
              tab === 'requests' ? 'text-accent-strong bg-accent/10' : 'text-ink-secondary hover:text-ink-primary hover:bg-app-hover'
            )}
            aria-label="Friend requests"
            title="Friend requests"
          >
            <UserRoundPlus size={19} />
          </button>
          <button
            onClick={() => setTab(tab === 'search' ? 'chats' : 'search')}
            className={clsx(
              'p-2 rounded-full transition-colors',
              tab === 'search' ? 'text-accent-strong bg-accent/10' : 'text-ink-secondary hover:text-ink-primary hover:bg-app-hover'
            )}
            aria-label="Add friend"
            title="Find people"
          >
            <UserPlus size={19} />
          </button>
        </div>
      </div>

      {tab === 'search' && <UserSearch />}
      {tab === 'requests' && <FriendRequestsPanel />}

      {tab === 'chats' && (
        <>
          <div className="flex gap-2 px-3 pt-3">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={clsx(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  filter === f.key ? 'bg-accent text-white' : 'bg-app-elevated text-ink-secondary hover:text-ink-primary'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin p-2 mt-1">
            {isLoading && <Spinner className="py-8" />}

            {!isLoading && visibleIds.length === 0 && (
              <div className="flex flex-col items-center text-center gap-2 py-12 px-6">
                <MessagesSquare size={32} className="text-ink-muted" />
                <p className="text-sm text-ink-secondary">
                  No conversations yet — search for a friend or create a group to start chatting.
                </p>
              </div>
            )}

            {!isLoading &&
              visibleIds.map((id) => (
                <ConversationListItem
                  key={id}
                  conversation={conversations[id]}
                  isActive={id === activeConversationId}
                  onClick={() => navigate(`/app/c/${id}`)}
                />
              ))}
          </div>
        </>
      )}

      <CreateGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        onCreated={(conversationId) => {
          setIsGroupModalOpen(false);
          loadConversations();
          navigate(`/app/c/${conversationId}`);
        }}
      />
    </aside>
  );
}
