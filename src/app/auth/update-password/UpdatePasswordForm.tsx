'use client';

import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/components/LocaleProvider';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Props {
  redirectTo: string;
}

export default function UpdatePasswordForm({ redirectTo }: Props) {
  const router = useRouter();
  const { t } = useLocale();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!password.trim()) {
      setError(t.auth.passwordRequired);
      return;
    }
    if (password !== confirm) {
      setError(t.auth.passwordsDoNotMatch);
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  };

  return (
    <div className="w-full max-w-sm">
      <h2 className="font-pixel text-xl text-[#e8e4dc] mb-8 text-center">
        {t.auth.updatePasswordTitle}
      </h2>
      <form className="space-y-4" onSubmit={submit}>
        <div>
          <label
            htmlFor="new-password"
            className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2"
          >
            {t.auth.newPassword}
          </label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            placeholder={t.auth.passwordPlaceholderCreate}
            className="w-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] px-4 py-3 min-h-[44px] outline-none focus:border-[#e8c84a] placeholder:text-[#444444]"
            style={{ borderRadius: 0 }}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        <div>
          <label
            htmlFor="confirm-new-password"
            className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2"
          >
            {t.auth.confirmNewPassword}
          </label>
          <input
            id="confirm-new-password"
            type="password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setError(null);
            }}
            placeholder={t.auth.passwordPlaceholderRepeat}
            className="w-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] px-4 py-3 min-h-[44px] outline-none focus:border-[#e8c84a] placeholder:text-[#444444]"
            style={{ borderRadius: 0 }}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </div>
        {error && (
          <p className="font-mono text-[13px] text-[#f87171]">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#e8c84a] text-[#0f0f0f] font-mono text-[10px] tracking-[0.2em] uppercase py-3 px-8 min-h-[44px] hover:opacity-85 active:scale-[0.97] transition-all disabled:opacity-60"
          style={{ borderRadius: 0 }}
        >
          {t.auth.saveNewPassword}
        </button>
      </form>
    </div>
  );
}
