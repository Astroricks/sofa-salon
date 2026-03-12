'use client';

import { useState } from 'react';
import { useLocale } from '@/components/LocaleProvider';

export interface PastScreening {
  screeningId: string;
  title: string;
  screeningAt: string;
  rating: number | null;
}

interface Props {
  items: PastScreening[];
}

function StarRow({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-0.5" role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          className="text-lg leading-none p-0.5 min-w-[28px] min-h-[28px] disabled:opacity-60 transition-opacity focus:outline-none focus:ring-1 focus:ring-[#e8c84a]"
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
        >
          <span className={star <= value ? 'text-[#e8c84a]' : 'text-[#444444]'}>
            {star <= value ? '★' : '☆'}
          </span>
        </button>
      ))}
    </div>
  );
}

export default function WatchHistory({ items }: Props) {
  const { t } = useLocale();
  const [localRatings, setLocalRatings] = useState<Record<string, number>>(() => {
    const o: Record<string, number> = {};
    items.forEach((i) => {
      if (i.rating != null) o[i.screeningId] = i.rating;
    });
    return o;
  });
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, number>>({});

  const submitRating = async (screeningId: string, rating: number) => {
    setSubmitting(screeningId);
    try {
      const res = await fetch('/api/rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screeningId, rating }),
      });
      if (res.ok) {
        setLocalRatings((prev) => ({ ...prev, [screeningId]: rating }));
        setDraft((prev) => {
          const next = { ...prev };
          delete next[screeningId];
          return next;
        });
      }
    } finally {
      setSubmitting(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="border border-[#2a2a2a] p-4 mt-6" style={{ borderRadius: 0 }}>
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#e8c84a] mb-2">
          {t.profile.watchHistory}
        </p>
        <p className="font-mono text-[13px] text-[#666]">
          {t.profile.watchHistoryCount} 0 {t.profile.screenings}. {t.profile.noWatchHistory}
        </p>
      </div>
    );
  }

  return (
    <div className="border border-[#2a2a2a] p-4 mt-6" style={{ borderRadius: 0 }}>
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#e8c84a] mb-2">
        {t.profile.watchHistory}
      </p>
      <p className="font-mono text-[13px] text-[#888888] mb-4">
        {t.profile.watchHistoryCount} {items.length} {t.profile.screenings}
      </p>
      <ul className="space-y-4">
        {items.map((item) => {
          const current = localRatings[item.screeningId] ?? item.rating ?? null;
          const editing = draft[item.screeningId] ?? current;
          const isEditing = current == null && (draft[item.screeningId] != null || editing != null);
          return (
            <li
              key={item.screeningId}
              className="border-b border-[#2a2a2a] pb-4 last:border-0 last:pb-0"
            >
              <p className="font-mono text-[13px] text-[#e8e4dc]">{item.title}</p>
              <p className="font-mono text-[10px] text-[#666] mt-0.5">
                {new Date(item.screeningAt).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
              <p className="font-mono text-[10px] tracking-wider text-[#888888] mt-2">
                {t.profile.rateFilmQuality}
              </p>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <StarRow
                  value={editing ?? 0}
                  onChange={(v) => setDraft((prev) => ({ ...prev, [item.screeningId]: v }))}
                  disabled={submitting === item.screeningId}
                />
                {isEditing && (
                  <button
                    type="button"
                    disabled={submitting === item.screeningId || (editing ?? 0) < 1}
                    onClick={() => submitRating(item.screeningId, editing ?? 0)}
                    className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#e8c84a] hover:underline disabled:opacity-50"
                  >
                    {t.profile.submitRating}
                  </button>
                )}
                {current != null && (
                  <span className="font-mono text-[10px] text-[#666]">
                    {t.profile.yourRating}: {current}/5
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
