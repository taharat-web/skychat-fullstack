import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import Logo from '../components/common/Logo';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import useAuthStore from '../store/authStore';
import { authApi } from '../api';

export default function SignupPage() {
  const signup = useAuthStore((s) => s.signup);
  const status = useAuthStore((s) => s.status);

  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState(null);

  if (status === 'authenticated') {
    return <Navigate to="/app" replace />;
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function validate() {
    const next = {};
    if (form.username.length < 3) next.username = 'At least 3 characters';
    else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(form.username)) next.username = 'Letters, numbers, underscore only - must start with a letter';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email';
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      next.password = 'At least 8 characters, with a letter and a number';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await signup(form);
      setSubmittedEmail(form.email);
    } catch (err) {
      const message = err.response?.data?.error?.message || 'Could not create your account';
      setErrors({ form: message });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    try {
      await authApi.resendVerification(submittedEmail);
      toast.success('Verification email sent again');
    } catch {
      toast.error('Could not resend - try again shortly');
    }
  }

  if (submittedEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-app-bg">
        <div className="w-full max-w-sm text-center bg-app-panel border border-app-border rounded-2xl p-8">
          <MailCheck size={40} className="text-accent-strong mx-auto mb-4" />
          <h1 className="font-display font-semibold text-xl text-ink-primary">Check your email</h1>
          <p className="text-ink-secondary text-sm mt-2">
            We sent a verification link to <span className="text-ink-primary">{submittedEmail}</span>. Click it to
            activate your account, then log in.
          </p>
          <Button variant="secondary" className="w-full mt-6" onClick={handleResend}>
            Resend verification email
          </Button>
          <Link to="/login" className="block text-sm text-accent-strong hover:underline mt-4">
            Back to log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-app-bg">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Link to="/"><Logo size={44} /></Link>
          <h1 className="font-display font-semibold text-2xl text-ink-primary mt-4">Create your account</h1>
          <p className="text-ink-secondary text-sm mt-1">Start chatting in under a minute</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-app-panel border border-app-border rounded-2xl p-6">
          <Input
            label="Username"
            value={form.username}
            onChange={(e) => update('username', e.target.value)}
            error={errors.username}
            autoComplete="username"
            required
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            error={errors.email}
            autoComplete="email"
            required
          />
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            error={errors.password}
            autoComplete="new-password"
            required
          />

          {errors.form && <p className="text-danger text-sm">{errors.form}</p>}

          <Button type="submit" isLoading={isSubmitting} className="w-full mt-1">
            Create account
          </Button>
        </form>

        <p className="text-center text-sm text-ink-secondary mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-accent-strong hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
