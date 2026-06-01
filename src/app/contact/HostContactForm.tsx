'use client';

import { useState } from 'react';
import { useLocale } from '@/components/LocaleProvider';
import { MESSAGE_MAX, SUBJECT_MAX } from '@/lib/host-contact';

type Props = {
  initialReplyEmail?: string;
};

export default function HostContactForm({ initialReplyEmail = '' }: Props) {
  const { t, locale } = useLocale();
  const c = t.hostContact;
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [replyEmail, setReplyEmail] = useState(initialReplyEmail);
  const [sending, setSending] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setErrorKey(null);
    try {
      const res = await fetch('/api/host-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message, replyEmail, locale }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErrorKey(data.error ?? 'send_failed');
        return;
      }
      setSent(true);
      setSubject('');
      setMessage('');
    } catch {
      setErrorKey('send_failed');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <p className="font-mono text-sm text-[#e8c84a] tracking-wide" role="status">
        {c.success}
      </p>
    );
  }

  const errorMessage =
    errorKey && errorKey in c.errors
      ? c.errors[errorKey as keyof typeof c.errors]
      : errorKey
        ? c.errors.send_failed
        : null;

  return (
    <form onSubmit={submit} className="space-y-5 max-w-lg">
      <h1 className="font-pixel text-lg text-[#e8e4dc] mb-4">{c.title}</h1>
      <p className="font-mono text-xs text-[#888888] leading-relaxed whitespace-pre-line">
        {c.instructions}
      </p>

      <div>
        <label htmlFor="host-contact-reply-email" className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-1.5">
          {c.replyEmailLabel}
        </label>
        <input
          id="host-contact-reply-email"
          type="email"
          required
          autoComplete="email"
          value={replyEmail}
          onChange={(e) => setReplyEmail(e.target.value)}
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-[#e8e4dc] px-3 py-2 font-mono text-sm focus:outline-none focus:border-[#e8c84a]"
          style={{ borderRadius: 0 }}
        />
        <p className="mt-1 font-mono text-[10px] text-[#666]">{c.replyEmailHint}</p>
      </div>

      <div>
        <label htmlFor="host-contact-subject" className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-1.5">
          {c.subjectLabel}
        </label>
        <input
          id="host-contact-subject"
          type="text"
          required
          maxLength={SUBJECT_MAX}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-[#e8e4dc] px-3 py-2 font-mono text-sm focus:outline-none focus:border-[#e8c84a]"
          style={{ borderRadius: 0 }}
        />
      </div>

      <div>
        <label htmlFor="host-contact-message" className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-1.5">
          {c.messageLabel}
        </label>
        <textarea
          id="host-contact-message"
          required
          rows={10}
          maxLength={MESSAGE_MAX}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={c.messagePlaceholder}
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-[#e8e4dc] px-3 py-2 font-mono text-sm focus:outline-none focus:border-[#e8c84a] resize-y min-h-[180px]"
          style={{ borderRadius: 0 }}
        />
      </div>

      {errorMessage && (
        <p className="font-mono text-xs text-red-400" role="alert">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="font-mono text-[10px] tracking-[0.2em] uppercase px-6 py-3 min-h-[44px] border border-[#e8c84a] text-[#e8c84a] hover:bg-[#e8c84a] hover:text-[#0f0f0f] transition-colors disabled:opacity-50"
        style={{ borderRadius: 0 }}
      >
        {sending ? c.sending : c.submit}
      </button>
    </form>
  );
}
