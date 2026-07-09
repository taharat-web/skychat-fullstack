import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import Logo from '../components/common/Logo';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { authApi } from '../api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await authApi.forgotPassword(email);
    } finally {
      // Always show the same confirmation, whether or not the email exists -
      // this endpoint intentionally doesn't reveal which emails are registered.
      setIsSubmitting(false);
      setIsSent(true);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-app-bg">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Link to="/"><Logo size={44} /></Link>
          <h1 className="font-display font-semibold text-2xl text-ink-primary mt-4">Reset your password</h1>
          <p className="text-ink-secondary text-sm mt-1 text-center">
            Enter your email and we'll send you a link to choose a new one.
          </p>
        </div>

        {isSent ? (
          <div className="text-center bg-app-panel border border-app-border rounded-2xl p-6">
            <MailCheck size={32} className="text-accent-strong mx-auto mb-3" />
            <p className="text-sm text-ink-secondary">
              If <span className="text-ink-primary">{email}</span> is registered, a password reset link is on its way.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-app-panel border border-app-border rounded-2xl p-6">
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Button type="submit" isLoading={isSubmitting} className="w-full">
              Send reset link
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
