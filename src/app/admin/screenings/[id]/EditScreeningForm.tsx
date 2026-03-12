'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale } from '@/components/LocaleProvider';

interface Room {
  id: string;
  name: string;
}

interface ScreeningFormData {
  id: string;
  title: string;
  description: string;
  screening_at: string;
  room_id: string;
  squeeze_note: string;
  waitlist_mode: 'auto' | 'manual';
  is_active: boolean;
  year?: number;
  director?: string;
  duration_minutes?: number;
}

interface Props {
  screening: ScreeningFormData;
  rooms: Room[];
}

function toLocalDatetimeLocal(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

export default function EditScreeningForm({ screening, rooms }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(screening.title);
  const [description, setDescription] = useState(screening.description);
  const [screeningAt, setScreeningAt] = useState(toLocalDatetimeLocal(screening.screening_at));
  const [roomId, setRoomId] = useState(screening.room_id);
  const [squeezeNote, setSqueezeNote] = useState(screening.squeeze_note);
  const [waitlistMode, setWaitlistMode] = useState<'auto' | 'manual'>(screening.waitlist_mode);
  const [isActive, setIsActive] = useState(screening.is_active);
  const [year, setYear] = useState(screening.year != null ? String(screening.year) : '');
  const [director, setDirector] = useState(screening.director ?? '');
  const [durationMinutes, setDurationMinutes] = useState(
    screening.duration_minutes != null ? String(screening.duration_minutes) : ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !screeningAt) return;
    setLoading(true);
    setError('');
    const res = await fetch(`/api/screening/${screening.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        screening_at: new Date(screeningAt).toISOString(),
        room_id: roomId || null,
        squeeze_note: squeezeNote,
        waitlist_mode: waitlistMode,
        is_active: isActive,
        year: year ? parseInt(year, 10) : null,
        director: director || null,
        duration_minutes: durationMinutes ? parseInt(durationMinutes, 10) : null,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Update failed');
      return;
    }
    router.push('/admin');
    router.refresh();
  };

  const { t } = useLocale();
  return (
    <>
      <Link
        href="/admin"
        className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] hover:text-[#e8c84a] mb-6 inline-block transition-colors"
      >
        {t.admin.backToAdmin}
      </Link>
      <h1 className="font-serif text-2xl italic text-[#e8c84a] mb-6">Edit event</h1>
      {error && (
        <p className="font-mono text-[13px] text-[#f87171] mb-4">{error}</p>
      )}
      <form onSubmit={submit} className="space-y-6">
        <div>
          <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] px-4 py-3 min-h-[44px] outline-none focus:border-[#e8c84a] placeholder:text-[#444444]"
            placeholder="e.g. Chungking Express"
            required
            style={{ borderRadius: 0 }}
          />
        </div>
        <div>
          <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2">
            Date & time
          </label>
          <input
            type="datetime-local"
            value={screeningAt}
            onChange={(e) => setScreeningAt(e.target.value)}
            className="w-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] px-4 py-3 min-h-[44px] outline-none focus:border-[#e8c84a]"
            required
            style={{ borderRadius: 0 }}
          />
        </div>
        <div>
          <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2">
            Year (optional)
          </label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] px-4 py-3 min-h-[44px] outline-none focus:border-[#e8c84a] placeholder:text-[#444444]"
            placeholder="e.g. 1994"
            min="1900"
            max="2100"
            style={{ borderRadius: 0 }}
          />
        </div>
        <div>
          <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2">
            Director (optional)
          </label>
          <input
            type="text"
            value={director}
            onChange={(e) => setDirector(e.target.value)}
            className="w-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] px-4 py-3 min-h-[44px] outline-none focus:border-[#e8c84a] placeholder:text-[#444444]"
            placeholder="e.g. Wong Kar-wai"
            style={{ borderRadius: 0 }}
          />
        </div>
        <div>
          <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2">
            Duration in minutes (optional)
          </label>
          <input
            type="number"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            className="w-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] px-4 py-3 min-h-[44px] outline-none focus:border-[#e8c84a] placeholder:text-[#444444]"
            placeholder="e.g. 102"
            min="1"
            style={{ borderRadius: 0 }}
          />
        </div>
        <div>
          <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] px-4 py-3 min-h-[80px] outline-none focus:border-[#e8c84a] placeholder:text-[#444444]"
            placeholder="Film details, notes..."
            style={{ borderRadius: 0 }}
          />
        </div>
        <div>
          <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2">
            Room
          </label>
          <select
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="w-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] px-4 py-3 min-h-[44px] outline-none focus:border-[#e8c84a]"
            style={{ borderRadius: 0 }}
          >
            <option value="">— Select room —</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2">
            Squeeze note (optional)
          </label>
          <input
            type="text"
            value={squeezeNote}
            onChange={(e) => setSqueezeNote(e.target.value)}
            className="w-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] px-4 py-3 min-h-[44px] outline-none focus:border-[#e8c84a] placeholder:text-[#444444]"
            placeholder="e.g. Can squeeze 2 more on the floor"
            style={{ borderRadius: 0 }}
          />
        </div>
        <div>
          <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2">
            Waitlist mode
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setWaitlistMode('auto')}
              className={`px-4 py-2 font-mono text-[10px] tracking-[0.2em] uppercase border min-h-[44px] transition-colors ${
                waitlistMode === 'auto'
                  ? 'border-[#e8c84a] text-[#e8c84a] bg-[rgba(232,200,74,0.12)]'
                  : 'border-[#2a2a2a] text-[#888888] hover:border-[#e8c84a] hover:text-[#e8c84a]'
              }`}
              style={{ borderRadius: 0 }}
            >
              Auto-promote
            </button>
            <button
              type="button"
              onClick={() => setWaitlistMode('manual')}
              className={`px-4 py-2 font-mono text-[10px] tracking-[0.2em] uppercase border min-h-[44px] transition-colors ${
                waitlistMode === 'manual'
                  ? 'border-[#e8c84a] text-[#e8c84a] bg-[rgba(232,200,74,0.12)]'
                  : 'border-[#2a2a2a] text-[#888888] hover:border-[#e8c84a] hover:text-[#e8c84a]'
              }`}
              style={{ borderRadius: 0 }}
            >
              Manual
            </button>
          </div>
          <p className="font-mono text-[13px] text-[#444444] mt-1">
            {waitlistMode === 'auto'
              ? "When a seat is cancelled, the first person waiting is moved up automatically."
              : "You choose who to promote from the admin panel."}
          </p>
        </div>
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-[#e8c84a]"
            />
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888]">
              Event is active (shown on homepage)
            </span>
          </label>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#e8c84a] text-[#0f0f0f] py-3 font-mono text-[10px] tracking-[0.2em] uppercase min-h-[44px] hover:opacity-85 active:scale-[0.97] disabled:opacity-60 transition-all"
          style={{ borderRadius: 0 }}
        >
          {loading ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </>
  );
}
