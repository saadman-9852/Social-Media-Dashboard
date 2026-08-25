import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Radio } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', displayName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create your account. Try different details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-10 justify-center">
          <div className="h-9 w-9 rounded-lg bg-signal flex items-center justify-center">
            <Radio size={18} className="text-white" />
          </div>
          <span className="font-display text-2xl text-white">Pulse</span>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <h1 className="font-display text-2xl text-ink mb-1">Create your account</h1>
          <p className="text-sm text-slate-450 mb-6">Join the conversation.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-450 mb-1.5">DISPLAY NAME</label>
              <input
                required
                value={form.displayName}
                onChange={update('displayName')}
                className="w-full px-3.5 py-2.5 rounded-lg border border-paperDim bg-paper focus:bg-white focus:border-signal outline-none transition-colors text-sm"
                placeholder="Ava Chen"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-450 mb-1.5">USERNAME</label>
              <input
                required
                value={form.username}
                onChange={update('username')}
                className="w-full px-3.5 py-2.5 rounded-lg border border-paperDim bg-paper focus:bg-white focus:border-signal outline-none transition-colors text-sm"
                placeholder="ava_chen"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-450 mb-1.5">EMAIL</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={update('email')}
                className="w-full px-3.5 py-2.5 rounded-lg border border-paperDim bg-paper focus:bg-white focus:border-signal outline-none transition-colors text-sm"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-450 mb-1.5">PASSWORD</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={update('password')}
                className="w-full px-3.5 py-2.5 rounded-lg border border-paperDim bg-paper focus:bg-white focus:border-signal outline-none transition-colors text-sm"
                placeholder="At least 8 characters"
              />
            </div>

            {error && <p className="text-sm text-coral">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-signal hover:bg-signalDark text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-60"
            >
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-sm text-slate-450 text-center mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-signal font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
