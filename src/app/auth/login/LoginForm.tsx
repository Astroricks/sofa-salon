'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push('/');
    router.refresh();
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push('/');
    router.refresh();
  };

  return (
    <div className="w-full max-w-sm">
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); signIn(e); }}>
        <div>
          <label htmlFor="email" className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] px-4 py-3 min-h-[44px] outline-none focus:border-[#e8c84a] placeholder:text-[#444444]"
            style={{ borderRadius: 0 }}
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label htmlFor="password" className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] px-4 py-3 min-h-[44px] outline-none focus:border-[#e8c84a] placeholder:text-[#444444]"
            style={{ borderRadius: 0 }}
            required
            autoComplete="current-password"
          />
        </div>
        {error && (
          <p className="font-mono text-[13px] text-[#f87171]">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="submit"
            onClick={signIn}
            disabled={loading}
            className="flex-1 bg-[#e8c84a] text-[#0f0f0f] font-mono text-[10px] tracking-[0.2em] uppercase py-3 px-6 min-h-[44px] hover:opacity-85 active:scale-[0.97] disabled:opacity-60 transition-all"
            style={{ borderRadius: 0 }}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={signUp}
            disabled={loading}
            className="flex-1 border border-[#2a2a2a] text-[#888888] font-mono text-[10px] tracking-[0.2em] uppercase py-3 px-6 min-h-[44px] hover:border-[#e8c84a] hover:text-[#e8c84a] disabled:opacity-60 transition-all"
            style={{ borderRadius: 0 }}
          >
            Create account
          </button>
        </div>
      </form>

      {/* ——— Google OAuth (commented out for email/password testing) ——— */}
      {/* const signInWithGoogle = async () => {
        const supabase = createClient();
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
          },
        });
      }; */}
      {/* <button
        type="button"
        onClick={signInWithGoogle}
        className="w-full bg-[#e8c84a] text-[#0f0f0f] font-mono text-[10px] tracking-[0.2em] uppercase py-3 px-8 min-h-[44px] hover:opacity-85 active:scale-[0.97] transition-all"
        style={{ borderRadius: 0 }}
      >
        Sign in with Google
      </button>
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#444444] mt-4 text-center">
        No other login options
      </p> */}
    </div>
  );
}
