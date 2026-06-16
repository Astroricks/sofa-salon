'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/components/LocaleProvider';
import { getBadgeLevel } from '@/lib/badges';

type EmailTestType = 'welcome' | 'reminder' | 'waitlist_promotion' | 'post_event_rating';

/** Breakpoints for badge preview (matches getBadgeLevel tiers). */
const BADGE_PREVIEW_COUNTS = [0, 3, 5, 10, 20, 30, 50, 80] as const;

export default function AdminTestPage() {
  const { t, locale } = useLocale();
  const [noShowCount, setNoShowCount] = useState(0);
  const [badgeFromHistory, setBadgeFromHistory] = useState(0);
  /** Local-only override for badge preview on this page (null = use history). */
  const [badgePreviewCount, setBadgePreviewCount] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSending, setEmailSending] = useState<EmailTestType | null>(null);
  const [emailResult, setEmailResult] = useState<'ok' | 'fail' | null>(null);

  useEffect(() => {
    fetch('/api/admin/test-profile')
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 403 ? t.admin.adminOnly : t.common.loadFailed);
        return res.json();
      })
      .then((data) => {
        setNoShowCount(data.no_show_count ?? 0);
        setBadgeFromHistory(data.badge_attendance_count ?? 0);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoaded(true));
  }, [t.admin.adminOnly, t.common.loadFailed]);

  const save = async () => {
    setError(null);
    setSaving(true);
    const res = await fetch('/api/admin/test-profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ no_show_count: noShowCount }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? t.common.saveFailed);
      return;
    }
    const r2 = await fetch('/api/admin/test-profile');
    if (r2.ok) {
      const d2 = await r2.json();
      setBadgeFromHistory(d2.badge_attendance_count ?? 0);
    }
  };

  const effectiveBadgeCount = badgePreviewCount ?? badgeFromHistory;
  const badge = getBadgeLevel(effectiveBadgeCount);

  const sendTestEmail = async (type: EmailTestType) => {
    setEmailResult(null);
    setError(null);
    setEmailSending(type);
    try {
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      setEmailResult(res.ok ? 'ok' : 'fail');
      if (res.ok) setError(null);
      else setError((await res.json().catch(() => ({}))).error ?? t.admin.testEmailFailed);
    } catch {
      setEmailResult('fail');
      setError(t.admin.testEmailFailed);
    } finally {
      setEmailSending(null);
    }
  };

  if (!loaded) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 bg-[#0f0f0f]">
        <p className="font-mono text-[13px] text-[#888888]">{t.common.loading}</p>
      </div>
    );
  }

  if (error && error === t.admin.adminOnly) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 bg-[#0f0f0f]">
        <p className="font-mono text-[13px] text-[#f87171]">{t.admin.adminOnly}</p>
        <Link href="/admin" className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#e8c84a] mt-4 inline-block">
          {t.admin.backToAdmin}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 bg-[#0f0f0f]">
      <Link
        href="/admin"
        className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] hover:text-[#e8c84a] mb-6 inline-block transition-colors"
      >
        {t.admin.backToAdmin}
      </Link>
      <h1 className="font-mono text-xl text-[#e8e4dc] mb-1">
        <span className="text-[#e8c84a]">{t.admin.testPigeonBadge}</span>
      </h1>
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-6">
        {t.admin.testPigeonBadgeHint}
      </p>

      {error && (
        <p className="font-mono text-[11px] text-[#f87171] mb-4" role="alert">
          {error}
        </p>
      )}

      <div className="border border-[#2a2a2a] p-4 mb-6" style={{ borderRadius: 0 }}>
        <h2 className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#e8c84a] mb-3">
          {t.admin.testSectionBloodBar}
        </h2>
        <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2">
          {t.admin.testNoShowCount}
        </label>
        <input
          type="number"
          min={0}
          max={3}
          value={loaded ? noShowCount : ''}
          onChange={(e) => setNoShowCount(Math.max(0, Math.min(3, parseInt(e.target.value, 10) || 0)))}
          className="w-20 bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] px-3 py-2 outline-none focus:border-[#e8c84a] mb-4"
          style={{ borderRadius: 0 }}
        />
        <p className="font-mono text-[11px] text-[#666] mb-4">
          {t.admin.testNoShowCountHelp}
        </p>

        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#e8c84a] mb-1">
          {t.admin.testAttendanceCount}
        </p>
        <p className="font-mono text-[13px] text-[#e8e4dc] mb-2 tabular-nums">
          {loaded ? badgeFromHistory : '—'}
        </p>
        <p className="font-mono text-[11px] text-[#666] mb-4">
          {t.admin.testAttendanceCountHelp}
        </p>

        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#e8c84a] mb-1">
          {t.admin.testBadgePreview}
        </p>
        <p className="font-mono text-[11px] text-[#666] mb-2">
          {t.admin.testBadgePreviewHint}
        </p>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <input
            type="number"
            min={0}
            max={999}
            value={effectiveBadgeCount}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              setBadgePreviewCount(Number.isFinite(n) ? Math.max(0, n) : 0);
            }}
            className="w-20 bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] px-3 py-2 outline-none focus:border-[#e8c84a] tabular-nums"
            style={{ borderRadius: 0 }}
            aria-label={t.admin.testBadgePreview}
          />
          <span className="font-mono text-[13px] text-[#888888]">
            {badge.emoji} {locale === 'zh' ? badge.label : badge.labelEn}
          </span>
        </div>
        {badgePreviewCount !== null && (
          <button
            type="button"
            onClick={() => setBadgePreviewCount(null)}
            className="font-mono text-[10px] tracking-[0.15em] uppercase text-[#888888] hover:text-[#e8c84a] mb-3 transition-colors"
          >
            {t.admin.testBadgePreviewReset} ({badgeFromHistory})
          </button>
        )}
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2">
          {t.admin.testBadgeTierGallery}
        </p>
        <ul className="grid grid-cols-2 gap-2 mb-4">
          {BADGE_PREVIEW_COUNTS.map((n) => {
            const tier = getBadgeLevel(n);
            const label = locale === 'zh' ? tier.label : tier.labelEn;
            const active = effectiveBadgeCount === n;
            return (
              <li key={n}>
                <button
                  type="button"
                  onClick={() => setBadgePreviewCount(n)}
                  className={`w-full border px-2 py-2 font-mono text-[11px] text-left transition-colors ${
                    active
                      ? 'border-[#e8c84a] text-[#e8e4dc]'
                      : 'border-[#2a2a2a] text-[#888888] hover:border-[#444]'
                  }`}
                  style={{ borderRadius: 0 }}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <span>{tier.emoji}</span>
                    <span className="tabular-nums">{n === 0 ? '0' : `${n}+`}</span>
                    <span className="truncate">{label}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="font-mono text-[10px] tracking-[0.2em] uppercase px-4 py-2 bg-[#e8c84a] text-[#0f0f0f] hover:opacity-85 disabled:opacity-50"
          style={{ borderRadius: 0 }}
        >
          {saving ? t.common.loading : t.admin.testApply}
        </button>
      </div>

      <div className="font-mono text-[11px] text-[#666] space-y-2 mb-6">
        <p>
          → <Link href="/profile" className="text-[#e8c84a] hover:underline">{t.admin.testViewProfile}</Link>
          {' '}{t.admin.testViewProfileHint}
        </p>
        <p>
          → {t.admin.testViewSeatMapHint}
        </p>
      </div>

      <div className="border border-[#2a2a2a] p-4 mb-6" style={{ borderRadius: 0 }}>
        <h2 className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#e8c84a] mb-2">
          {t.admin.testSqueezeTitle}
        </h2>
        <p className="font-mono text-[11px] text-[#666]">
          {t.admin.testSqueezeHint}
        </p>
      </div>

      <div className="border border-[#2a2a2a] p-4 mb-6" style={{ borderRadius: 0 }}>
        <h2 className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#e8c84a] mb-2">
          {t.admin.testSectionWaitlist}
        </h2>
        <p className="font-mono text-[11px] text-[#666]">
          {t.admin.testWaitlistHint}
        </p>
      </div>

      <div className="border border-[#2a2a2a] p-4 mb-6" style={{ borderRadius: 0 }}>
        <h2 className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#e8c84a] mb-2">
          {t.admin.testSectionEmail}
        </h2>
        <p className="font-mono text-[11px] text-[#666] mb-3">
          {t.admin.testEmailHint}
        </p>
        {emailResult === 'ok' && (
          <p className="font-mono text-[11px] text-[#4ade80] mb-3">{t.admin.testEmailSent}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => sendTestEmail('welcome')}
            disabled={!!emailSending}
            className="font-mono text-[10px] tracking-[0.2em] uppercase px-3 py-2 border border-[#2a2a2a] text-[#e8e4dc] hover:border-[#e8c84a] hover:text-[#e8c84a] disabled:opacity-50 transition-colors"
            style={{ borderRadius: 0 }}
          >
            {emailSending === 'welcome' ? '…' : t.admin.testEmailWelcome}
          </button>
          <button
            type="button"
            onClick={() => sendTestEmail('reminder')}
            disabled={!!emailSending}
            className="font-mono text-[10px] tracking-[0.2em] uppercase px-3 py-2 border border-[#2a2a2a] text-[#e8e4dc] hover:border-[#e8c84a] hover:text-[#e8c84a] disabled:opacity-50 transition-colors"
            style={{ borderRadius: 0 }}
          >
            {emailSending === 'reminder' ? '…' : t.admin.testEmailReminder}
          </button>
          <button
            type="button"
            onClick={() => sendTestEmail('waitlist_promotion')}
            disabled={!!emailSending}
            className="font-mono text-[10px] tracking-[0.2em] uppercase px-3 py-2 border border-[#2a2a2a] text-[#e8e4dc] hover:border-[#e8c84a] hover:text-[#e8c84a] disabled:opacity-50 transition-colors"
            style={{ borderRadius: 0 }}
          >
            {emailSending === 'waitlist_promotion' ? '…' : t.admin.testEmailWaitlist}
          </button>
          <button
            type="button"
            onClick={() => sendTestEmail('post_event_rating')}
            disabled={!!emailSending}
            className="font-mono text-[10px] tracking-[0.2em] uppercase px-3 py-2 border border-[#2a2a2a] text-[#e8e4dc] hover:border-[#e8c84a] hover:text-[#e8c84a] disabled:opacity-50 transition-colors"
            style={{ borderRadius: 0 }}
          >
            {emailSending === 'post_event_rating' ? '…' : t.admin.testEmailPostRating}
          </button>
        </div>
      </div>
    </div>
  );
}
