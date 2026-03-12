'use client';

import Link from 'next/link';
import { useState } from 'react';
import AvatarSVG from '@/components/AvatarSVG';
import { jsonToConfig } from '@/lib/avatar';

interface Screening {
  id: string;
  title: string;
  screening_at: string;
  waitlist_mode: string;
  rooms: { name: string } | { name: string }[] | null;
}

interface WaitlistEntry {
  id: string;
  position: number;
  profiles: { display_name: string; wechat_id: string | null; avatar_config: unknown };
}

interface Props {
  screenings: Screening[];
}

export default function AdminEvents({ screenings }: Props) {
  const [waitlistByScreening, setWaitlistByScreening] = useState<
    Record<string, WaitlistEntry[]>
  >({});
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});

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

  return (
    <div className="space-y-6">
      {screenings.map((s) => {
        const date = new Date(s.screening_at);
        const dateStr = date.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        });
        const timeStr = date.toLocaleTimeString('en-GB', {
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
                className="font-serif text-lg text-[#e8c84a] hover:underline"
              >
                {s.title}
              </Link>
              <span className="font-mono text-[13px] text-[#888888]">
                {dateStr} · {timeStr}
              </span>
              {(() => {
                const r = s.rooms;
                const name = Array.isArray(r) ? r[0]?.name : r?.name;
                return name ? (
                  <span className="font-mono text-[13px] text-[#444444]">{name}</span>
                ) : null;
              })()}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link
                href={`/admin/screenings/${s.id}`}
                className="font-mono text-[10px] tracking-[0.2em] uppercase px-3 py-2 border border-[#e8c84a] text-[#e8c84a] hover:opacity-85 transition-opacity"
                style={{ borderRadius: 0 }}
              >
                Edit
              </Link>
              <Link
                href={`/screening/${s.id}`}
                className="font-mono text-[10px] tracking-[0.2em] uppercase px-3 py-2 border border-[#2a2a2a] text-[#888888] hover:border-[#e8c84a] hover:text-[#e8c84a] transition-colors"
                style={{ borderRadius: 0 }}
              >
                View seat map
              </Link>
              {isManual && (
                <button
                  type="button"
                  onClick={() => loadWaitlist(s.id)}
                  className="font-mono text-[10px] tracking-[0.2em] uppercase px-3 py-2 border border-[#c084fc] text-[#c084fc] hover:opacity-85 transition-opacity"
                  style={{ borderRadius: 0 }}
                >
                  Load waitlist
                </button>
              )}
            </div>
            {isManual && loaded[s.id] && (
              <div className="mt-4 border-t border-[#2a2a2a] pt-4">
                <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#c084fc] mb-2">
                  Waiting · {waitlist.length} people
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
                    <span className="font-mono text-[13px] text-[#e8e4dc] flex-1">
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
      })}
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

  return (
    <div className="flex items-center gap-1">
      <input
        type="text"
        placeholder="Seat key"
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
        Promote
      </button>
    </div>
  );
}
