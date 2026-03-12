'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AvatarSVG from '@/components/AvatarSVG';
import { jsonToConfig } from '@/lib/avatar';

interface Ghost {
  seat_key: string;
  ghost_name: string | null;
  ghost_avatar: unknown;
}

interface Props {
  screeningId: string;
  ghosts: Ghost[];
}

export default function GhostSeatManager({ screeningId, ghosts }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addGhost = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/ghost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screeningId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.refresh();
      } else {
        setError((data as { error?: string }).error ?? `Request failed (${res.status})`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const removeGhost = async (seatKey: string) => {
    setError(null);
    const res = await fetch('/api/ghost', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ screeningId, seatKey }),
    });
    if (res.ok) router.refresh();
    else {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? `Delete failed (${res.status})`);
    }
  };

  return (
    <div
      className="border border-[#2a2a2a] bg-[#1e1e1e] p-4"
      style={{ borderRadius: 0 }}
    >
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#444444] mb-3">
        GHOST SEATS 幽灵座位
      </p>
      <p className="font-mono text-[13px] text-[#888888] mb-3">
        {ghosts.length} / 3 ghost{ghosts.length !== 1 ? 's' : ''}
      </p>
      {error && (
        <p className="font-mono text-[11px] text-[#f87171] mb-2" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={addGhost}
        disabled={ghosts.length >= 3 || loading}
        className="font-mono text-[10px] tracking-[0.2em] uppercase border border-[#2a2a2a] text-[#888888] px-3 py-2 hover:border-[#e8c84a] hover:text-[#e8c84a] disabled:opacity-50 transition-colors mb-4"
        style={{ borderRadius: 0 }}
      >
        {loading ? 'Adding…' : 'Add ghost'}
      </button>
      <ul className="space-y-2">
        {ghosts.map((g) => (
          <li
            key={g.seat_key}
            className="flex items-center gap-3 font-mono text-[13px]"
          >
            <AvatarSVG
              config={jsonToConfig(g.ghost_avatar)}
              size={24}
              pose="sit"
            />
            <span className="text-[#888888] flex-1 truncate">
              {g.ghost_name ?? '—'}
            </span>
            <span className="text-[#444444] text-[10px] truncate max-w-[80px]">
              {g.seat_key}
            </span>
            <button
              type="button"
              onClick={() => removeGhost(g.seat_key)}
              className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#f87171] hover:opacity-85"
              style={{ borderRadius: 0 }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
