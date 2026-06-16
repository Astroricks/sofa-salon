'use client';

import { useEffect, useState } from 'react';
import { APP_NAME_PARTS } from '@/lib/config';
import BackButton from '@/components/BackButton';
import { useLocale } from '@/components/LocaleProvider';

export default function AdminSettingsPage() {
  const { t } = useLocale();
  const [hours, setHours] = useState<number>(24);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/admin/config')
      .then((res) => res.ok ? res.json() : { cancel_no_show_hours: 24 })
      .then((data) => {
        setHours(typeof data.cancel_no_show_hours === 'number' ? data.cancel_no_show_hours : 24);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancel_no_show_hours: hours }),
      });
      if (res.ok) {
        const data = await res.json();
        setHours(data.cancel_no_show_hours);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 bg-[#0f0f0f]">
      <BackButton className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] hover:text-[#e8c84a] mb-6 inline-block">
        {t.admin.backToAdmin}
      </BackButton>
      <h1 className="font-mono text-xl text-[#e8e4dc] mb-1">
        {APP_NAME_PARTS[0]}{APP_NAME_PARTS.slice(1).join('')}{' '}
        <span className="text-[#e8c84a]">{t.admin.title}</span>
      </h1>
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-6">
        {t.admin.settings}
      </p>

      <div className="border border-[#2a2a2a] p-4" style={{ borderRadius: 0 }}>
        <p className="font-mono text-[10px] tracking-wider text-[#e8c84a] mb-2 uppercase">
          {t.admin.cancelNoShowHoursLabel}
        </p>
        <p className="font-mono text-[12px] text-[#888888] mb-3">
          {t.admin.cancelNoShowHoursHelp}
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="number"
            min={0}
            max={168}
            value={loaded ? hours : ''}
            onChange={(e) => setHours(Math.max(0, Math.min(168, parseInt(e.target.value, 10) || 0)))}
            className="w-20 bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] px-3 py-2 outline-none focus:border-[#e8c84a]"
            style={{ borderRadius: 0 }}
          />
          <span className="font-mono text-[13px] text-[#888888]">{t.admin.hours}</span>
          <button
            type="button"
            onClick={save}
            disabled={saving || !loaded}
            className="bg-[#e8c84a] text-[#0f0f0f] font-mono text-[10px] tracking-wider uppercase px-4 py-2 disabled:opacity-50"
            style={{ borderRadius: 0 }}
          >
            {saving ? '…' : t.admin.saveSettings}
          </button>
        </div>
      </div>
    </div>
  );
}
