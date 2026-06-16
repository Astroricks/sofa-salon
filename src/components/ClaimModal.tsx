'use client';

import { useCallback, useEffect } from 'react';
import { useLocale } from '@/components/LocaleProvider';

interface Props {
  open: boolean;
  onClose: () => void;
  seatLabel?: string;
  seatLabels?: string[];
  screeningTitle: string;
  /** When claiming additional seat(s) for a friend; shown as modal title when single seat */
  titleOverride?: string;
  /** Note e.g. "This seat will show as \"XXX's friend\"." */
  friendNote?: string | null;
  children: React.ReactNode;
  isMobile?: boolean;
}

export default function ClaimModal({
  open,
  onClose,
  seatLabel = '',
  seatLabels,
  screeningTitle,
  titleOverride,
  friendNote,
  children,
  isMobile = false,
}: Props) {
  const { t } = useLocale();
  const labels = seatLabels ?? (seatLabel ? [seatLabel] : []);
  const isMulti = labels.length > 1;
  const title =
    titleOverride ??
    (isMulti
      ? t.screening.claimSeats.replace('{n}', String(labels.length))
      : t.screening.claimSeat);
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', onKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onKeyDown]);

  if (!open) return null;

  const content = (
    <div
      className={`bg-[#0f0f0f] border border-[#e8c84a] w-full max-w-[90vw] relative ${
        isMobile ? 'p-4' : 'p-6'
      }`}
      style={{ borderRadius: 0 }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-2 right-2 font-mono text-xl leading-none text-[#888888] hover:text-[#f87171] transition-colors"
        aria-label={t.common.close}
      >
        ×
      </button>
      <h2 className="font-serif text-xl italic text-[#e8c84a] mb-0.5">
        {title}
      </h2>
      <p className={`font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] ${isMobile ? 'mb-3' : 'mb-6'}`}>
        {isMulti ? labels.map((l, i) => `${i + 1}. ${l}`).join(' · ') : labels[0]} · {screeningTitle}
      </p>
      {friendNote && (
        <p className="font-mono text-[12px] text-[#888888] mb-3">
          {friendNote}
        </p>
      )}
      {children}
    </div>
  );

  if (isMobile) {
    return (
      <div
        className="fixed inset-0 bg-black/85 z-50 flex items-end justify-center safe-area-inset-bottom"
        onClick={onClose}
      >
        <div className="overflow-hidden w-full max-h-[55vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="max-w-md w-full">{content}</div>
    </div>
  );
}
