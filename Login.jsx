import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Radio } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not sign in. Check your details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-10 justify-center">
          <div className="h-9 w-9 rounded-lg bg-signal flex items-center justify-center">
            <Radio size={18} className="text-white" />
          </div>
          <span className="font-display text-2xl text-white">Pulse</span>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <h1 className="font-display text-2xl text-ink mb-1">Welcome back</h1>
          <p className="text-sm text-slate-450 mb-6">Sign in to see what's happening.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-450 mb-1.5">EMAIL</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-paperDim bg-paper focus:bg-white focus:border-signal outline-none transition-colors text-sm"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-450 mb-1.5">PASSWORD</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-paperDim bg-paper focus:bg-white focus:border-signal outline-none transition-colors text-sm"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-sm text-coral">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-signal hover:bg-signalDark text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-60"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-sm text-slate-450 text-center mt-6">
            New here?{' '}
            <Link to="/register" className="text-signal font-medium hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
