'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AvatarSVG from '@/components/AvatarSVG';
import { jsonToConfig } from '@/lib/avatar';
import { seatKeyToDisplayLabel } from '@/lib/furniture';
import { useLocale } from '@/components/LocaleProvider';

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
  const { t } = useLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingSeatKey, setEditingSeatKey] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const startRename = (g: Ghost) => {
    setEditingSeatKey(g.seat_key);
    setEditName(g.ghost_name ?? '');
  };

  const saveRename = async (seatKey: string) => {
    const name = editName.trim();
    setEditingSeatKey(null);
    setError(null);
    const res = await fetch('/api/ghost', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ screeningId, seatKey, ghost_name: name || null }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? t.admin.ghostRenameFailed);
    }
  };

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
        setError((data as { error?: string }).error ?? t.admin.ghostAddFailed);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t.common.networkError);
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
      setError((data as { error?: string }).error ?? t.admin.ghostDeleteFailed);
    }
  };

  return (
    <div
      className="border border-[#2a2a2a] bg-[#1e1e1e] p-4"
      style={{ borderRadius: 0 }}
    >
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#444444] mb-3">
        {t.admin.ghostSeatsTitle}
      </p>
      <p className="font-mono text-[13px] text-[#888888] mb-3">
        {t.admin.ghostSeatsCount.replace('{n}', String(ghosts.length))}
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
        {loading ? t.admin.ghostAdding : t.admin.ghostAdd}
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
            {editingSeatKey === g.seat_key ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => saveRename(g.seat_key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveRename(g.seat_key);
                  if (e.key === 'Escape') {
                    setEditingSeatKey(null);
                    setEditName(g.ghost_name ?? '');
                  }
                }}
                autoFocus
                className="flex-1 min-w-0 bg-[#161616] border border-[#e8c84a] text-[#e8e4dc] px-2 py-1 text-[13px] outline-none placeholder:text-[#555]"
                style={{ borderRadius: 0 }}
                placeholder={t.admin.ghostNamePlaceholder}
              />
            ) : (
              <>
                <span className="text-[#888888] flex-1 truncate">
                  {g.ghost_name ?? '—'}
                </span>
                <button
                  type="button"
                  onClick={() => startRename(g)}
                  className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] hover:text-[#e8c84a]"
                  style={{ borderRadius: 0 }}
                  title={t.admin.renameGhost}
                >
                  {t.admin.renameGhost}
                </button>
              </>
            )}
            <span className="text-[#444444] text-[10px] truncate max-w-[80px]">
              {seatKeyToDisplayLabel(g.seat_key)}
            </span>
            <button
              type="button"
              onClick={() => removeGhost(g.seat_key)}
              disabled={editingSeatKey === g.seat_key}
              className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#f87171] hover:opacity-85 disabled:opacity-50"
              style={{ borderRadius: 0 }}
            >
              {t.admin.ghostRemove}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
