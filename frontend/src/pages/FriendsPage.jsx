import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, MessageCircle } from 'lucide-react';
import Avatar from '../components/common/Avatar';
// ১. এখানে আপনার API গুলো ইম্পোর্ট করা হলো
import { friendsApi, conversationsApi } from '../api';
import toast from 'react-hot-toast';

export default function FriendsPage() {
  const [friends, setFriends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // ২. পেজ লোড হওয়ার সাথে সাথে ব্যাকএন্ড থেকে বন্ধুদের লিস্ট নিয়ে আসবে
  useEffect(() => {
    const loadFriends = async () => {
      try {
        const data = await friendsApi.list();
        // ডাটাবেজের রেসপন্স অনুযায়ী বন্ধুদের লিস্ট সেভ করা হলো
        setFriends(data.friends || data || []); 
      } catch (error) {
        toast.error('Could not load friends list');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    loadFriends();
  }, []);

  // ৩. চ্যাট বাটনে ক্লিক করলে সরাসরি চ্যাট পেজে নিয়ে যাবে
  const handleStartChat = async (friendId) => {
    try {
      const data = await conversationsApi.createDirect(friendId);
      const conversationId = data.conversation?.id || data.id;
      navigate(`/app/c/${conversationId}`);
    } catch (error) {
      toast.error('Could not start conversation');
      console.error(error);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-app-bg">
      <div className="h-16 shrink-0 flex items-center px-6 border-b border-app-border bg-app-panel">
        <Users className="text-ink-secondary mr-3" size={24} />
        <h1 className="text-xl font-semibold text-ink-primary">My Friends</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="text-center text-ink-secondary mt-10 flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mb-3"></div>
            Loading friends...
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center text-ink-secondary mt-10 bg-app-panel p-8 rounded-2xl border border-app-border">
            <Users className="mx-auto mb-3 text-ink-muted" size={32} />
            <p>No friends yet. Search for users to add them!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {friends.map((friend) => (
              <div key={friend.id} className="flex items-center justify-between p-4 bg-app-panel rounded-xl border border-app-border shadow-sm hover:border-accent transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar src={friend.avatarUrl} name={friend.username} size="md" />
                  <div>
                    <p className="font-medium text-ink-primary">{friend.username}</p>
                    <p className="text-xs text-ink-secondary">{friend.isOnline ? '🟢 Online' : '⚪ Offline'}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleStartChat(friend.id)}
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
