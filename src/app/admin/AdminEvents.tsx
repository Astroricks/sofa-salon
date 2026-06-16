'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AvatarSVG from '@/components/AvatarSVG';
import { jsonToConfig } from '@/lib/avatar';
import { useLocale } from '@/components/LocaleProvider';
import { formatScreeningInVenue } from '@/lib/screening-datetime';

interface Screening {
  id: string;
  title: string;
  screening_at: string;
  waitlist_mode: string;
  room_id: string | null;
  rooms: { name: string } | { name: string }[] | null;
}

interface WaitlistEntry {
  id: string;
  position: number;
  profiles: { display_name: string; wechat_id: string | null; avatar_config: unknown };
}

interface Props {
  futureScreenings: Screening[];
  initialPastScreenings: Screening[];
  pastTotalCount: number;
  pastPageSize: number;
}

export default function AdminEvents({
  futureScreenings,
  initialPastScreenings,
  pastTotalCount,
  pastPageSize,
}: Props) {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [extraPastScreenings, setExtraPastScreenings] = useState<Screening[]>([]);
  const [loadingMorePast, setLoadingMorePast] = useState(false);
  const [loadMorePastError, setLoadMorePastError] = useState<string | null>(null);

  const pastScreenings = useMemo(
    () => [...initialPastScreenings, ...extraPastScreenings],
    [initialPastScreenings, extraPastScreenings]
  );
  const pastShown = pastScreenings.length;
  const hasMorePast = pastShown < pastTotalCount;

  const [waitlistByScreening, setWaitlistByScreening] = useState<
    Record<string, WaitlistEntry[]>
  >({});
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [deleteScreeningId, setDeleteScreeningId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteAffectedCount, setDeleteAffectedCount] = useState<number | null>(null);
  const [deleteIsPast, setDeleteIsPast] = useState(false);

  const requestDelete = async (screeningId: string, isPastEvent: boolean) => {
    setDeleteLoading(true);
    const res = await fetch(`/api/screening/${screeningId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    setDeleteLoading(false);
    if (!res.ok) {
      return;
    }
    if (data.hasRegistrations === true) {
      setDeleteScreeningId(screeningId);
      setDeleteAffectedCount(data.count ?? 0);
      setDeleteIsPast(isPastEvent || data.isPastScreening === true);
      setDeleteConfirmOpen(true);
      return;
    }
    router.refresh();
  };

  const confirmDelete = async () => {
    if (!deleteScreeningId) return;
    setDeleteLoading(true);
    const res = await fetch(`/api/screening/${deleteScreeningId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true }),
    });
    setDeleteLoading(false);
    setDeleteConfirmOpen(false);
    setDeleteScreeningId(null);
    setDeleteIsPast(false);
    if (!res.ok) return;
    router.refresh();
  };

  const loadMorePast = async () => {
    setLoadMorePastError(null);
    setLoadingMorePast(true);
    try {
      const res = await fetch(
        `/api/admin/screenings?past=1&offset=${pastShown}&limit=${pastPageSize}`
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        screenings?: Screening[];
      };
      if (!res.ok) {
        setLoadMorePastError(data.error ?? t.admin.loadMorePastFailed);
        return;
      }
      setExtraPastScreenings((prev) => [...prev, ...(data.screenings ?? [])]);
    } catch {
      setLoadMorePastError(t.admin.loadMorePastFailed);
    } finally {
      setLoadingMorePast(false);
    }
  };

  const loadWaitlist = async (screeningId: string) => {
    if (loaded[screeningId]) return;
    const res = await fetch(
      `/api/admin/waitlist?sid=${screeningId}`
    );
    if (!res.ok) return;
    const data = await res.json();
    setWaitlistByScreening((prev) => ({
      ...prev,
      [screeningId]: data.waitlist ?? [],
    }));
    setLoaded((prev) => ({ ...prev, [screeningId]: true }));
  };

  const renderEventCard = (s: Screening, isPast: boolean) => {
    const dateLocale = locale === 'zh' ? 'zh-CN' : 'en-GB';
    const dateStr = formatScreeningInVenue(s.screening_at, dateLocale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    const timeStr = formatScreeningInVenue(s.screening_at, dateLocale, {
      hour: '2-digit',
      minute: '2-digit',
    });
    const isManual = s.waitlist_mode === 'manual';
    const waitlist = waitlistByScreening[s.id] ?? [];

    return (
      <div
        key={s.id}
        className="border border-[#2a2a2a] bg-[#161616] p-4"
        style={{ borderRadius: 0 }}
      >
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Link
            href={`/screening/${s.id}`}
            className="font-pixel-cjk text-lg text-[#e8c84a] hover:underline"
          >
            {s.title}
          </Link>
          <span className="font-mono text-[10px] text-[#888888]">
            {dateStr} · {timeStr}
          </span>
          {(() => {
            const r = s.rooms;
            const name = Array.isArray(r) ? r[0]?.name : r?.name;
            return name ? (
              <span className="font-mono text-[10px] text-[#444444]">{name}</span>
            ) : null;
          })()}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link
            href={`/admin/screenings/${s.id}`}
            className="font-mono text-[10px] tracking-[0.2em] uppercase px-3 py-2 border border-[#e8c84a] text-[#e8c84a] hover:opacity-85 transition-opacity"
            style={{ borderRadius: 0 }}
          >
            {t.admin.edit}
          </Link>
          {s.room_id ? (
            <Link
              href={`/screening/${s.id}`}
              className="font-mono text-[10px] tracking-[0.2em] uppercase px-3 py-2 border border-[#2a2a2a] text-[#888888] hover:border-[#e8c84a] hover:text-[#e8c84a] transition-colors"
              style={{ borderRadius: 0 }}
            >
              {t.admin.viewSeatMap}
            </Link>
          ) : (
            <Link
              href={`/admin/screenings/${s.id}`}
              className="font-mono text-[10px] tracking-[0.2em] uppercase px-3 py-2 border border-[#2a2a2a] text-[#888888] hover:border-[#e8c84a] hover:text-[#e8c84a] transition-colors"
              style={{ borderRadius: 0 }}
            >
              {t.admin.manageGuests}
            </Link>
          )}
          <button
            type="button"
            onClick={() => requestDelete(s.id, isPast)}
            disabled={deleteLoading}
            className="font-mono text-[10px] tracking-[0.2em] uppercase px-3 py-2 border border-[#f87171] text-[#f87171] hover:bg-[#f87171]/10 disabled:opacity-50 transition-opacity"
            style={{ borderRadius: 0 }}
          >
            {deleteLoading ? '…' : t.admin.deleteEvent}
          </button>
          {!isPast && isManual && (
                <button
                  type="button"
                  onClick={() => loadWaitlist(s.id)}
                  className="font-mono text-[10px] tracking-[0.2em] uppercase px-3 py-2 border border-[#c084fc] text-[#c084fc] hover:opacity-85 transition-opacity"
                  style={{ borderRadius: 0 }}
                >
                  {t.admin.loadWaitlist}
                </button>
              )}
            </div>
            {!isPast && isManual && loaded[s.id] && (
              <div className="mt-4 border-t border-[#2a2a2a] pt-4">
                <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#c084fc] mb-2">
                  {t.admin.waitingPeople.replace('{n}', String(waitlist.length))}
                </p>
                {waitlist.map((entry, i) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 py-2 border-b border-[#2a2a2a] last:border-0"
                  >
                    <span className="font-mono text-[13px] text-[#444444] w-6">
                      {i + 1}
                    </span>
                    <AvatarSVG
                      config={jsonToConfig(entry.profiles.avatar_config)}
                      size={32}
                      pose="stand"
                    />
                    <span className="font-pixel-cjk text-[13px] text-[#e8e4dc] flex-1">
                      {entry.profiles.display_name}
                    </span>
                    <span className="font-mono text-[13px] text-[#444444]">
                      {entry.profiles.wechat_id ?? '—'}
                    </span>
                    <PromoteButton
                      screeningId={s.id}
                      waitlistId={entry.id}
                      onDone={() => loadWaitlist(s.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
    );
  };

  return (
    <div className="space-y-8">
      {futureScreenings.length > 0 && (
        <section>
          <h2 className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#e8c84a] mb-4">
            {t.admin.futureEvents}
          </h2>
          <div className="space-y-6">
            {futureScreenings.map((s) => renderEventCard(s, false))}
          </div>
        </section>
      )}
      {(pastTotalCount > 0 || pastScreenings.length > 0) && (
        <section>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-4">
            <h2 className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888]">
              {t.admin.historyEvents}
            </h2>
            {pastTotalCount > 0 ? (
              <span className="font-mono text-[10px] text-[#555]">
                {t.admin.pastEventsCount
                  .replace('{shown}', String(pastShown))
                  .replace('{total}', String(pastTotalCount))}
              </span>
            ) : null}
          </div>
          <div className="space-y-6">
            {pastScreenings.map((s) => renderEventCard(s, true))}
          </div>
          {hasMorePast ? (
            <div className="mt-4">
              <button
                type="button"
                onClick={loadMorePast}
                disabled={loadingMorePast}
                className="font-mono text-[10px] tracking-[0.2em] uppercase px-4 py-2 border border-[#2a2a2a] text-[#888888] hover:border-[#e8c84a] hover:text-[#e8c84a] disabled:opacity-50 transition-colors"
                style={{ borderRadius: 0 }}
              >
                {loadingMorePast ? '…' : t.admin.loadMorePast}
              </button>
              {loadMorePastError ? (
                <p className="font-mono text-[11px] text-[#f87171] mt-2" role="alert">
                  {loadMorePastError}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      )}
      {futureScreenings.length === 0 && pastTotalCount === 0 && (
        <p className="font-mono text-[13px] text-[#666]">{t.admin.noEventsYet}</p>
      )}

      {deleteConfirmOpen && deleteScreeningId && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-event-title"
        >
          <div
            className="bg-[#0f0f0f] border border-[#2a2a2a] p-6 w-full max-w-[360px]"
            style={{ borderRadius: 0 }}
          >
            <h2 id="delete-event-title" className="font-mono text-[13px] text-[#e8c84a] mb-2">
              {t.admin.deleteEvent}
            </h2>
            <p className="font-mono text-[12px] text-[#e8e4dc] mb-4">
              {deleteIsPast ? t.admin.deletePastEventConfirmMessage : t.admin.deleteEventConfirmMessage}
              {deleteAffectedCount != null && deleteAffectedCount > 0 && (
                <span className="block mt-2 text-[#888]">
                  {(deleteIsPast ? t.admin.deletePastEventNotifyCount : t.admin.deleteEventNotifyCount).replace(
                    '{n}',
                    String(deleteAffectedCount)
                  )}
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setDeleteScreeningId(null);
                  setDeleteIsPast(false);
                }}
                disabled={deleteLoading}
                className="flex-1 border border-[#2a2a2a] text-[#888] font-mono text-[10px] tracking-[0.2em] uppercase py-3 hover:border-[#e8c84a] hover:text-[#e8c84a] transition-colors"
                style={{ borderRadius: 0 }}
              >
                {t.screening.cancel}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteLoading}
                className="flex-1 border border-[#f87171] text-[#f87171] font-mono text-[10px] tracking-[0.2em] uppercase py-3 hover:bg-[#f87171]/10 transition-colors disabled:opacity-50"
                style={{ borderRadius: 0 }}
              >
                {deleteLoading
                  ? '…'
                  : deleteIsPast
                    ? t.admin.deletePastEventConfirmButton
                    : t.admin.deleteEventConfirmButton}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PromoteButton({
  screeningId,
  waitlistId,
  onDone,
}: {
  screeningId: string;
  waitlistId: string;
  onDone: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [seatKey, setSeatKey] = useState('');

  const promote = async () => {
    if (!seatKey.trim()) return;
    setLoading(true);
    await fetch('/api/waitlist/promote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        screeningId,
        waitlistId,
        seatKey: seatKey.trim(),
      }),
    });
    setLoading(false);
    setSeatKey('');
    onDone();
  };

  const { t } = useLocale();
  return (
    <div className="flex items-center gap-1">
      <input
        type="text"
        placeholder={t.admin.seatKeyPlaceholder}
        value={seatKey}
        onChange={(e) => setSeatKey(e.target.value)}
        className="w-24 bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] px-2 py-1 outline-none focus:border-[#e8c84a] placeholder:text-[#444444]"
        style={{ borderRadius: 0 }}
      />
      <button
        type="button"
        onClick={promote}
        disabled={loading || !seatKey.trim()}
        className="font-mono text-[10px] tracking-[0.2em] uppercase px-2 py-2 border border-[#c084fc] text-[#c084fc] hover:opacity-85 disabled:opacity-50 transition-opacity"
        style={{ borderRadius: 0 }}
      >
        {t.admin.promote}
      </button>
    </div>
  );
}
