'use client';

import { useState } from 'react';
import { useLocale } from '@/components/LocaleProvider';
import { getVenueDateTimeParts } from '@/lib/screening-datetime';

type ScreeningRow = {
  id: string;
  title: string;
  screening_at: string;
  director: string;
  duration_minutes: number | null;
  reservedCount: number;
  capacity: number;
  waitlistCount: number;
  waitlist_mode: string;
};

const WEEKDAY_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function formatScreeningDateTime(iso: string): string {
  const parts = getVenueDateTimeParts(iso);
  if (!parts) return iso;
  const weekdayIndex = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day)
  ).getUTCDay();
  const weekday = WEEKDAY_ZH[weekdayIndex];
  const { month, day, hour, minute } = parts;
  let period: string;
  let h: number;
  if (hour >= 18) {
    period = '晚上';
    h = hour - 12; // 18->6, 21->9
  } else if (hour >= 12) {
    period = '下午';
    h = hour === 12 ? 12 : hour - 12; // 12->12, 17->5
  } else {
    period = hour >= 6 ? '上午' : '凌晨';
    h = hour === 0 ? 12 : hour;
  }
  const minStr = minute > 0 ? `${minute}分` : '';
  return `${month}月${day}日（${weekday}）${period}${h}点${minStr}`;
}

function buildGroupAnnouncement(screenings: ScreeningRow[], registrationLink: string): string {
  const lines = ['接下来放映：', ''];
  for (const s of screenings) {
    const timePart = formatScreeningDateTime(s.screening_at);
    lines.push(timePart);
    lines.push(`《${s.title}》`);
    if (s.director) lines.push(`导演：${s.director}`);
    lines.push('');
  }
  lines.push(`报名链接：${registrationLink}`);
  return lines.join('\n');
}

function buildAnnouncementWithSignup(screenings: ScreeningRow[], registrationLink: string): string {
  const lines = ['接下来放映：', ''];
  for (const s of screenings) {
    const timePart = formatScreeningDateTime(s.screening_at);
    lines.push(timePart);
    lines.push(`《${s.title}》`);
    if (s.director) lines.push(`导演：${s.director}`);
    lines.push('');
  }
  lines.push('报名状态：');
  for (const s of screenings) {
    const label = s.director ? `${s.director}《${s.title}》` : `《${s.title}》`;
    const full = s.reservedCount >= s.capacity;
    const status = full
      ? '报名已满，可加入候补名单'
      : `已报名 ${s.reservedCount} 位`;
    lines.push(`* ${label}：${status}`);
  }
  lines.push(`报名链接：${registrationLink}`);
  return lines.join('\n');
}

export default function AdminAnnouncement() {
  const { t, locale } = useLocale();
  const isZh = locale === 'zh';
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchAndGenerate = async (withSignup: boolean) => {
    setLoading(true);
    setText('');
    try {
      const res = await fetch('/api/admin/announcement');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      const screenings = (data.screenings ?? []) as ScreeningRow[];
      const link = data.registrationLink ?? 'PLACEHOLDER';
      const out = withSignup
        ? buildAnnouncementWithSignup(screenings, link)
        : buildGroupAnnouncement(screenings, link);
      setText(out);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="mb-8 border border-[#2a2a2a] bg-[#161616] p-4" style={{ borderRadius: 0 }}>
      <h2 className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#e8c84a] mb-3">
        {t.admin.groupAnnouncementTitle}
      </h2>
      <p className="font-mono text-[12px] text-[#888888] mb-3">
        {isZh
          ? '根据即将举行的活动生成中文群公告，方便复制到微信群。'
          : 'Generate Chinese group announcement for upcoming screenings. Copy to WeChat group.'}
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          onClick={() => fetchAndGenerate(false)}
          disabled={loading}
          className="font-mono text-[10px] tracking-[0.2em] uppercase px-4 py-2 border border-[#e8c84a] text-[#e8c84a] hover:bg-[#e8c84a]/10 disabled:opacity-50 transition-colors"
          style={{ borderRadius: 0 }}
        >
          {t.admin.generateGroupAnnouncement}
        </button>
        <button
          type="button"
          onClick={() => fetchAndGenerate(true)}
          disabled={loading}
          className="font-mono text-[10px] tracking-[0.2em] uppercase px-4 py-2 border border-[#2a2a2a] text-[#888888] hover:border-[#e8c84a] hover:text-[#e8c84a] disabled:opacity-50 transition-colors"
          style={{ borderRadius: 0 }}
        >
          {t.admin.generateWithSignup}
        </button>
      </div>
      {text && (
        <>
          <textarea
            readOnly
            value={text}
            className="w-full bg-[#0f0f0f] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] p-3 min-h-[180px] resize-y outline-none focus:border-[#e8c84a] placeholder:text-[#444444]"
            style={{ borderRadius: 0 }}
            rows={10}
          />
          <button
            type="button"
            onClick={copyToClipboard}
            className="mt-2 font-mono text-[10px] tracking-[0.2em] uppercase px-4 py-2 bg-[#e8c84a] text-[#0f0f0f] hover:opacity-90 transition-opacity"
            style={{ borderRadius: 0 }}
          >
            {copied ? t.admin.announcementCopied : t.admin.copyAnnouncement}
          </button>
        </>
      )}
      {loading && (
        <p className="font-mono text-[12px] text-[#888888] mt-2">…</p>
      )}
    </section>
  );
}
