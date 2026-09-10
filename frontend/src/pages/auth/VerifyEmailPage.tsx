import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient, unwrapApiData } from '../../services/api/client.js';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [email, setEmail] = useState('');
  const [resent, setResent] = useState(false);

  const [resending, setResending] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setState('error'); return; }
    void apiClient.post('/auth/verify-email', { token }).then(response => { unwrapApiData(response.data); setState('success'); }).catch(() => setState('error'));
  }, [params]);

  const resend = async () => {
    if (!email || resending) return;
    setResendError(null);
    setResending(true);
    try {
      await apiClient.post('/auth/resend-verification', { email });
      setResent(true);
    } catch (err) {
      setResendError(err instanceof Error ? err.message : 'Unable to send verification email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="space-y-6 text-center max-w-md mx-auto py-8">
      <div>
        <p className="text-overline text-gold-600 mb-1">Account Security</p>
        <h2 className="font-serif text-heading-xl text-charcoal-900">Email Verification</h2>
      </div>

      <p className="text-body-sm text-charcoal-600">
        {state === 'loading' && 'Verifying your email address...'}
        {state === 'success' && 'Your email address has been successfully verified.'}
        {state === 'error' && 'This verification link is invalid or has expired.'}
      </p>

      {state === 'error' && (
        <div className="p-4 bg-ivory-100 border border-ivory-300 rounded-sm space-y-3 text-left">
          <label htmlFor="resend-email" className="block text-caption text-charcoal-700 font-medium">
            Request New Verification Link
          </label>
          <input
            id="resend-email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            type="email"
            placeholder="Enter your registered email"
            className="w-full px-3 py-2 bg-white border border-ivory-300 text-body-sm outline-none focus:border-charcoal-900"
          />
          {resendError && (
            <p className="text-caption text-error font-medium">{resendError}</p>
          )}
          {resent && (
            <p className="text-caption text-emerald-700 font-medium">Verification link sent to your inbox.</p>
          )}
          <button
            type="button"
            onClick={() => void resend()}
            disabled={!email || resending || resent}
            className="w-full py-2.5 bg-charcoal-900 text-ivory-100 text-xs font-semibold tracking-wider hover:bg-charcoal-800 disabled:opacity-50 transition-colors"
          >
            {resending ? 'Sending…' : resent ? 'Verification Link Sent' : 'Send New Verification Email'}
          </button>
        </div>
      )}

      {state !== 'loading' && (
        <div className="pt-2">
          <Link
            to="/auth/login"
            className="text-body-sm font-semibold text-charcoal-900 underline underline-offset-4 hover:text-gold-600 transition-colors"
          >
            Return to Sign In
          </Link>
        </div>
      )}
    </div>
  );
}
