'use client';

import { useCallback, useState } from 'react';
import { APP_NAME } from '@/lib/config';
import { useLocale } from '@/components/LocaleProvider';

function isMobileExport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768 || /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent);
}

export default function ReceiptExportButton() {
  const { t } = useLocale();
  const [generating, setGenerating] = useState(false);

  const exportReceipt = useCallback(async () => {
    const svg = document.getElementById('receipt-svg');
    if (!svg) return;
    setGenerating(true);
    try {
      const htmlToImage = await import('html-to-image');
      const dataUrl = await htmlToImage.toPng(svg as HTMLElement, {
        pixelRatio: 3,
        backgroundColor: '#0f0f0f',
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const appSlug = APP_NAME.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const fileName = `${appSlug || 'screening'}-receipt-${new Date().toISOString().slice(0, 10)}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      if (isMobileExport() && typeof navigator !== 'undefined' && navigator.share) {
        try {
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: t.receipt.shareTitle.replace('{appName}', APP_NAME),
            });
            return;
          }
        } catch {
          // User cancelled or share failed; fall through to fallback
        }
        // Fallback: open image in new tab so user can long-press to save
        window.open(dataUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      link.click();
    } finally {
      setGenerating(false);
    }
  }, [t.receipt.shareTitle]);

  return (
    <button
      type="button"
      onClick={exportReceipt}
      disabled={generating}
      className="w-full mt-6 font-mono text-[11px] tracking-[0.2em] uppercase py-3 px-8 bg-[#e8c84a] text-[#0f0f0f] hover:opacity-90 disabled:opacity-60 transition-opacity"
      style={{ borderRadius: 0 }}
    >
      {generating ? '…' : t.receipt.export}
    </button>
  );
}
