'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';
import { useLocale } from '@/components/LocaleProvider';
import { ALT_LOCALE_MIGRATION_ERROR_KEY } from '@/lib/screening-alt-locale-schema';

interface Room {
  id: string;
  name: string;
}

export default function NewScreeningPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [doubanUrl, setDoubanUrl] = useState('');
  const [letterboxdUrl, setLetterboxdUrl] = useState('');
  const [trailerUrl, setTrailerUrl] = useState('');
  const [screeningAt, setScreeningAt] = useState('');
  const [roomId, setRoomId] = useState('');
  const [waitlistMode, setWaitlistMode] = useState<'auto' | 'manual'>('auto');
  const [year, setYear] = useState('');
  const [director, setDirector] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [directorEn, setDirectorEn] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/rooms')
      .then((r) => r.json())
      .then((data) => setRooms(data.rooms ?? []))
      .catch(() => setRooms([]));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !screeningAt) return;
    setLoading(true);
    setError('');
    const res = await fetch('/api/screening', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        screening_at: new Date(screeningAt).toISOString(),
        room_id: roomId || null,
        waitlist_mode: waitlistMode,
        year: year ? parseInt(year, 10) : null,
        director: director || null,
        duration_minutes: durationMinutes ? parseInt(durationMinutes, 10) : null,
        title_en: titleEn.trim() || null,
        director_en: directorEn.trim() || null,
        douban_url: doubanUrl.trim(),
        letterboxd_url: letterboxdUrl.trim(),
        trailer_url: trailerUrl.trim(),
      }),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) {
      setError(
        data.errorKey === ALT_LOCALE_MIGRATION_ERROR_KEY
          ? t.admin.altLocaleMigrationRequired
          : (data.error ?? 'Create failed')
      );
      return;
    }
    if (data.screening) {
      router.push('/admin');
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8 bg-[#0f0f0f]">
      <BackButton className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] hover:text-[#e8c84a] mb-6 inline-block transition-colors">
        {t.admin.backToAdmin}
      </BackButton>
      <h1 className="font-serif text-2xl italic text-[#e8c84a] mb-6">{t.admin.newEvent}</h1>
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
            {t.admin.altLanguageTitle}
          </label>
          <input
            type="text"
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
            className="w-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] px-4 py-3 min-h-[44px] outline-none focus:border-[#e8c84a] placeholder:text-[#444444]"
            placeholder="e.g. Chungking Express"
            style={{ borderRadius: 0 }}
          />
          <p className="font-mono text-[11px] text-[#555] mt-1.5">{t.admin.altLanguageTitleHint}</p>
        </div>
        <div>
          <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2">
            {t.admin.altLanguageDirector}
          </label>
          <input
            type="text"
            value={directorEn}
            onChange={(e) => setDirectorEn(e.target.value)}
            className="w-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] px-4 py-3 min-h-[44px] outline-none focus:border-[#e8c84a] placeholder:text-[#444444]"
            placeholder="e.g. Wong Kar-wai"
            style={{ borderRadius: 0 }}
          />
          <p className="font-mono text-[11px] text-[#555] mt-1.5">{t.admin.altLanguageDirectorHint}</p>
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
            {t.admin.screeningDoubanUrl}
          </label>
          <input
            type="text"
            value={doubanUrl}
            onChange={(e) => setDoubanUrl(e.target.value)}
            className="w-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] px-4 py-3 min-h-[44px] outline-none focus:border-[#e8c84a] placeholder:text-[#444444]"
            placeholder="https://movie.douban.com/subject/…"
            style={{ borderRadius: 0 }}
          />
          <p className="font-mono text-[11px] text-[#555] mt-1.5">{t.admin.screeningDoubanUrlHint}</p>
        </div>
        <div>
          <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2">
            {t.admin.screeningLetterboxdUrl}
          </label>
          <input
            type="text"
            value={letterboxdUrl}
            onChange={(e) => setLetterboxdUrl(e.target.value)}
            className="w-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] px-4 py-3 min-h-[44px] outline-none focus:border-[#e8c84a] placeholder:text-[#444444]"
            placeholder="https://letterboxd.com/film/…"
            style={{ borderRadius: 0 }}
          />
          <p className="font-mono text-[11px] text-[#555] mt-1.5">{t.admin.screeningLetterboxdUrlHint}</p>
        </div>
        <div>
          <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2">
            {t.admin.screeningTrailerUrl}
          </label>
          <input
            type="text"
            value={trailerUrl}
            onChange={(e) => setTrailerUrl(e.target.value)}
            className="w-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] px-4 py-3 min-h-[44px] outline-none focus:border-[#e8c84a] placeholder:text-[#444444]"
            placeholder="https://www.youtube.com/watch?v=…"
            style={{ borderRadius: 0 }}
          />
          <p className="font-mono text-[11px] text-[#555] mt-1.5">{t.admin.screeningTrailerUrlHint}</p>
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
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#e8c84a] text-[#0f0f0f] py-3 font-mono text-[10px] tracking-[0.2em] uppercase min-h-[44px] hover:opacity-85 active:scale-[0.97] disabled:opacity-60 transition-all"
          style={{ borderRadius: 0 }}
        >
          {t.admin.createEvent}
        </button>
      </form>
    </div>
  );
}
