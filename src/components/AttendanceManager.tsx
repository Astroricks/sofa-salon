'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { seatKeyToDisplayLabel } from '@/lib/furniture';

interface ReservationRow {
  id: string;
  seat_key: string;
  user_id: string;
  is_ghost?: boolean;
  attended?: boolean | null;
  profiles: { display_name: string | null } | null;
}

interface Props {
  screeningId: string;
  reservations: ReservationRow[];
  labels: { attended: string; noShow: string; unset: string; title: string; seatsCount: string };
}

/** One row per user; setting attended updates all that user's seats and profile once. */
export default function AttendanceManager({
  screeningId,
  reservations,
  labels,
}: Props) {
  const router = useRouter();
  const [updating, setUpdating] = useState<Record<string, boolean>>({});

  const nonGhost = reservations.filter((r) => !r.is_ghost);
  const byUser = useMemo(() => {
    const map = new Map<
      string,
      { displayName: string; seatKeys: string[]; attended: boolean | null }
    >();
    for (const r of nonGhost) {
      const existing = map.get(r.user_id);
      const attended = r.attended ?? null;
      if (existing) {
        existing.seatKeys.push(r.seat_key);
        if (attended === true) existing.attended = true;
        else if (attended === false) existing.attended = false;
      } else {
        map.set(r.user_id, {
          displayName: r.profiles?.display_name ?? '—',
          seatKeys: [r.seat_key],
          attended,
        });
      }
    }
    for (const row of Array.from(map.values())) {
      row.seatKeys.sort();
    }
    return map;
  }, [nonGhost]);

  const updateAttended = async (userId: string, attended: boolean | null) => {
    setUpdating((prev) => ({ ...prev, [userId]: true }));
    const res = await fetch(`/api/admin/screenings/${screeningId}/attendance`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, attended }),
    });
    setUpdating((prev) => ({ ...prev, [userId]: false }));
    if (res.ok) router.refresh();
  };

  if (byUser.size === 0) return null;

  return (
    <div className="mb-6 p-4 border border-[#2a2a2a] bg-[#161616]" style={{ borderRadius: 0 }}>
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#e8c84a] mb-3">
        {labels.title}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full font-mono text-[12px]">
          <thead>
            <tr className="text-left text-[#888888] border-b border-[#2a2a2a]">
              <th className="py-2 pr-4">#</th>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Seats</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(byUser.entries()).map(([userId, row], i) => (
              <tr key={userId} className="border-b border-[#2a2a2a] last:border-0">
                <td className="py-2 pr-4 text-[#666]">{i + 1}</td>
                <td className="py-2 pr-4 text-[#e8e4dc]">{row.displayName}</td>
                <td className="py-2 pr-4 text-[#888888]">
                  {row.seatKeys.length > 1
                    ? labels.seatsCount.replace('{n}', String(row.seatKeys.length))
                    : seatKeyToDisplayLabel(row.seatKeys[0])}
                </td>
                <td className="py-2">
                  <select
                    value={
                      row.attended === true ? 'yes' : row.attended === false ? 'no' : ''
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      updateAttended(
                        userId,
                        v === 'yes' ? true : v === 'no' ? false : null
                      );
                    }}
                    disabled={updating[userId]}
                    className="bg-[#0f0f0f] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[11px] px-2 py-1"
                    style={{ borderRadius: 0 }}
                  >
                    <option value="">{labels.unset}</option>
                    <option value="yes">{labels.attended}</option>
                    <option value="no">{labels.noShow}</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
