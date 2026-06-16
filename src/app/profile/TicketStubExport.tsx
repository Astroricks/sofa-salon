'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { useLocale } from '@/components/LocaleProvider';
import { APP_NAME_PARTS } from '@/lib/config';
import type { PastScreening } from './WatchHistory';
import { formatScreeningInVenue } from '@/lib/screening-datetime';

interface Props {
  items: PastScreening[];
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 0;
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      setIsMobile(w < 768 || /Android|webOS|iPhone|iPad|iPod/i.test(ua));
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

export default function TicketStubExport({ items }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { t, locale } = useLocale();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const isMobile = useIsMobile();
  const appName = APP_NAME_PARTS.join('');

  const generateImage = useCallback(async (): Promise<string | null> => {
    if (!ref.current || items.length === 0) return null;
    const { toPng } = await import('html-to-image');
    return toPng(ref.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: '#0f0f0f',
    });
  }, [items.length]);

  const handleDownload = useCallback(async () => {
    setGenerating(true);
    try {
      const dataUrl = await generateImage();
      if (!dataUrl) return;
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `zigigraph-watch-history-${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
    } finally {
      setGenerating(false);
    }
  }, [generateImage]);

  const handleSaveToPhotos = useCallback(async () => {
    setGenerating(true);
    try {
      const dataUrl = await generateImage();
      if (!dataUrl) return;
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `zigigraph-watch-history-${new Date().toISOString().slice(0, 10)}.png`, { type: 'image/png' });
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({
            files: [file],
            title: `${appName} ${t.profile.watchHistory}`,
          });
          return;
        } catch {
          // Share cancelled or not supported with files; fall back to opening image
        }
      }
      window.open(dataUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setGenerating(false);
    }
  }, [appName, generateImage, t.profile.watchHistory]);

  if (items.length === 0) return null;

  const totalMinutes = items.reduce((acc, i) => acc + (i.durationMinutes ?? 0), 0);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const totalTimeLabel =
    locale === 'zh'
      ? hours > 0
        ? `${hours} 小时 ${mins} 分钟`
        : `${mins} 分钟`
      : hours > 0
        ? `${hours} h ${mins} min`
        : `${mins} min`;

  return (
    <>
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="font-mono text-[10px] tracking-[0.2em] uppercase py-2 px-4 border border-[#e8c84a] text-[#e8c84a] hover:bg-[#e8c84a]/10 transition-colors"
          style={{ borderRadius: 0 }}
        >
          {t.profile.exportWatchHistory}
        </button>
        <p className="font-mono text-[10px] text-[#666] mt-1.5">
          {t.profile.exportWatchHistoryHint}
        </p>
      </div>

      {previewOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80"
          onClick={() => setPreviewOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t.profile.exportPreviewTitle}
        >
          <div
            className="bg-[#0f0f0f] border border-[#e8c84a] w-full max-w-[400px] max-h-[90vh] overflow-y-auto flex flex-col"
            style={{ borderRadius: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#e8c84a] p-3 border-b border-[#2a2a2a]">
              {t.profile.exportPreviewTitle}
            </p>
            <div className="p-4 overflow-hidden">
              {/* Stub fits in viewport (no horizontal scroll); scales down on narrow screens */}
              <div
                ref={ref}
                className="w-full max-w-[400px] mx-auto"
                style={{
                  background: '#0f0f0f',
                  border: '2px solid #e8c84a',
                  fontFamily: 'ui-monospace, monospace',
                }}
              >
                <div className="p-6 pb-4 text-center border-b border-[#2a2a2a]" style={{ borderColor: '#2a2a2a' }}>
                  <p
                    className="text-2xl tracking-widest text-[#e8c84a]"
                    style={{ fontFamily: 'ui-serif, Georgia, serif', letterSpacing: '0.25em' }}
                  >
                    {appName}
                  </p>
                  <p className="text-[10px] text-[#666] mt-1 uppercase tracking-[0.2em]">
                    {locale === 'zh' ? '观影记录' : 'Watch history'}
                  </p>
                </div>
                <div className="p-4 pt-3">
                  {items.map((item, i) => {
                    const dateStr = formatScreeningInVenue(
                      item.screeningAt,
                      locale === 'zh' ? 'zh-CN' : 'en-GB',
                      {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      }
                    );
                    const stars = item.rating != null ? item.rating : 0;
                    const starStr = '★'.repeat(stars) + '☆'.repeat(5 - stars);
                    return (
                      <div
                        key={item.screeningId}
                        className="py-3 border-b border-[#2a2a2a] last:border-0"
                        style={{
                          borderColor: '#2a2a2a',
                          borderBottomStyle: i < items.length - 1 ? 'dashed' : 'solid',
                        }}
                      >
                        <p className="text-[11px] text-[#888888] uppercase tracking-wider">{dateStr}</p>
                        <p className="text-[15px] text-[#e8e4dc] mt-0.5 font-medium">{item.title}</p>
                        <p className="text-[13px] text-[#e8c84a] mt-1 tracking-wide">
                          {item.rating != null ? starStr : '—'}
                        </p>
                      </div>
                    );
                  })}
                </div>
                {totalMinutes > 0 && (
                  <div className="p-4 pt-2 border-t border-[#2a2a2a] text-center">
                    <p className="text-[10px] text-[#666] uppercase tracking-[0.2em]">
                      {t.profile.timeSpentHere.replace('{appName}', appName)}
                    </p>
                    <p className="text-[14px] text-[#e8c84a] mt-1 font-medium tracking-wide">
                      {totalTimeLabel}
                    </p>
                  </div>
                )}
              </div>
            </div>
            {isMobile && (
              <p className="font-mono text-[10px] text-[#666] px-4 pb-2">
                {t.profile.exportLongPressHint}
              </p>
            )}
            <div className="flex gap-2 p-4 border-t border-[#2a2a2a]">
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="flex-1 font-mono text-[10px] tracking-[0.2em] uppercase py-3 border border-[#2a2a2a] text-[#888888] hover:border-[#e8c84a] hover:text-[#e8c84a] transition-colors"
                style={{ borderRadius: 0 }}
              >
                {t.profile.exportClose}
              </button>
              {isMobile ? (
                <button
                  type="button"
                  onClick={handleSaveToPhotos}
                  disabled={generating}
                  className="flex-1 font-mono text-[10px] tracking-[0.2em] uppercase py-3 bg-[#e8c84a] text-[#0f0f0f] hover:opacity-90 disabled:opacity-50 transition-opacity"
                  style={{ borderRadius: 0 }}
                >
                  {generating ? (locale === 'zh' ? '生成中…' : 'Generating…') : t.profile.exportSaveToPhotos}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={generating}
                  className="flex-1 font-mono text-[10px] tracking-[0.2em] uppercase py-3 bg-[#e8c84a] text-[#0f0f0f] hover:opacity-90 disabled:opacity-50 transition-opacity"
                  style={{ borderRadius: 0 }}
                >
                  {generating ? (locale === 'zh' ? '生成中…' : 'Generating…') : t.profile.exportDownload}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
