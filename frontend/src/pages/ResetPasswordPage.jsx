import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import Logo from '../components/common/Logo';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { authApi } from '../api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must be at least 8 characters with a letter and a number');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.resetPassword(token, password);
      setIsDone(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'This link is invalid or has expired');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-app-bg">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Link to="/"><Logo size={44} /></Link>
          <h1 className="font-display font-semibold text-2xl text-ink-primary mt-4">Choose a new password</h1>
        </div>

        {isDone ? (
          <div className="text-center bg-app-panel border border-app-border rounded-2xl p-6">
            <CheckCircle2 size={32} className="text-accent-strong mx-auto mb-3" />
            <p className="text-sm text-ink-secondary mb-4">
              Your password has been updated. Any other devices you were logged in on have been signed out.
            </p>
            <Button className="w-full" onClick={() => navigate('/login')}>
              Go to login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-app-panel border border-app-border rounded-2xl p-6">
            <Input
              label="New password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Input
              label="Confirm new password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            {error && <p className="text-danger text-sm">{error}</p>}
            <Button type="submit" isLoading={isSubmitting} className="w-full">
              Update password
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-ink-secondary mt-6">
          <Link to="/login" className="text-accent-strong hover:underline">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
