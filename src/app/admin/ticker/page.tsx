'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { APP_NAME_PARTS } from '@/lib/config';
import { useLocale } from '@/components/LocaleProvider';

interface TickerLine {
  id: string;
  content: string;
  sort_order: number;
  is_active: boolean;
}

interface TickerData {
  customLines: TickerLine[];
  config: { show_upcoming: boolean; show_ratings: boolean };
}

export default function AdminTickerPage() {
  const { t } = useLocale();
  const [data, setData] = useState<TickerData | null>(null);
  const [saving, setSaving] = useState(false);
  const [newContent, setNewContent] = useState('');

  const load = async () => {
    const res = await fetch('/api/admin/ticker');
    if (!res.ok) return;
    const json = await res.json();
    setData({
      customLines: json.customLines ?? [],
      config: json.config ?? { show_upcoming: true, show_ratings: true },
    });
  };

  useEffect(() => {
    load();
  }, []);

  const updateConfig = async (key: 'show_upcoming' | 'show_ratings', value: boolean) => {
    if (!data) return;
    setSaving(true);
    await fetch('/api/admin/ticker', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: { [key]: value } }),
    });
    setData((prev) => prev ? { ...prev, config: { ...prev.config, [key]: value } } : null);
    setSaving(false);
  };

  const addLine = async () => {
    if (!newContent.trim()) return;
    setSaving(true);
    const res = await fetch('/api/admin/ticker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newContent.trim(), sort_order: (data?.customLines.length ?? 0), is_active: true }),
    });
    setSaving(false);
    if (res.ok) {
      setNewContent('');
      load();
    }
  };

  const updateLine = async (id: string, updates: Partial<TickerLine>) => {
    setSaving(true);
    await fetch('/api/admin/ticker', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...updates }) });
    setSaving(false);
    load();
  };

  const deleteLine = async (id: string) => {
    setSaving(true);
    await fetch(`/api/admin/ticker?id=${id}`, { method: 'DELETE' });
    setSaving(false);
    load();
  };

  if (!data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="font-mono text-[13px] text-[#888888]">{t.common.loading}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 bg-[#0f0f0f]">
      <Link
        href="/admin"
        className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] hover:text-[#e8c84a] mb-6 inline-block"
      >
        {t.admin.backToAdmin}
      </Link>
      <h1 className="font-pixel text-xl text-[#e8e4dc] mb-1">
        {APP_NAME_PARTS[0]} <span className="text-[#e8c84a]">Admin</span>
      </h1>
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-6">
        {t.admin.tickerManage}
      </p>

      <div className="space-y-6">
        <div className="border border-[#2a2a2a] p-4" style={{ borderRadius: 0 }}>
          <p className="font-mono text-[10px] tracking-wider text-[#e8c84a] mb-3 uppercase">{t.admin.showUpcoming}</p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.config.show_upcoming}
              onChange={(e) => updateConfig('show_upcoming', e.target.checked)}
              disabled={saving}
              className="w-4 h-4 accent-[#e8c84a]"
            />
            <span className="font-mono text-[13px] text-[#e8e4dc]">{t.admin.showUpcoming}</span>
          </label>
        </div>

        <div className="border border-[#2a2a2a] p-4" style={{ borderRadius: 0 }}>
          <p className="font-mono text-[10px] tracking-wider text-[#e8c84a] mb-3 uppercase">{t.admin.showRatings}</p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.config.show_ratings}
              onChange={(e) => updateConfig('show_ratings', e.target.checked)}
              disabled={saving}
              className="w-4 h-4 accent-[#e8c84a]"
            />
            <span className="font-mono text-[13px] text-[#e8e4dc]">{t.admin.showRatings}</span>
          </label>
        </div>

        <div className="border border-[#2a2a2a] p-4" style={{ borderRadius: 0 }}>
          <p className="font-mono text-[10px] tracking-wider text-[#e8c84a] mb-3 uppercase">{t.admin.tickerCustomLines}</p>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder={t.admin.content}
              className="flex-1 bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] px-3 py-2 outline-none focus:border-[#e8c84a]"
              style={{ borderRadius: 0 }}
              onKeyDown={(e) => e.key === 'Enter' && addLine()}
            />
            <button
              type="button"
              onClick={addLine}
              disabled={saving || !newContent.trim()}
              className="bg-[#e8c84a] text-[#0f0f0f] font-mono text-[10px] tracking-wider uppercase px-4 py-2 disabled:opacity-50"
              style={{ borderRadius: 0 }}
            >
              {t.admin.addLine}
            </button>
          </div>
          <ul className="space-y-2">
            {data.customLines.map((line) => (
              <li key={line.id} className="flex items-center gap-2 flex-wrap border-b border-[#2a2a2a] pb-2">
                <input
                  type="text"
                  defaultValue={line.content}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== line.content) updateLine(line.id, { content: v });
                  }}
                  className="flex-1 min-w-[120px] bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[12px] px-2 py-1"
                  style={{ borderRadius: 0 }}
                />
                <label className="flex items-center gap-1 text-[#888888] font-mono text-[10px]">
                  <input
                    type="checkbox"
                    checked={line.is_active}
                    onChange={(e) => updateLine(line.id, { is_active: e.target.checked })}
                    className="accent-[#e8c84a]"
                  />
                  {t.admin.active}
                </label>
                <button
                  type="button"
                  onClick={() => deleteLine(line.id)}
                  className="text-[#f87171] font-mono text-[10px] hover:underline"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
