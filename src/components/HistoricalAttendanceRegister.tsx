'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/components/LocaleProvider';
import { MAX_CLAIM_SCREENINGS_PER_REQUEST } from '@/lib/historical-catalog';
import { shouldShowChineseTitleInEnSubtitle } from '@/lib/historical-catalog-ui';
import { SALON_NAME } from '@/lib/config';
import { formatScreeningInVenue } from '@/lib/screening-datetime';

type CatalogItem = {
  id: string;
  title: string;
  titleEn: string;
  director: string;
  screeningAt: string;
  year: number | null;
  alreadyRegistered: boolean;
};

function ScreeningRow({
  item,
  locale,
  checked,
  disabled,
  saving,
  registeredLabel,
  onToggle,
  displayTitle,
  subtitle,
}: {
  item: CatalogItem;
  locale: string;
  checked: boolean;
  disabled: boolean;
  saving: boolean;
  registeredLabel: string;
  onToggle: () => void;
  displayTitle: (item: CatalogItem) => string;
  subtitle: (item: CatalogItem) => string;
}) {
  return (
    <li>
      <label
        className={`flex gap-3 px-3 py-3 cursor-pointer items-start ${
          disabled ? 'opacity-60' : 'hover:bg-[#141414]'
        }`}
      >
        <input
          type="checkbox"
          className="mt-1 accent-[#e8c84a]"
          checked={checked}
          disabled={disabled || saving}
          onChange={onToggle}
        />
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-[14px] text-[#e8e4dc] leading-snug">
            {displayTitle(item)}
            {item.year != null ? <span className="text-[#666]"> ({item.year})</span> : null}
          </span>
          <span className="block font-mono text-[12px] text-[#666] mt-0.5 truncate">
            {subtitle(item)}
          </span>
          {item.alreadyRegistered ? (
            <span className="font-mono text-[10px] text-[#e8c84a] mt-1 inline-block">
              {registeredLabel}
            </span>
          ) : null}
        </span>
      </label>
    </li>
  );
}

export default function HistoricalAttendanceRegister() {
  const { t, locale } = useLocale();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [registeredItems, setRegisteredItems] = useState<CatalogItem[]>([]);
  const [registeredTotal, setRegisteredTotal] = useState(0);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [registeredOpen, setRegisteredOpen] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRestoreRef = useRef<number | null>(null);
  /** Bumped on each search change so in-flight load-more cannot append to a new query. */
  const fetchGenerationRef = useRef(0);

  const pageSize = 30;

  useEffect(() => {
    const tmr = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(tmr);
  }, [q]);

  const fetchRegistered = useCallback(async (search: string, fetchId: number) => {
    const params = new URLSearchParams({ scope: 'registered', limit: '50' });
    if (search) params.set('q', search);
    const res = await fetch(`/api/historical-attendance/catalog?${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error(t.common.loadFailed);
    if (fetchId !== fetchGenerationRef.current) return;
    setRegisteredItems((data.items ?? []) as CatalogItem[]);
    setRegisteredTotal(Number(data.total ?? 0));
  }, [t.common.loadFailed]);

  const fetchUnclaimed = useCallback(
    async (append: boolean, search: string, nextOffset: number, fetchId: number) => {
      const params = new URLSearchParams({
        scope: 'unclaimed',
        limit: String(pageSize),
        offset: String(nextOffset),
      });
      if (search) params.set('q', search);
      const res = await fetch(`/api/historical-attendance/catalog?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(t.common.loadFailed);
      if (fetchId !== fetchGenerationRef.current) return;

      const nextItems = (data.items ?? []) as CatalogItem[];
      setTotal(Number(data.total ?? nextItems.length));
      setItems((prev) => (append ? [...prev, ...nextItems] : nextItems));
      setOffset(nextOffset + nextItems.length);
    },
    [t.common.loadFailed]
  );

  const loadAll = useCallback(
    async (append: boolean, search: string, nextOffset: number) => {
      if (append) {
        setLoadingMore(true);
        scrollRestoreRef.current = window.scrollY;
      } else {
        setLoading(true);
      }
      setError(null);

      const fetchId = fetchGenerationRef.current;

      try {
        if (!append) {
          await Promise.all([
            fetchRegistered(search, fetchId),
            fetchUnclaimed(false, search, 0, fetchId),
          ]);
        } else {
          await fetchUnclaimed(true, search, nextOffset, fetchId);
        }
      } catch {
        setError(t.common.loadFailed);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [fetchRegistered, fetchUnclaimed, t.common.loadFailed]
  );

  useEffect(() => {
    if (scrollRestoreRef.current != null && !loadingMore) {
      window.scrollTo(0, scrollRestoreRef.current);
      scrollRestoreRef.current = null;
    }
  }, [items, loadingMore]);

  useEffect(() => {
    fetchGenerationRef.current += 1;
    setOffset(0);
    setSelected(new Set());
    void loadAll(false, debouncedQ, 0);
  }, [debouncedQ, loadAll]);

  const selectableIds = items.map((i) => i.id);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelected(new Set(selectableIds));
  };

  const clearSelection = () => setSelected(new Set());

  const claim = async (ids: string[]) => {
    if (ids.length === 0) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      let claimedTotal = 0;
      for (let i = 0; i < ids.length; i += MAX_CLAIM_SCREENINGS_PER_REQUEST) {
        const chunk = ids.slice(i, i + MAX_CLAIM_SCREENINGS_PER_REQUEST);
        const res = await fetch('/api/historical-attendance/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ screeningIds: chunk }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(t.common.saveFailed);
          return;
        }
        claimedTotal += Number(data.claimed ?? 0);
      }
      setMessage(t.historyCatalog.claimedCount.replace('{n}', String(claimedTotal)));
      setSelected(new Set());
      router.refresh();
      await loadAll(false, debouncedQ, 0);
    } catch {
      setError(t.common.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (iso: string) => {
    return formatScreeningInVenue(iso, locale === 'zh' ? 'zh-CN' : 'en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const displayTitle = (item: CatalogItem) => {
    if (locale === 'en' && item.titleEn.trim()) return item.titleEn;
    return item.title;
  };

  const subtitle = (item: CatalogItem) => {
    const parts: string[] = [formatDate(item.screeningAt)];
    if (item.director) parts.push(item.director);
    if (locale === 'zh' && item.titleEn.trim()) parts.push(item.titleEn);
    if (locale === 'en' && shouldShowChineseTitleInEnSubtitle(item.title, item.titleEn)) {
      parts.push(item.title.trim());
    }
    return parts.join(' · ');
  };

  const hasMore = items.length < total;

  const handleLoadMore = () => {
    void loadAll(true, debouncedQ, offset);
  };

  return (
    <div className="space-y-4">
      <p className="font-mono text-[12px] text-[#888888] leading-relaxed">
        {t.historyCatalog.intro.replace('{salonName}', SALON_NAME)}
      </p>

      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t.historyCatalog.searchPlaceholder}
        className="w-full bg-[#0f0f0f] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[14px] px-3 py-2.5"
        style={{ borderRadius: 0 }}
        autoComplete="off"
      />

      {registeredTotal > 0 ? (
        <section className="border border-[#2a2a2a]" style={{ borderRadius: 0 }}>
          <button
            type="button"
            onClick={() => setRegisteredOpen((o) => !o)}
            className="w-full flex items-center justify-between px-3 py-2.5 font-mono text-[10px] tracking-[0.15em] uppercase text-[#888888] hover:text-[#e8c84a] border-b border-[#2a2a2a]"
          >
            <span>
              {t.historyCatalog.registeredSection.replace('{n}', String(registeredTotal))}
            </span>
            <span aria-hidden>{registeredOpen ? '−' : '+'}</span>
          </button>
          {registeredOpen ? (
            <ul className="divide-y divide-[#2a2a2a] max-h-48 overflow-y-auto">
              {registeredItems.map((item) => (
                <ScreeningRow
                  key={item.id}
                  item={item}
                  locale={locale}
                  checked
                  disabled
                  saving={saving}
                  registeredLabel={t.historyCatalog.alreadyRegistered}
                  onToggle={() => {}}
                  displayTitle={displayTitle}
                  subtitle={subtitle}
                />
              ))}
              {registeredTotal > registeredItems.length ? (
                <li className="px-3 py-2 font-mono text-[11px] text-[#666]">
                  +{registeredTotal - registeredItems.length}
                </li>
              ) : null}
            </ul>
          ) : null}
        </section>
      ) : null}

      <p className="font-mono text-[10px] tracking-[0.15em] uppercase text-[#888888]">
        {t.historyCatalog.addSection}
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={selectAllVisible}
          disabled={selectableIds.length === 0 || saving}
          className="font-mono text-[10px] tracking-[0.15em] uppercase border border-[#2a2a2a] text-[#888888] px-3 py-2 hover:border-[#e8c84a] hover:text-[#e8c84a] disabled:opacity-40"
          style={{ borderRadius: 0 }}
        >
          {t.historyCatalog.selectAllVisible}
        </button>
        <button
          type="button"
          onClick={clearSelection}
          disabled={selected.size === 0 || saving}
          className="font-mono text-[10px] tracking-[0.15em] uppercase border border-[#2a2a2a] text-[#888888] px-3 py-2 hover:border-[#e8c84a] hover:text-[#e8c84a] disabled:opacity-40"
          style={{ borderRadius: 0 }}
        >
          {t.historyCatalog.clearSelection}
        </button>
        <button
          type="button"
          onClick={() => claim(Array.from(selected))}
          disabled={selected.size === 0 || saving}
          className="font-mono text-[10px] tracking-[0.15em] uppercase bg-[#e8c84a] text-[#0f0f0f] px-4 py-2 hover:opacity-85 disabled:opacity-40"
          style={{ borderRadius: 0 }}
        >
          {saving
            ? t.historyCatalog.saving
            : t.historyCatalog.registerSelected.replace('{n}', String(selected.size))}
        </button>
      </div>

      {message ? (
        <p className="font-mono text-[12px] text-[#e8c84a]">{message}</p>
      ) : null}
      {error ? <p className="font-mono text-[12px] text-red-400">{error}</p> : null}

      {loading ? (
        <p className="font-mono text-[13px] text-[#666]">{t.common.loading}</p>
      ) : items.length === 0 ? (
        <p className="font-mono text-[13px] text-[#666]">
          {registeredTotal > 0 ? t.historyCatalog.emptyUnclaimed : t.historyCatalog.empty}
        </p>
      ) : (
        <ul className="border border-[#2a2a2a] divide-y divide-[#2a2a2a]" style={{ borderRadius: 0 }}>
          {items.map((item) => (
            <ScreeningRow
              key={item.id}
              item={item}
              locale={locale}
              checked={selected.has(item.id)}
              disabled={false}
              saving={saving}
              registeredLabel={t.historyCatalog.alreadyRegistered}
              onToggle={() => toggle(item.id)}
              displayTitle={displayTitle}
              subtitle={subtitle}
            />
          ))}
        </ul>
      )}

      {hasMore && !loading ? (
        <button
          type="button"
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="w-full font-mono text-[10px] tracking-[0.2em] uppercase border border-[#2a2a2a] text-[#888888] py-3 hover:border-[#e8c84a] hover:text-[#e8c84a] disabled:opacity-40"
          style={{ borderRadius: 0 }}
        >
          {loadingMore ? t.common.loading : t.historyCatalog.loadMore}
        </button>
      ) : null}
    </div>
  );
}
