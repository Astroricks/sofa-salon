'use client';

import { useCallback, useState } from 'react';

export default function ReceiptExportButton() {
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
      const link = document.createElement('a');
      link.download = `ziggy-receipt-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setGenerating(false);
    }
  }, []);

  return (
    <button
      type="button"
      onClick={exportReceipt}
      disabled={generating}
      className="w-full mt-6 font-mono text-[11px] tracking-[0.2em] uppercase py-3 px-8 bg-[#e8c84a] text-[#0f0f0f] hover:opacity-90 disabled:opacity-60 transition-opacity"
      style={{ borderRadius: 0 }}
    >
      {generating ? '…' : 'Export Receipt ↓'}
    </button>
  );
}
