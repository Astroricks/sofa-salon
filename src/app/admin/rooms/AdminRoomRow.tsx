'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/components/LocaleProvider';

interface Room {
  id: string;
  name: string;
  created_at: string;
}

export default function AdminRoomRow({ room }: { room: Room }) {
  const router = useRouter();
  const { t } = useLocale();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(t.admin.deleteRoomConfirm)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/rooms/${room.id}`, { method: 'DELETE' });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data?.error ?? t.admin.roomDeleteFailed);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <li className="group flex items-center gap-2 border border-[#2a2a2a] bg-[#161616] hover:border-[#e8c84a] transition-colors" style={{ borderRadius: 0 }}>
      <Link
        href={`/admin/rooms/${room.id}`}
        className="flex-1 min-w-0 p-4 flex items-center justify-between"
      >
        <span className="font-mono text-[13px] text-[#e8e4dc]">{room.name}</span>
        <span className="font-mono text-[13px] text-[#444444] ml-2 shrink-0">
          {new Date(room.created_at).toLocaleDateString()}
        </span>
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="shrink-0 mr-3 font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] hover:text-[#f87171] transition-colors disabled:opacity-50"
        title={t.admin.deleteRoom}
      >
        {t.admin.deleteRoom}
      </button>
    </li>
  );
}
