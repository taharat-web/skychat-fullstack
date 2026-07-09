import { useParams } from 'react-router-dom';
import clsx from 'clsx';
import Sidebar from '../components/chat/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';
import Logo from '../components/common/Logo';

export default function ChatPage() {
  const { conversationId } = useParams();

  return (
    <div className="h-full flex">
      <div className={clsx('h-full', conversationId ? 'hidden md:block' : 'block w-full md:w-auto')}>
        <Sidebar activeConversationId={conversationId} />
      </div>

      <div className={clsx('flex-1 min-w-0 h-full', !conversationId && 'hidden md:flex')}>
        {conversationId ? (
          <ChatWindow key={conversationId} conversationId={conversationId} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6 bg-app-bg">
            <Logo size={56} />
            <div>
              <h2 className="font-display font-semibold text-xl text-ink-primary">Welcome to SkyChat</h2>
              <p className="text-ink-secondary text-sm mt-1 max-w-xs">
                Select a conversation from the list, or search for a friend to start a new one.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
