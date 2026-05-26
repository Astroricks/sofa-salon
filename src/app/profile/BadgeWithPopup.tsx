'use client';

import { useState } from 'react';
import type { BadgeLevel } from '@/lib/badges';

export default function BadgeWithPopup({
  badge,
  locale,
  explanationTitle,
  explanation,
}: {
  badge: Pick<BadgeLevel, 'emoji' | 'label' | 'labelEn'>;
  locale: 'en' | 'zh';
  explanationTitle: string;
  explanation: string;
}) {
  const [open, setOpen] = useState(false);
  const label = locale === 'zh' ? badge.label : badge.labelEn;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono text-[12px] text-[#888888] hover:text-[#e8c84a] transition-colors inline-flex items-center gap-1 cursor-pointer border-0 bg-transparent p-0"
        title={label}
      >
        <span>{badge.emoji}</span>
        <span>{label}</span>
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="badge-explanation-title"
        >
          <div
            className="bg-[#0f0f0f] border border-[#2a2a2a] p-6 w-full max-w-[320px]"
            style={{ borderRadius: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="badge-explanation-title"
              className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#e8c84a] mb-3"
            >
              {explanationTitle}
            </h2>
            <p className="font-mono text-[13px] text-[#e8e4dc] leading-relaxed">
              {explanation}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-6 w-full border border-[#2a2a2a] text-[#888888] font-mono text-[10px] tracking-[0.2em] uppercase py-3 hover:border-[#e8c84a] hover:text-[#e8c84a] transition-colors"
              style={{ borderRadius: 0 }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}
