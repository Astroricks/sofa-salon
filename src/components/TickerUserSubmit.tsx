'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useLocale } from '@/components/LocaleProvider';

export type TickerUserSubmitLabels = {
  placeholder: string;
  sendButton: string;
  sentButton: string;
};

export default function TickerUserSubmit({ labels }: { labels?: TickerUserSubmitLabels }) {
  const { t } = useLocale();
  const { placeholder, sendButton, sentButton } = labels ?? {
    placeholder: t.profile.sendToTickerPlaceholder,
    sendButton: t.profile.sendToTickerButton,
    sentButton: t.profile.sendToTickerSent,
  };
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u ?? null));
    supabase.auth.onAuthStateChange((_, session) => setUser(session?.user ?? null));
  }, []);

  if (!user) return null;

  const submit = async () => {
    const text = content.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/ticker/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setContent('');
        setSent(true);
        setTimeout(() => setSent(false), 3000);
      } else {
        setError((data as { error?: string }).error ?? t.common.sendFailed);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {error && (
        <p className="font-mono text-[11px] text-[#f87171]" role="alert">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1a1a] border border-[#e8c84a]/40 rounded-sm shadow-[0_0_0_1px_rgba(232,200,74,0.15)]">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 max-w-[220px] bg-[#0f0f0f] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[12px] px-3 py-1.5 outline-none focus:border-[#e8c84a] rounded"
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <button
          type="button"
          onClick={submit}
          disabled={sending || !content.trim()}
          className="shrink-0 font-mono text-[12px] font-medium tracking-wider uppercase px-3 py-1.5 rounded text-[#0f0f0f] bg-[#e8c84a] hover:bg-[#f0d050] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? '…' : sent ? sentButton : sendButton}
        </button>
      </div>
    </div>
  );
}
