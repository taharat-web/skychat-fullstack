import { Users, MessageCircle } from 'lucide-react';
import Avatar from '../components/common/Avatar';

export default function FriendsPage() {
  // এটি আপাতত একটি ডামি (dummy) লিস্ট ডিজাইন দেখার জন্য।
  const dummyFriends = [
    { id: 1, username: 'test_friend', avatarUrl: null, isOnline: true }
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-app-bg">
      <div className="h-16 shrink-0 flex items-center px-6 border-b border-app-border bg-app-panel">
        <Users className="text-ink-secondary mr-3" size={24} />
        <h1 className="text-xl font-semibold text-ink-primary">My Friends</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {dummyFriends.length === 0 ? (
          <div className="text-center text-ink-secondary mt-10">
            No friends yet. Search for users to add them!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dummyFriends.map((friend) => (
              <div key={friend.id} className="flex items-center justify-between p-4 bg-app-panel rounded-xl border border-app-border shadow-sm">
                <div className="flex items-center gap-3">
                  <Avatar src={friend.avatarUrl} name={friend.username} size="md" />
                  <div>
                    <p className="font-medium text-ink-primary">{friend.username}</p>
                    <p className="text-xs text-ink-secondary">{friend.isOnline ? 'Online' : 'Offline'}</p>
                  </div>
                </div>
                <button
                  className="p-2 bg-accent/10 text-accent-strong rounded-full hover:bg-accent hover:text-white transition-colors"
                  title="Start Chat"
                >
                  <MessageCircle size={20} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
            }
