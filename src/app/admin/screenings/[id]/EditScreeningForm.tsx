'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';
import { useLocale } from '@/components/LocaleProvider';
import { ALT_LOCALE_MIGRATION_ERROR_KEY } from '@/lib/screening-alt-locale-schema';
import {
  toVenueDatetimeLocal,
  VENUE_TIMEZONE,
  venueDatetimeLocalToIso,
} from '@/lib/screening-datetime';

interface Room {
  id: string;
  name: string;
}

interface ScreeningFormData {
  id: string;
  title: string;
  description: string;
  douban_url: string;
  letterboxd_url: string;
  trailer_url: string;
  screening_at: string;
  room_id: string;
  squeeze_note: string;
  waitlist_mode: 'auto' | 'manual';
  is_active: boolean;
  year?: number;
  director?: string;
  duration_minutes?: number;
  title_en?: string;
  director_en?: string;
}

interface Props {
  screening: ScreeningFormData;
  rooms: Room[];
  /** Past events keep room/waitlist controls hidden, but archive metadata remains editable. */
  isPast?: boolean;
}

export default function EditScreeningForm({ screening, rooms, isPast = false }: Props) {
  const router = useRouter();
  const { t } = useLocale();
  const [title, setTitle] = useState(screening.title);
  const [description, setDescription] = useState(screening.description ?? '');
  const [doubanUrl, setDoubanUrl] = useState(screening.douban_url ?? '');
  const [letterboxdUrl, setLetterboxdUrl] = useState(screening.letterboxd_url ?? '');
  const [trailerUrl, setTrailerUrl] = useState(screening.trailer_url ?? '');
  const [screeningAt, setScreeningAt] = useState(toVenueDatetimeLocal(screening.screening_at));
  const [roomId, setRoomId] = useState(screening.room_id);
  const [waitlistMode, setWaitlistMode] = useState<'auto' | 'manual'>(screening.waitlist_mode);
  const [isActive, setIsActive] = useState(screening.is_active);
  const [year, setYear] = useState(screening.year != null ? String(screening.year) : '');
  const [director, setDirector] = useState(screening.director ?? '');
  const [titleEn, setTitleEn] = useState(screening.title_en ?? '');
  const [directorEn, setDirectorEn] = useState(screening.director_en ?? '');
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
    const payload = {
      title,
      description,
      douban_url: doubanUrl.trim(),
      letterboxd_url: letterboxdUrl.trim(),
      trailer_url: trailerUrl.trim(),
      screening_at: venueDatetimeLocalToIso(screeningAt),
      room_id: roomId || null,
      squeeze_note: screening.squeeze_note ?? '',
      waitlist_mode: waitlistMode,
      is_active: isActive,
      year: year ? parseInt(year, 10) : null,
      director: director || null,
      duration_minutes: durationMinutes ? parseInt(durationMinutes, 10) : null,
      title_en: titleEn.trim() || null,
      director_en: directorEn.trim() || null,
    };
    const res = await fetch(`/api/screening/${screening.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(
        data.errorKey === ALT_LOCALE_MIGRATION_ERROR_KEY
          ? t.admin.altLocaleMigrationRequired
          : t.admin.updateFailed
      );
      return;
    }
    router.push('/admin');
    router.refresh();
  };

  return (
    <>
      <BackButton className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] hover:text-[#e8c84a] mb-6 inline-block transition-colors">
        {t.admin.backToAdmin}
      </BackButton>
      <h1 className="font-serif text-2xl italic text-[#e8c84a] mb-6">
        {t.admin.editEvent}
      </h1>
      {error && (
        <p className="font-mono text-[13px] text-[#f87171] mb-4">{error}</p>
      )}
      {isPast && (
        <p className="font-mono text-[11px] text-[#e8c84a] mb-4">
          {t.admin.pastEventEditHint}
        </p>
      )}
      <form onSubmit={submit} className="space-y-6">
        <div>
          <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2">
            {t.admin.screeningTitle}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] px-4 py-3 min-h-[44px] outline-none focus:border-[#e8c84a] placeholder:text-[#444444]"
            placeholder={t.admin.screeningTitlePlaceholder}
            required
            style={{ borderRadius: 0 }}
          />
        </div>
        <div>
          <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2">
            {t.admin.screeningDateTime.replace('{timezone}', VENUE_TIMEZONE)}
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
            {t.admin.screeningYear}
          </label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] px-4 py-3 min-h-[44px] outline-none focus:border-[#e8c84a] placeholder:text-[#444444]"
            placeholder={t.admin.screeningYearPlaceholder}
            min="1900"
            max="2100"
            style={{ borderRadius: 0 }}
          />
        </div>
        <div>
          <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2">
            {t.admin.screeningDirector}
          </label>
          <input
            type="text"
            value={director}
            onChange={(e) => setDirector(e.target.value)}
            className="w-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] px-4 py-3 min-h-[44px] outline-none focus:border-[#e8c84a] placeholder:text-[#444444]"
            placeholder={t.admin.screeningDirectorPlaceholder}
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
            placeholder={t.admin.screeningTitlePlaceholder}
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
            placeholder={t.admin.screeningDirectorPlaceholder}
            style={{ borderRadius: 0 }}
          />
          <p className="font-mono text-[11px] text-[#555] mt-1.5">{t.admin.altLanguageDirectorHint}</p>
        </div>
        <div>
          <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2">
            {t.admin.screeningDuration}
          </label>
          <input
            type="number"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            className="w-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] px-4 py-3 min-h-[44px] outline-none focus:border-[#e8c84a] placeholder:text-[#444444]"
            placeholder={t.admin.screeningDurationPlaceholder}
            min="1"
            style={{ borderRadius: 0 }}
          />
        </div>
        <div>
          <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2">
            {t.admin.screeningDescription}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] px-4 py-3 min-h-[80px] outline-none focus:border-[#e8c84a] placeholder:text-[#444444]"
            placeholder={t.admin.screeningDescriptionPlaceholder}
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
        {!isPast && (
          <>
            <div>
              <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2">
                {t.admin.screeningRoom}
              </label>
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] px-4 py-3 min-h-[44px] outline-none focus:border-[#e8c84a]"
                style={{ borderRadius: 0 }}
              >
                <option value="">{t.admin.screeningSelectRoom}</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2">
                {t.admin.waitlistMode}
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
                  {t.admin.waitlistAuto}
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
                  {t.admin.waitlistManual}
                </button>
              </div>
              <p className="font-mono text-[13px] text-[#444444] mt-1">
                {waitlistMode === 'auto'
                  ? t.admin.waitlistAutoHint
                  : t.admin.waitlistManualHint}
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
                  {t.admin.eventActive}
                </span>
              </label>
            </div>
          </>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#e8c84a] text-[#0f0f0f] py-3 font-mono text-[10px] tracking-[0.2em] uppercase min-h-[44px] hover:opacity-85 active:scale-[0.97] disabled:opacity-60 transition-all"
          style={{ borderRadius: 0 }}
        >
          {loading ? t.admin.saving : t.admin.saveChanges}
        </button>
      </form>
    </>
  );
}
