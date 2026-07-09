import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import Logo from '../components/common/Logo';
import Spinner from '../components/common/Spinner';
import Button from '../components/common/Button';
import { authApi } from '../api';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('This verification link is missing its token.');
      return;
    }
    authApi
      .verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.error?.message || 'This link is invalid or has expired.');
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-app-bg">
      <div className="w-full max-w-sm text-center bg-app-panel border border-app-border rounded-2xl p-8">
        <Link to="/" className="inline-block mb-4">
          <Logo size={40} />
        </Link>

        {status === 'verifying' && (
          <>
            <Spinner className="my-4" />
            <p className="text-ink-secondary text-sm">Verifying your email…</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 size={40} className="text-accent-strong mx-auto mb-4" />
            <h1 className="font-display font-semibold text-xl text-ink-primary">Email verified</h1>
            <p className="text-ink-secondary text-sm mt-2">Your account is active. You can log in now.</p>
            <Link to="/login">
              <Button className="w-full mt-6">Go to login</Button>
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={40} className="text-danger mx-auto mb-4" />
            <h1 className="font-display font-semibold text-xl text-ink-primary">Verification failed</h1>
            <p className="text-ink-secondary text-sm mt-2">{message}</p>
            <Link to="/signup">
              <Button variant="secondary" className="w-full mt-6">
                Back to sign up
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
