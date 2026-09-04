import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient, unwrapApiData } from '../../services/api/client.js';

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [email, setEmail] = useState('');
  const [resent, setResent] = useState(false);

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setState('error'); return; }
    void apiClient.post('/auth/verify-email', { token }).then(response => { unwrapApiData(response.data); setState('success'); }).catch(() => setState('error'));
  }, [params]);

  const resend = async () => { if (!email) return; await apiClient.post('/auth/resend-verification', { email }); setResent(true); };
  return <div className="space-y-4 text-center"><h2 className="font-serif text-heading-xl text-charcoal-900">Email verification</h2><p className="text-body-sm text-charcoal-500">{state === 'loading' ? 'Verifying your email...' : state === 'success' ? 'Your email has been verified.' : 'This verification link is invalid or expired.'}</p>{state === 'error' && <div className="space-y-2"><input value={email} onChange={event => setEmail(event.target.value)} type="email" placeholder="Email address" className="w-full border p-2" /><button type="button" onClick={() => void resend()} className="text-body-sm font-semibold underline">{resent ? 'Verification request submitted' : 'Send a new verification email'}</button></div>}{state !== 'loading' && <Link to="/auth/login" className="text-body-sm font-semibold text-charcoal-900 underline">Return to sign in</Link>}</div>;
}
