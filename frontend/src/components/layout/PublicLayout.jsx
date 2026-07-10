import { Link, NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import clsx from 'clsx';
import Logo from '../common/Logo';
import Button from '../common/Button';
import useAuthStore from '../../store/authStore';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

export default function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const status = useAuthStore((s) => s.status);
  const isAuthed = status === 'authenticated';
  const location = useLocation();

  if (isAuthed && location.pathname === '/') {
    const lastPage = localStorage.getItem('lastVisitedPage') || '/app';
    return <Navigate to={lastPage} replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-app-bg">
      <header className="border-b border-app-border sticky top-0 z-40 bg-app-bg/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo size={32} />
            <span className="font-display font-semibold text-lg tracking-tight">SkyChat</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  clsx(
                    'text-sm font-medium transition-colors',
                    isActive ? 'text-ink-primary' : 'text-ink-secondary hover:text-ink-primary'
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {isAuthed ? (
              <Link to="/app">
                <Button variant="primary">Open SkyChat</Button>
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-ink-secondary hover:text-ink-primary px-3 py-2">
                  Log in
                </Link>
                <Link to="/signup">
                  <Button variant="primary">Sign up free</Button>
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden text-ink-primary"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-app-border px-5 py-4 flex flex-col gap-4">
            {LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className="text-ink-secondary"
              >
                {link.label}
              </Link>
            ))}
            <div className="flex gap-3 pt-2">
              {isAuthed ? (
                <Link to="/app" className="flex-1">
                  <Button variant="primary" className="w-full">
                    Open SkyChat
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/login" className="flex-1">
                    <Button variant="outline" className="w-full">
                      Log in
                    </Button>
                  </Link>
                  <Link to="/signup" className="flex-1">
                    <Button variant="primary" className="w-full">
                      Sign up
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-app-border">
        <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col md:flex-row justify-between gap-6 text-sm">
          <div className="flex items-center gap-2 text-ink-secondary">
            <Logo size={20} />
            <span>© {new Date().getFullYear()} SkyChat. All rights reserved.</span>
          </div>
          <div className="flex gap-6 text-ink-secondary">
            <Link to="/privacy" className="hover:text-ink-primary">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-ink-primary">
              Terms of Service
            </Link>
            <Link to="/contact" className="hover:text-ink-primary">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
                }
