import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, ShieldCheck } from 'lucide-react';
import { useToast } from '../../app/providers.js';
import { useAuthStore } from '../../features/auth/store/authStore.js';
import { sanitizeInternalRedirect } from '../../features/auth/utils/redirect.js';
import { apiClient, unwrapApiData } from '../../services/api/client.js';

type LinkVerificationState = 'idle' | 'loading' | 'success' | 'error';

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { addToast } = useToast();
  const initialize = useAuthStore(state => state.initialize);
  const token = params.get('token');
  const initialEmail = params.get('email')?.trim().toLowerCase() ?? '';
  const redirectTarget = useMemo(() => sanitizeInternalRedirect(params.get('redirect')), [params]);

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [linkState, setLinkState] = useState<LinkVerificationState>(token ? 'loading' : 'idle');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    let active = true;
    void apiClient.post('/auth/verify-email', { token })
      .then(response => {
        unwrapApiData(response.data);
        if (active) setLinkState('success');
      })
      .catch(() => {
        if (active) setLinkState('error');
      });

    return () => { active = false; };
  }, [token]);

  const verifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || otp.length !== 6 || verifying) return;

    setVerificationError(null);
    setVerifying(true);
    try {
      await apiClient.post('/auth/verify-email', { email: email.trim(), otp });
      await initialize();
      addToast('Email verified. Your account is ready.', 'success');
      navigate(redirectTarget, { replace: true });
    } catch (error) {
      setVerificationError(errorMessage(error, 'The verification code is invalid or has expired.'));
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    if (!email.trim() || resending) return;
    setResendError(null);
    setResending(true);
    try {
      await apiClient.post('/auth/resend-verification', { email: email.trim() });
      setOtp('');
      setResent(true);
      addToast('If the account is eligible, a new code has been sent.', 'success');
    } catch (error) {
      setResendError(errorMessage(error, 'Unable to send a new verification code. Please try again.'));
    } finally {
      setResending(false);
    }
  };

  if (token) {
    return (
      <div className="space-y-6 text-center max-w-md mx-auto py-8" aria-live="polite">
        <div>
          <p className="text-overline text-gold-600 mb-1">Account Security</p>
          <h2 className="font-serif text-heading-xl text-charcoal-900">Email Verification</h2>
        </div>
        <p className="text-body-sm text-charcoal-600">
          {linkState === 'loading' && 'Verifying your email address...'}
          {linkState === 'success' && 'Your email address has been successfully verified.'}
          {linkState === 'error' && 'This verification link is invalid or has expired.'}
        </p>
        {linkState !== 'loading' && (
          <Link to="/auth/login" className="text-body-sm font-semibold text-charcoal-900 underline underline-offset-4 hover:text-gold-600">
            Return to Sign In
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-md mx-auto py-8 animate-fade-in">
      <div className="text-center">
        <ShieldCheck className="w-10 h-10 text-gold-600 mx-auto mb-3" aria-hidden="true" />
        <p className="text-overline text-gold-600 mb-1">Account Security</p>
        <h2 className="font-serif text-heading-xl text-charcoal-900">Verify Your Email</h2>
        <p className="text-body-sm text-charcoal-500 mt-2">
          Enter the six-digit code sent to your email. The code expires in 10 minutes.
        </p>
      </div>

      <form onSubmit={verifyOtp} className="space-y-4">
        <div>
          <label htmlFor="verification-email" className="block text-caption text-charcoal-700 font-medium mb-1">Email Address</label>
          <div className="relative">
            <input
              id="verification-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={event => { setEmail(event.target.value); setResent(false); }}
              className="w-full pl-10 pr-3 py-2.5 bg-ivory-50 border border-ivory-300 text-body-sm text-charcoal-900 outline-none focus:border-charcoal-900"
            />
            <Mail className="w-4 h-4 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          </div>
        </div>

        <div>
          <label htmlFor="verification-code" className="block text-caption text-charcoal-700 font-medium mb-1">Verification Code</label>
          <input
            id="verification-code"
            type="text"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={otp}
            onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="w-full px-3 py-3 bg-ivory-50 border border-ivory-300 text-center text-xl tracking-[0.45em] text-charcoal-900 outline-none focus:border-charcoal-900"
          />
        </div>

        {verificationError && <p role="alert" className="text-caption text-error font-medium">{verificationError}</p>}
        {resendError && <p role="alert" className="text-caption text-error font-medium">{resendError}</p>}
        {resent && <p role="status" className="text-caption text-emerald-700 font-medium">A new code was requested. Check your inbox and spam folder.</p>}

        <button type="submit" disabled={!email.trim() || otp.length !== 6 || verifying} className="w-full py-3.5 bg-charcoal-900 text-ivory-100 text-body-sm font-semibold tracking-wider hover:bg-charcoal-800 disabled:opacity-50">
          {verifying ? 'VERIFYING...' : 'VERIFY EMAIL'}
        </button>
        <button type="button" onClick={() => void resend()} disabled={!email.trim() || resending} className="w-full py-2.5 border border-charcoal-300 text-charcoal-800 text-xs font-semibold tracking-wider hover:border-charcoal-900 disabled:opacity-50">
          {resending ? 'SENDING...' : 'SEND A NEW CODE'}
        </button>
      </form>

      <div className="text-center">
        <Link to="/auth/login" className="text-body-sm font-semibold text-charcoal-900 underline underline-offset-4 hover:text-gold-600">
          Return to Sign In
        </Link>
      </div>
    </div>
  );
}
