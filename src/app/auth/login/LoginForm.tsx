'use client';

import { createClient } from '@/lib/supabase/client';
import { isSignupEmailTakenError } from '@/lib/auth-errors';
import { buildPasswordResetCallbackUrl } from '@/lib/password-reset-redirect';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useLocale } from '@/components/LocaleProvider';

interface LoginFormProps {
  redirectTo?: string;
}

type AuthMode = 'signin' | 'signup';

export default function LoginForm({ redirectTo = '/' }: LoginFormProps) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [signupEmailTaken, setSignupEmailTaken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSentNotice, setResetSentNotice] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const supabase = createClient();

  const clearNotices = () => {
    setError(null);
    setSignupEmailTaken(false);
    setResetSentNotice(false);
  };

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    clearNotices();
  };

  const sendPasswordResetEmail = async () => {
    const trimmed = email.trim().toLowerCase();
    setError(null);
    setResetSentNotice(false);
    if (!trimmed) {
      setError(t.auth.resetNeedsEmail);
      return;
    }
    setResetLoading(true);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { error: err } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: buildPasswordResetCallbackUrl(origin, redirectTo),
    });
    setResetLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSignupEmailTaken(false);
    setResetSentNotice(true);
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearNotices();
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearNotices();
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (err) {
      if (isSignupEmailTakenError(err)) {
        setSignupEmailTaken(true);
        return;
      }
      setError(err.message);
      return;
    }
    // Fire-and-forget: send welcome email (reminder to check inbox, link to profile for email prefs)
    fetch('/api/auth/welcome-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: locale === 'zh' ? 'zh' : 'en' }),
    }).catch(() => {});
    router.push(redirectTo);
    router.refresh();
  };

  const submitAuth = (e: React.FormEvent) => {
    if (mode === 'signup') return signUp(e);
    return signIn(e);
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-5 border border-[#2a2a2a] bg-[#151515]" style={{ borderRadius: 0 }}>
        <div className="grid grid-cols-2">
          <button
            type="button"
            onClick={() => switchMode('signin')}
            aria-pressed={mode === 'signin'}
            className={`font-mono text-[10px] tracking-[0.2em] uppercase py-3 px-4 min-h-[44px] transition-all ${
              mode === 'signin'
                ? 'bg-[#e8c84a] text-[#0f0f0f]'
                : 'text-[#888888] hover:text-[#e8c84a]'
            }`}
            style={{ borderRadius: 0 }}
          >
            {t.auth.signIn}
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            aria-pressed={mode === 'signup'}
            className={`font-mono text-[10px] tracking-[0.2em] uppercase py-3 px-4 min-h-[44px] transition-all ${
              mode === 'signup'
                ? 'bg-[#e8c84a] text-[#0f0f0f]'
                : 'text-[#888888] hover:text-[#e8c84a]'
            }`}
            style={{ borderRadius: 0 }}
          >
            {t.auth.createAccount}
          </button>
        </div>
        <p className="border-t border-[#2a2a2a] px-4 py-3 font-mono text-[12px] leading-relaxed text-[#888888]">
          {mode === 'signup' ? t.auth.signUpModeHint : t.auth.signInModeHint}
        </p>
      </div>

      <form className="space-y-4" onSubmit={submitAuth}>
        <div>
          <label
            htmlFor="email"
            className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2"
          >
            {t.auth.email}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearNotices();
            }}
            placeholder={t.auth.emailPlaceholder}
            className="w-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] px-4 py-3 min-h-[44px] outline-none focus:border-[#e8c84a] placeholder:text-[#444444]"
            style={{ borderRadius: 0 }}
            required
            autoComplete="email"
          />
        </div>
        <div>
          <div className="flex justify-between items-baseline mb-2 gap-2">
            <label
              htmlFor="password"
              className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888]"
            >
              {t.auth.password}
            </label>
            {mode === 'signin' && (
              <button
                type="button"
                disabled={loading || resetLoading}
                onClick={sendPasswordResetEmail}
                className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#e8c84a] hover:opacity-85 disabled:opacity-50 whitespace-nowrap"
              >
                {resetLoading ? t.auth.resetPasswordSending : t.auth.forgotPassword}
              </button>
            )}
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            placeholder={t.auth.passwordPlaceholder}
            className="w-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] px-4 py-3 min-h-[44px] outline-none focus:border-[#e8c84a] placeholder:text-[#444444]"
            style={{ borderRadius: 0 }}
            required
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
        </div>
        {(signupEmailTaken || resetSentNotice) && (
          <div className="rounded-sm border border-[#2a2a2a] bg-[#1a1a1a] p-4 space-y-3">
            {signupEmailTaken && (
              <p className="font-mono text-[13px] text-[#e8e4dc] leading-relaxed">
                {t.auth.signupEmailTakenHint}
              </p>
            )}
            {signupEmailTaken && (
              <button
                type="button"
                disabled={loading || resetLoading}
                onClick={sendPasswordResetEmail}
                className="w-full border border-[#e8c84a] text-[#e8c84a] font-mono text-[10px] tracking-[0.2em] uppercase py-3 px-4 min-h-[44px] hover:bg-[#e8c84a]/10 disabled:opacity-60 transition-all"
                style={{ borderRadius: 0 }}
              >
                {resetLoading ? t.auth.resetPasswordSending : t.auth.sendResetLink}
              </button>
            )}
            {resetSentNotice && (
              <p className="font-mono text-[12px] text-[#888888] leading-relaxed">
                {t.auth.resetPasswordSent}
              </p>
            )}
          </div>
        )}
        {error && (
          <p className="font-mono text-[13px] text-[#f87171]">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#e8c84a] text-[#0f0f0f] font-mono text-[10px] tracking-[0.2em] uppercase py-3 px-6 min-h-[44px] hover:opacity-85 active:scale-[0.97] disabled:opacity-60 transition-all"
          style={{ borderRadius: 0 }}
        >
          {mode === 'signup' ? t.auth.createAccount : t.auth.signIn}
        </button>
      </form>

    </div>
  );
}
