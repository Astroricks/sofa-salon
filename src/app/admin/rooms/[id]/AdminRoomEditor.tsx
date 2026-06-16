'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import RoomEditor from '@/components/RoomEditor';
import type { FurniturePiece } from '@/lib/furniture';
import type { Decoration } from '@/lib/furniture';
import { useLocale } from '@/components/LocaleProvider';

interface Props {
  roomId: string;
  initialName: string;
  initialFurniture: unknown[];
  initialDecorations: unknown[];
  canvasW: number;
  canvasH: number;
  initialRoomBackgroundId: string;
}

export default function AdminRoomEditor({
  roomId,
  initialName,
  initialFurniture,
  initialDecorations,
  canvasW,
  canvasH,
  initialRoomBackgroundId,
}: Props) {
  const router = useRouter();
  const { t } = useLocale();
  const [name, setName] = useState(initialName);
  const [savingName, setSavingName] = useState(false);
  const [roomBackgroundId, setRoomBackgroundId] = useState(initialRoomBackgroundId);
  const [savingBg, setSavingBg] = useState(false);

  const handleSaveName = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSavingName(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data?.error ?? t.admin.roomSaveNameFailed);
      }
    } finally {
      setSavingName(false);
    }
  };

  const handleBackgroundChange = async (id: string) => {
    setRoomBackgroundId(id);
    setSavingBg(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_background_id: id }),
      });
      if (res.ok) router.refresh();
    } finally {
      setSavingBg(false);
    }
  };

  const handleSave = async (
    furniture: FurniturePiece[],
    decorations: Decoration[]
  ) => {
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: roomId,
        name,
        furniture,
        decorations,
        canvasW,
        canvasH,
        roomBackgroundId,
      }),
    });
    const data = await res.json();
    if (data.room) {
      router.refresh();
    }
  };

  return (
    <>
      {/* Row 1: Back | Name | Save name */}
      <div className="flex flex-wrap items-center gap-4 pl-6 pr-4 py-3 border-b border-[#2a2a2a] bg-[#161616] shrink-0">
        <Link
          href="/admin/rooms"
          className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] hover:text-[#e8c84a] shrink-0 transition-colors"
        >
          {t.admin.backToRooms}
        </Link>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSaveName();
            }
          }}
          className="bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8c84a] font-serif text-xl outline-none px-3 py-2 flex-1 min-w-0 focus:border-[#e8c84a] placeholder:text-[#444444]"
          placeholder={t.admin.roomNamePlaceholder}
          style={{ borderRadius: 0 }}
          aria-label={t.admin.roomName}
        />
        <button
          type="button"
          onClick={handleSaveName}
          disabled={savingName}
          className="shrink-0 font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] hover:text-[#e8c84a] transition-colors disabled:opacity-50"
          title={t.admin.saveName}
        >
          {t.admin.saveName}
        </button>
      </div>
      <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
        <RoomEditor
          initialFurniture={initialFurniture as FurniturePiece[]}
          initialDecorations={initialDecorations as Decoration[]}
          canvasW={canvasW}
          canvasH={canvasH}
          onSave={handleSave}
          roomBackgroundId={roomBackgroundId}
          onRoomBackgroundChange={handleBackgroundChange}
        />
      </div>
    </>
  );
}
