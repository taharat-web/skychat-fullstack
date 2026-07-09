import { useEffect, useState, useCallback } from 'react';
import { Check, X, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { friendsApi } from '../../api';
import Avatar from '../common/Avatar';
import Spinner from '../common/Spinner';

export default function FriendRequestsPanel() {
  const [tab, setTab] = useState('incoming');
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (type) => {
    setIsLoading(true);
    try {
      const { requests } = await friendsApi.listRequests(type);
      setRequests(requests);
    } catch {
      toast.error('Could not load friend requests');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  async function handleAccept(request) {
    try {
      await friendsApi.accept(request.id);
      toast.success(`You and ${request.sender.username} are now friends`);
      setRequests((prev) => prev.filter((r) => r.id !== request.id));
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Could not accept request');
    }
  }

  async function handleReject(request) {
    try {
      await friendsApi.reject(request.id);
      setRequests((prev) => prev.filter((r) => r.id !== request.id));
    } catch {
      toast.error('Could not reject request');
    }
  }

  async function handleCancel(request) {
    try {
      await friendsApi.cancel(request.id);
      setRequests((prev) => prev.filter((r) => r.id !== request.id));
    } catch {
      toast.error('Could not cancel request');
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1 p-2 border-b border-app-border">
        {['incoming', 'outgoing'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'flex-1 text-sm font-medium py-2 rounded-lg capitalize transition-colors',
              tab === t ? 'bg-accent/15 text-accent-strong' : 'text-ink-secondary hover:bg-app-hover'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2">
        {isLoading && <Spinner className="py-6" />}

        {!isLoading && requests.length === 0 && (
          <p className="text-center text-sm text-ink-secondary py-6">
            {tab === 'incoming' ? 'No incoming friend requests' : "You haven't sent any friend requests"}
          </p>
        )}

        {!isLoading &&
          requests.map((request) => {
            const person = tab === 'incoming' ? request.sender : request.receiver;
            return (
              <div key={request.id} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-app-elevated/60">
                <Avatar src={person.avatarUrl} name={person.username} size="sm" />
                <p className="flex-1 min-w-0 truncate text-sm text-ink-primary">{person.username}</p>
                {tab === 'incoming' ? (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleAccept(request)}
                      className="p-2 rounded-full text-accent-strong hover:bg-accent/10"
                      aria-label="Accept"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => handleReject(request)}
                      className="p-2 rounded-full text-danger hover:bg-danger/10"
                      aria-label="Reject"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleCancel(request)}
                    className="flex items-center gap-1 text-xs text-ink-secondary hover:text-danger shrink-0"
                  >
                    <Clock size={13} /> Cancel
                  </button>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
