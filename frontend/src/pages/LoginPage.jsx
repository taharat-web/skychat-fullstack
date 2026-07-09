import { useState } from 'react';
import { Link, Navigate, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import Logo from '../components/common/Logo';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import useAuthStore from '../store/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const status = useAuthStore((s) => s.status);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (status === 'authenticated') {
    return <Navigate to="/app" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login({ email, password });
      const redirectTo = location.state?.from || '/app';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Could not log in';
      setError(message);
      if (message.toLowerCase().includes('verify')) {
        toast.error('Check your inbox for the verification link, or request a new one below.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-app-bg">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Link to="/"><Logo size={44} /></Link>
          <h1 className="font-display font-semibold text-2xl text-ink-primary mt-4">Welcome back</h1>
          <p className="text-ink-secondary text-sm mt-1">Log in to keep the conversation going</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-app-panel border border-app-border rounded-2xl p-6">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="text-danger text-sm">{error}</p>}

          <div className="flex justify-end -mt-2">
            <Link to="/forgot-password" className="text-xs text-accent-strong hover:underline">
              Forgot password?
            </Link>
          </div>

          <Button type="submit" isLoading={isSubmitting} className="w-full mt-1">
            Log in
          </Button>
        </form>

        <p className="text-center text-sm text-ink-secondary mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-accent-strong hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
