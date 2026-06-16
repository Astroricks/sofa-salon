'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import RoomEditor from '@/components/RoomEditor';
import type { FurniturePiece } from '@/lib/furniture';
import type { Decoration } from '@/lib/furniture';
import { useLocale } from '@/components/LocaleProvider';

export default function NewRoomPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [name, setName] = useState<string>(t.admin.roomDefaultName);

  const handleSave = async (
    furniture: FurniturePiece[],
    decorations: Decoration[]
  ) => {
    const res = await fetch('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        furniture,
        decorations,
        canvasW: 600,
        canvasH: 400,
      }),
    });
    const data = await res.json();
    if (data.room) {
      router.push(`/admin/rooms/${data.room.id}`);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#0f0f0f]">
      <div className="flex items-center gap-4 px-4 py-3 border-b border-[#2a2a2a] bg-[#161616]">
        <Link
          href="/admin/rooms"
          className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] hover:text-[#e8c84a] shrink-0 transition-colors"
        >
          {t.admin.backToRooms}
        </Link>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8c84a] font-serif text-xl outline-none px-3 py-2 flex-1 min-w-0 focus:border-[#e8c84a] placeholder:text-[#444444]"
          placeholder={t.admin.roomNamePlaceholder}
          style={{ borderRadius: 0 }}
        />
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] shrink-0">
          {t.admin.roomName}
        </span>
      </div>
      <div className="flex-1 overflow-hidden min-h-0">
        <RoomEditor
          initialFurniture={[]}
          initialDecorations={[]}
          canvasW={600}
          canvasH={400}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
