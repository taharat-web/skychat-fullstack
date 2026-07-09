import { useEffect, useState } from 'react';
import { Search, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { usersApi, friendsApi } from '../../api';
import useDebounce from '../../hooks/useDebounce';
import Avatar from '../common/Avatar';
import Spinner from '../common/Spinner';

export default function UserSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sentTo, setSentTo] = useState(new Set());
  const debouncedQuery = useDebounce(query, 350);

  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    usersApi
      .search(debouncedQuery.trim())
      .then(({ users }) => {
        if (!cancelled) setResults(users);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  async function handleAddFriend(user) {
    try {
      await friendsApi.sendRequest(user.id);
      setSentTo((prev) => new Set(prev).add(user.id));
      toast.success(`Friend request sent to ${user.username}`);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Could not send friend request');
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username or email"
            className="w-full bg-app-elevated rounded-lg pl-9 pr-3 py-2.5 text-sm text-ink-primary placeholder:text-ink-muted outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-2">
        {isLoading && <Spinner className="py-6" />}

        {!isLoading && debouncedQuery.trim().length >= 2 && results.length === 0 && (
          <p className="text-center text-sm text-ink-secondary py-6">No users found for "{debouncedQuery}"</p>
        )}

        {!isLoading &&
          results.map((user) => (
            <div key={user.id} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-app-elevated/60">
              <Avatar src={user.avatarUrl} name={user.username} size="sm" />
              <p className="flex-1 min-w-0 truncate text-sm text-ink-primary">{user.username}</p>
              <button
                onClick={() => handleAddFriend(user)}
                disabled={sentTo.has(user.id)}
                className="p-2 rounded-full text-accent-strong hover:bg-accent/10 disabled:opacity-40 disabled:hover:bg-transparent"
                aria-label={`Add ${user.username} as friend`}
              >
                <UserPlus size={16} />
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
