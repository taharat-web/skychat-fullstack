import { Navigate, NavLink, Outlet } from 'react-router-dom';
import { MessageCircle, Bell, User, Settings, LogOut } from 'lucide-react';
import clsx from 'clsx';
import useAuthStore from '../../store/authStore';
import useNotificationStore from '../../store/notificationStore';
import useChatStore from '../../store/chatStore';
import Spinner from '../common/Spinner';
import Logo from '../common/Logo';

const NAV_ITEMS = [
  { to: '/app', icon: MessageCircle, label: 'Chats', end: true },
  { to: '/app/notifications', icon: Bell, label: 'Notifications' },
  { to: '/app/profile', icon: User, label: 'Profile' },
  { to: '/app/settings', icon: Settings, label: 'Settings' },
];

export default function ProtectedLayout() {
  const status = useAuthStore((s) => s.status);
  const logout = useAuthStore((s) => s.logout);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const resetChat = useChatStore((s) => s.reset);
  const resetNotifications = useNotificationStore((s) => s.reset);

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center bg-app-bg">
        <Spinner size={32} />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  async function handleLogout() {
    await logout();
    resetChat();
    resetNotifications();
  }

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row bg-app-bg overflow-hidden">
      {/* Desktop rail / mobile bottom bar */}
      <nav
        className={clsx(
          'flex md:flex-col items-center justify-between md:justify-start',
          'order-2 md:order-1 shrink-0',
          'bg-app-panel border-t md:border-t-0 md:border-r border-app-border',
          'px-4 py-2 md:px-0 md:py-4 md:w-[72px] md:gap-2'
        )}
      >
        <div className="hidden md:flex mb-4">
          <Logo size={36} />
        </div>

        <div className="flex md:flex-col gap-1 md:gap-2 flex-1 md:flex-none justify-around md:justify-start w-full md:w-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'relative flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-0',
                  'w-14 h-12 md:w-12 md:h-12 rounded-xl transition-colors',
                  isActive ? 'bg-accent/15 text-accent-strong' : 'text-ink-secondary hover:bg-app-hover hover:text-ink-primary'
                )
              }
              aria-label={label}
            >
              <Icon size={22} />
              {label === 'Notifications' && unreadCount > 0 && (
                <span className="absolute top-1 right-2.5 md:top-1.5 md:right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] font-semibold flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </div>

        <button
          onClick={handleLogout}
          aria-label="Log out"
          className="hidden md:flex w-12 h-12 rounded-xl items-center justify-center text-ink-secondary hover:bg-danger/10 hover:text-danger transition-colors mt-auto"
        >
          <LogOut size={20} />
        </button>
      </nav>

      <main className="flex-1 order-1 md:order-2 min-h-0 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
