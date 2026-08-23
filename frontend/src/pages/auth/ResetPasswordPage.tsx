import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../features/auth/store/authStore.js';
import { useToast } from '../../app/providers.js';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { resetPassword, isLoading } = useAuthStore();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [completed, setCompleted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      addToast('Passwords do not match.', 'error');
      return;
    }

    const success = await resetPassword({ password, confirmPassword });
    if (success) {
      setCompleted(true);
      addToast('Your password has been successfully updated.', 'success');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <p className="text-overline text-gold-600 mb-1">Security</p>
        <h2 className="font-serif text-heading-xl text-charcoal-900">Choose New Password</h2>
        <p className="text-body-sm text-charcoal-500 mt-1">
          Create a strong password of at least 8 characters with letters and numbers.
        </p>
      </div>

      {completed ? (
        <div className="p-6 bg-ivory-50 border border-ivory-300 space-y-3 text-center">
          <CheckCircle2 className="w-10 h-10 text-success mx-auto" />
          <h3 className="font-serif text-heading text-charcoal-900">Password Updated</h3>
          <p className="text-body-sm text-charcoal-500">
            You can now sign in to your Purvaja Fashion account using your new credentials.
          </p>
          <button
            onClick={() => navigate('/auth/login')}
            className="mt-4 px-6 py-3 bg-charcoal-900 text-ivory-100 text-body-sm font-semibold tracking-wide hover:bg-charcoal-800 transition-colors"
          >
            Sign In Now
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-caption text-charcoal-700 font-medium mb-1">New Password</label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-2.5 bg-ivory-50 border border-ivory-300 text-body-sm text-charcoal-900 placeholder:text-charcoal-400 outline-none focus:border-charcoal-900"
              />
              <Lock className="w-4 h-4 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div>
            <label className="block text-caption text-charcoal-700 font-medium mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3 py-2.5 bg-ivory-50 border border-ivory-300 text-body-sm text-charcoal-900 placeholder:text-charcoal-400 outline-none focus:border-charcoal-900"
              />
              <Lock className="w-4 h-4 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-charcoal-900 text-ivory-100 text-body-sm font-semibold tracking-wider hover:bg-charcoal-800 transition-colors disabled:opacity-60"
          >
            {isLoading ? 'UPDATING...' : 'UPDATE PASSWORD'}
          </button>
        </form>
      )}

      <div className="text-center pt-2">
        <Link
          to="/auth/login"
          className="text-body-sm text-charcoal-500 hover:text-charcoal-900 transition-colors"
        >
          Cancel and return to Sign In
        </Link>
      </div>
    </div>
  );
}
