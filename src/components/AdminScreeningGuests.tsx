'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { profileMatchContactLine } from '@/lib/admin-screening-reservations';
import {
  formatContactForAdminList,
  getProfileContact,
  type ContactPlatform,
} from '@/lib/contact-platform';
import { reservationIsNoShow } from '@/lib/attendance';
import { RETROACTIVE_SEAT_PREFIX } from '@/lib/historical-catalog';
import { seatKeyToDisplayLabel } from '@/lib/furniture';

interface ReservationRow {
  id: string;
  seat_key: string;
  user_id: string;
  is_ghost?: boolean;
  attended?: boolean | null;
  profiles: {
    display_name: string | null;
    wechat_id?: string | null;
    contact_platform?: string | null;
    contact_id?: string | null;
  } | null;
}

type Candidate = {
  id: string;
  display_name: string;
  contact_platform?: string | null;
  contact_id?: string | null;
  wechat_id?: string | null;
};

interface Labels {
  title: string;
  addGuest: string;
  displayNamePlaceholder: string;
  addButton: string;
  displayNameNotFound: string;
  displayNameAmbiguous: string;
  pickCandidate: string;
  userMissingWechat: string;
  userAlreadyReserved: string;
  noSeatsAvailable: string;
  remove: string;
  guestsEmpty: string;
  removalMessageLabel: string;
  removalMessagePlaceholder: string;
  confirmRemove: string;
  cancel: string;
  noShow: string;
  noShowColumn: string;
  seatsCount: string;
  catalogSeat: string;
  pastHint?: string;
  removePast: string;
  saveFailed: string;
  reservationsNotUpdated: string;
  actionFailed: string;
  contactLineLabels: Record<ContactPlatform, string>;
}

interface Props {
  screeningId: string;
  reservations: ReservationRow[];
  labels: Labels;
  /** Past screenings: catalog attendance, no removal email. */
  isPast?: boolean;
}

function formatGuestSeats(
  seatKeys: string[],
  labels: Pick<Labels, 'seatsCount' | 'catalogSeat'>
): string {
  if (seatKeys.length > 1) {
    return labels.seatsCount.replace('{n}', String(seatKeys.length));
  }
  const key = seatKeys[0];
  if (key?.startsWith(`${RETROACTIVE_SEAT_PREFIX}-`)) {
    return labels.catalogSeat;
  }
  return seatKeyToDisplayLabel(key);
}

export default function AdminScreeningGuests({
  screeningId,
  reservations,
  labels,
  isPast = false,
}: Props) {
  const router = useRouter();
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [removalMessage, setRemovalMessage] = useState('');
  const [removing, setRemoving] = useState(false);

  const nonGhost = reservations.filter((r) => !r.is_ghost);
  const byUser = useMemo(() => {
    const map = new Map<
      string,
      {
        displayName: string;
        contactLine: string;
        seatKeys: string[];
        isNoShow: boolean;
      }
    >();
    for (const r of nonGhost) {
      const existing = map.get(r.user_id);
      const seatNoShow = reservationIsNoShow(r.attended);
      const contact = getProfileContact(r.profiles ?? {});
      const contactLine = formatContactForAdminList(
        contact.platform,
        contact.id,
        labels.contactLineLabels
      );
      if (existing) {
        existing.seatKeys.push(r.seat_key);
        if (seatNoShow) existing.isNoShow = true;
      } else {
        map.set(r.user_id, {
          displayName: r.profiles?.display_name ?? '—',
          contactLine,
          seatKeys: [r.seat_key],
          isNoShow: seatNoShow,
        });
      }
    }
    for (const row of Array.from(map.values())) {
      row.seatKeys.sort();
    }
    return map;
  }, [nonGhost, labels.contactLineLabels]);

  const mapApiError = (data: { error?: string; code?: string }) => {
    switch (data.code) {
      case 'display_name_not_found':
        return labels.displayNameNotFound;
      case 'display_name_ambiguous':
        return labels.displayNameAmbiguous;
      case 'user_missing_wechat':
        return labels.userMissingWechat;
      case 'user_already_reserved':
        return labels.userAlreadyReserved;
      case 'no_seats_available':
        return labels.noSeatsAvailable;
      case 'reservations_not_updated':
        return labels.reservationsNotUpdated;
      default:
        return data.error ?? labels.actionFailed;
    }
  };

  const addGuest = async (userId?: string) => {
    setActionError(null);
    setAdding(true);
    try {
      const res = await fetch(`/api/admin/screenings/${screeningId}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          userId
            ? { userId }
            : { displayName: displayNameInput.trim() }
        ),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        candidates?: Candidate[];
      };
      if (res.status === 409 && data.candidates?.length) {
        setCandidates(data.candidates);
        setActionError(labels.displayNameAmbiguous);
        return;
      }
      if (!res.ok) {
        setCandidates(null);
        setActionError(mapApiError(data));
        return;
      }
      setDisplayNameInput('');
      setCandidates(null);
      router.refresh();
    } catch {
      setActionError(labels.actionFailed);
    } finally {
      setAdding(false);
    }
  };

  const updateNoShow = async (userId: string, noShow: boolean) => {
    setActionError(null);
    setUpdating((prev) => ({ ...prev, [userId]: true }));
    try {
      const res = await fetch(`/api/admin/screenings/${screeningId}/attendance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, noShow }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          code?: string;
        };
        setActionError(mapApiError(data));
        return;
      }
      router.refresh();
    } catch {
      setActionError(labels.saveFailed);
    } finally {
      setUpdating((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const removeGuest = async (userId: string) => {
    setActionError(null);
    setRemoving(true);
    try {
      const res = await fetch(`/api/admin/screenings/${screeningId}/reservations`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, message: removalMessage }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
      if (!res.ok) {
        setActionError(mapApiError(data));
        return;
      }
      setRemovingUserId(null);
      setRemovalMessage('');
      router.refresh();
    } catch {
      setActionError(labels.actionFailed);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="mb-6 p-4 border border-[#2a2a2a] bg-[#161616]" style={{ borderRadius: 0 }}>
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#e8c84a] mb-3">
        {labels.title}
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          value={displayNameInput}
          onChange={(e) => {
            setDisplayNameInput(e.target.value);
            setCandidates(null);
            setActionError(null);
          }}
          placeholder={labels.displayNamePlaceholder}
          className="flex-1 min-w-[160px] bg-[#0f0f0f] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[11px] px-2 py-1.5"
          style={{ borderRadius: 0 }}
          disabled={adding}
        />
        <button
          type="button"
          onClick={() => addGuest()}
          disabled={adding || !displayNameInput.trim()}
          className="font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 border border-[#e8c84a] text-[#e8c84a] hover:bg-[#e8c84a] hover:text-[#0f0f0f] disabled:opacity-40"
          style={{ borderRadius: 0 }}
        >
          {labels.addButton}
        </button>
      </div>
      <p className="font-mono text-[10px] text-[#666] mb-3">
        {isPast && labels.pastHint ? labels.pastHint : labels.addGuest}
      </p>

      {candidates && candidates.length > 0 ? (
        <div className="mb-4 p-3 border border-[#3a3a20] bg-[#121210]">
          <p className="font-mono text-[11px] text-[#e8c84a] mb-2">{labels.pickCandidate}</p>
          <ul className="space-y-2">
            {candidates.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => addGuest(c.id)}
                  disabled={adding}
                  className="font-mono text-[11px] text-left text-[#e8e4dc] hover:text-[#e8c84a] disabled:opacity-40"
                >
                  {c.display_name}
                  <span className="text-[#888]">
                    {' '}
                    · {profileMatchContactLine(c, labels.contactLineLabels)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {actionError ? (
        <p className="font-mono text-[11px] text-[#e85a5a] mb-3" role="alert">
          {actionError}
        </p>
      ) : null}

      {byUser.size > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-[12px]">
            <thead>
              <tr className="text-left text-[#888888] border-b border-[#2a2a2a]">
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Seats</th>
                <th className="py-2 pr-4">{labels.noShowColumn}</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {Array.from(byUser.entries()).map(([userId, row], i) => (
                <tr key={userId} className="border-b border-[#2a2a2a] last:border-0 align-top">
                  <td className="py-2 pr-4 text-[#666]">{i + 1}</td>
                  <td className="py-2 pr-4 text-[#e8e4dc]">
                    {row.displayName}
                    {row.contactLine !== '—' ? (
                      <span className="block text-[10px] text-[#666]">{row.contactLine}</span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-4 text-[#888888]">
                    {formatGuestSeats(row.seatKeys, labels)}
                  </td>
                  <td className="py-2 pr-4">
                    <label className="inline-flex items-center gap-2 cursor-pointer font-mono text-[11px] text-[#e8e4dc]">
                      <input
                        type="checkbox"
                        checked={row.isNoShow}
                        onChange={(e) => updateNoShow(userId, e.target.checked)}
                        disabled={updating[userId]}
                        className="accent-[#e8c84a]"
                      />
                      <span>{labels.noShow}</span>
                    </label>
                  </td>
                  <td className="py-2">
                    {removingUserId === userId && !isPast ? (
                      <div className="min-w-[200px]">
                        <p className="text-[10px] text-[#888] mb-1">{labels.removalMessageLabel}</p>
                        <textarea
                          value={removalMessage}
                          onChange={(e) => setRemovalMessage(e.target.value)}
                          placeholder={labels.removalMessagePlaceholder}
                          rows={3}
                          maxLength={2000}
                          className="w-full bg-[#0f0f0f] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[11px] px-2 py-1 mb-2"
                          style={{ borderRadius: 0 }}
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => removeGuest(userId)}
                            disabled={removing}
                            className="font-mono text-[10px] uppercase px-2 py-1 border border-[#e85a5a] text-[#e85a5a] hover:bg-[#e85a5a] hover:text-[#0f0f0f] disabled:opacity-40"
                            style={{ borderRadius: 0 }}
                          >
                            {labels.confirmRemove}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRemovingUserId(null);
                              setRemovalMessage('');
                            }}
                            disabled={removing}
                            className="font-mono text-[10px] uppercase px-2 py-1 border border-[#2a2a2a] text-[#888] hover:text-[#e8e4dc]"
                            style={{ borderRadius: 0 }}
                          >
                            {labels.cancel}
                          </button>
                        </div>
                      </div>
                    ) : removingUserId === userId && isPast ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => removeGuest(userId)}
                          disabled={removing}
                          className="font-mono text-[10px] uppercase px-2 py-1 border border-[#e85a5a] text-[#e85a5a] hover:bg-[#e85a5a] hover:text-[#0f0f0f] disabled:opacity-40"
                          style={{ borderRadius: 0 }}
                        >
                          {labels.removePast}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRemovingUserId(null)}
                          disabled={removing}
                          className="font-mono text-[10px] uppercase px-2 py-1 border border-[#2a2a2a] text-[#888] hover:text-[#e8e4dc]"
                          style={{ borderRadius: 0 }}
                        >
                          {labels.cancel}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (isPast) {
                            setRemovingUserId(userId);
                            setRemovalMessage('');
                          } else {
                            setRemovingUserId(userId);
                            setRemovalMessage('');
                          }
                          setActionError(null);
                        }}
                        className="font-mono text-[10px] uppercase px-2 py-1 border border-[#2a2a2a] text-[#888] hover:border-[#e85a5a] hover:text-[#e85a5a]"
                        style={{ borderRadius: 0 }}
                      >
                        {isPast ? labels.removePast : labels.remove}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="font-mono text-[11px] text-[#666]">{labels.guestsEmpty}</p>
      )}
    </div>
  );
}
