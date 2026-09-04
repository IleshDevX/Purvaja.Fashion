import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../../features/auth/store/authStore.js';
import { useToast } from '../../app/providers.js';

export function ForgotPasswordPage() {
  const { addToast } = useToast();
  const { forgotPassword, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    const success = await forgotPassword({ email });
    if (success) {
      setSubmitted(true);
      addToast('If an account exists, recovery instructions will be sent shortly.', 'success');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <p className="text-overline text-gold-600 mb-1">Account Recovery</p>
        <h2 className="font-serif text-heading-xl text-charcoal-900">Reset Your Password</h2>
        <p className="text-body-sm text-charcoal-500 mt-1">
          Enter the email address registered with your account and we will send you secure recovery instructions.
        </p>
      </div>

      {submitted ? (
        <div className="p-6 bg-ivory-50 border border-ivory-300 space-y-3 text-center">
          <CheckCircle2 className="w-10 h-10 text-success mx-auto" />
          <h3 className="font-serif text-heading text-charcoal-900">Instructions Dispatched</h3>
          <p className="text-body-sm text-charcoal-500">
            If an account exists for <strong className="text-charcoal-900">{email}</strong>, you will receive an email shortly with reset steps.
          </p>
          <Link
            to="/auth/login"
            className="inline-block mt-4 text-body-sm font-semibold text-charcoal-900 underline underline-offset-4 hover:text-gold-600"
          >
            Return to Sign In
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="forgot-password-email" className="block text-caption text-charcoal-700 font-medium mb-1">Email Address</label>
            <div className="relative">
              <input
                id="forgot-password-email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-3 py-2.5 bg-ivory-50 border border-ivory-300 text-body-sm text-charcoal-900 placeholder:text-charcoal-400 outline-none focus:border-charcoal-900"
              />
              <Mail className="w-4 h-4 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-charcoal-900 text-ivory-100 text-body-sm font-semibold tracking-wider hover:bg-charcoal-800 transition-colors disabled:opacity-60"
          >
            {isLoading ? 'DISPATCHING LINK...' : 'SEND RESET LINK'}
          </button>
        </form>
      )}

      <div className="text-center pt-2">
        <Link
          to="/auth/login"
          className="inline-flex items-center gap-1.5 text-body-sm text-charcoal-500 hover:text-charcoal-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Sign In
        </Link>
      </div>
    </div>
  );
}
