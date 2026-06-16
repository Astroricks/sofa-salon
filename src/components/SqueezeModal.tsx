'use client';

import { useCallback, useEffect } from 'react';
import { useLocale } from '@/components/LocaleProvider';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  isMobile?: boolean;
}

export default function SqueezeModal({
  open,
  onClose,
  onConfirm,
  loading = false,
  isMobile = false,
}: Props) {
  const { t } = useLocale();
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
      className={`bg-[#0f0f0f] border border-[#f87171] w-full max-w-[90vw] relative ${
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
      <h2 className="font-serif text-xl italic text-[#f87171] mb-1">
        {t.screening.reallySqueeze}
      </h2>
      <p className={`font-mono text-[13px] text-[#888888] ${isMobile ? 'mb-4' : 'mb-6'}`}>
        {t.screening.squeezeSubtitle}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="bg-[#f87171] text-[#0f0f0f] font-mono text-[10px] tracking-[0.2em] uppercase px-6 py-3 min-h-[44px] hover:opacity-85 active:scale-[0.97] disabled:opacity-60 transition-all"
          style={{ borderRadius: 0 }}
        >
          {t.screening.squeezeConfirm}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="border border-[#2a2a2a] text-[#888888] font-mono text-[10px] tracking-[0.2em] uppercase px-6 py-3 min-h-[44px] hover:border-[#e8c84a] hover:text-[#e8c84a] transition-colors"
          style={{ borderRadius: 0 }}
        >
          {t.screening.cancel}
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div
        className="fixed inset-0 bg-black/85 z-50 flex items-end justify-center safe-area-inset-bottom"
        onClick={onClose}
      >
        <div className="overflow-hidden w-full max-h-[50vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
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
