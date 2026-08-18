'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authError } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    if (mode === 'signup') {
      setError(null);
      setMode('signin');
      return;
    }

    router.push(redirectTo || '/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card p-8">
      <div className="mb-6 flex gap-2 rounded-lg bg-white/5 p-1">
        <button
          type="button"
          onClick={() => setMode('signin')}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
            mode === 'signin' ? 'bg-accent text-white' : 'text-muted'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
            mode === 'signup' ? 'bg-accent text-white' : 'text-muted'
          }`}
        >
          Sign Up
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm text-muted">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-border bg-white/5 px-4 py-2.5 text-white outline-none focus:border-accent"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm text-muted">Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-white/5 px-4 py-2.5 text-white outline-none focus:border-accent"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-negative/10 px-3 py-2 text-sm text-negative">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent py-2.5 font-medium text-white shadow-glow transition hover:bg-accent-glow disabled:opacity-50"
        >
          {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
        </button>
      </div>
    </form>
  );
}
