import { Link } from 'react-router-dom';
import Logo from '../components/common/Logo';
import Button from '../components/common/Button';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-app-bg">
      <Logo size={44} className="mb-6" />
      <h1 className="font-display font-semibold text-3xl text-ink-primary mb-2">Page not found</h1>
      <p className="text-ink-secondary mb-8 max-w-sm">
        The page you're looking for doesn't exist or may have moved.
      </p>
      <Link to="/">
        <Button>Back to home</Button>
      </Link>
    </div>
  );
}
