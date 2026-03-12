'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import RoomEditor from '@/components/RoomEditor';
import type { FurniturePiece } from '@/lib/furniture';
import type { Decoration } from '@/lib/furniture';

interface Props {
  roomId: string;
  initialName: string;
  initialFurniture: unknown[];
  initialDecorations: unknown[];
  canvasW: number;
  canvasH: number;
}

export default function AdminRoomEditor({
  roomId,
  initialName,
  initialFurniture,
  initialDecorations,
  canvasW,
  canvasH,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);

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
      }),
    });
    const data = await res.json();
    if (data.room) {
      router.refresh();
    }
  };

  return (
    <>
      <div className="flex items-center gap-4 px-4 py-3 border-b border-[#2a2a2a] bg-[#161616]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8c84a] font-serif text-xl outline-none px-3 py-2 flex-1 min-w-0 focus:border-[#e8c84a] placeholder:text-[#444444]"
          placeholder="Room name"
          style={{ borderRadius: 0 }}
        />
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] shrink-0">Room name</span>
      </div>
      <div className="flex-1 overflow-hidden min-h-0">
        <RoomEditor
          initialFurniture={initialFurniture as FurniturePiece[]}
          initialDecorations={initialDecorations as Decoration[]}
          canvasW={canvasW}
          canvasH={canvasH}
          onSave={handleSave}
        />
      </div>
    </>
  );
}
