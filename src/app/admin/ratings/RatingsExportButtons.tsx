'use client';

import { useLocale } from '@/components/LocaleProvider';

export interface RatingsExportRow {
  id: string;
  title: string;
  description: string | null;
  year: number | null;
  director: string | null;
  duration_minutes: number | null;
  screening_at: string;
  attendance_count: number;
  rating_count: number;
  rating_avg: number;
}

function escapeCsvValue(val: string | number | null | undefined): string {
  if (val == null) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(rows: RatingsExportRow[], headers: readonly string[]): string {
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(
      [
        escapeCsvValue(r.title),
        escapeCsvValue(r.description ?? ''),
        escapeCsvValue(r.year ?? ''),
        escapeCsvValue(r.director ?? ''),
        escapeCsvValue(r.duration_minutes ?? ''),
        escapeCsvValue(r.screening_at),
        escapeCsvValue(r.attendance_count),
        escapeCsvValue(r.rating_count),
        escapeCsvValue(r.rating_count > 0 ? r.rating_avg.toFixed(2) : ''),
      ].join(',')
    );
  }
  return lines.join('\r\n');
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  data: RatingsExportRow[];
}

export default function RatingsExportButtons({ data }: Props) {
  const { t } = useLocale();

  const handleExportCsv = () => {
    const csv = toCsv(data, [
      t.admin.ratingsCsvHeaders.title,
      t.admin.ratingsCsvHeaders.description,
      t.admin.ratingsCsvHeaders.year,
      t.admin.ratingsCsvHeaders.director,
      t.admin.ratingsCsvHeaders.duration,
      t.admin.ratingsCsvHeaders.screeningDate,
      t.admin.ratingsCsvHeaders.attendanceCount,
      t.admin.ratingsCsvHeaders.ratingCount,
      t.admin.ratingsCsvHeaders.averageRating,
    ]);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const date = new Date().toISOString().slice(0, 10);
    downloadBlob(blob, `ratings-report-${date}.csv`);
  };

  const handleExportJson = () => {
    const json = JSON.stringify({ screenings: data }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const date = new Date().toISOString().slice(0, 10);
    downloadBlob(blob, `ratings-report-${date}.json`);
  };

  if (data.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <button
        type="button"
        onClick={handleExportCsv}
        className="font-mono text-[10px] tracking-[0.2em] uppercase px-4 py-2 border border-[#e8c84a] text-[#e8c84a] hover:opacity-85 transition-opacity"
        style={{ borderRadius: 0 }}
      >
        {t.admin.exportCSV}
      </button>
      <button
        type="button"
        onClick={handleExportJson}
        className="font-mono text-[10px] tracking-[0.2em] uppercase px-4 py-2 border border-[#2a2a2a] text-[#888888] hover:border-[#e8c84a] hover:text-[#e8c84a] transition-colors"
        style={{ borderRadius: 0 }}
      >
        {t.admin.exportJSON}
      </button>
    </div>
  );
}
