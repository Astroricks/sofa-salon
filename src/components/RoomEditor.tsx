'use client';

import { useState, useRef, useCallback } from 'react';
import {
  FurniturePiece,
  FurnitureType,
  newFurniturePiece,
  roomCapacity,
  SEAT_RULES,
  canSqueeze,
  type Decoration,
  type DecorationType,
} from '@/lib/furniture';
import FurnitureSVG from '@/components/FurnitureSVG';
import DecorationSVG from '@/components/DecorationSVG';

/** Same 8 presets for all furniture types (sofa/chair spec) */
const COLOUR_PRESETS = [
  '#7a5230',
  '#5c3d1e',
  '#3d2a14',
  '#1e3a2a',
  '#2a1e3a',
  '#3a1e1e',
  '#1e2a3a',
  '#2a2a1e',
];

interface Props {
  initialFurniture: FurniturePiece[];
  initialDecorations: Decoration[];
  canvasW: number;
  canvasH: number;
  onSave: (furniture: FurniturePiece[], decorations: Decoration[]) => void | Promise<void>;
}

export default function RoomEditor({
  initialFurniture,
  initialDecorations,
  canvasW,
  canvasH,
  onSave,
}: Props) {
  const [furniture, setFurniture] = useState<FurniturePiece[]>(initialFurniture);
  const [decorations, setDecorations] = useState<Decoration[]>(initialDecorations);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDecoId, setSelectedDecoId] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
    isDeco: boolean;
  } | null>(null);

  const toSVGCoords = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    return pt.matrixTransform(svg.getScreenCTM()!.inverse());
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent, id: string, isDeco: boolean) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      const svgPt = toSVGCoords(e.clientX, e.clientY);
      if (isDeco) {
        const deco = decorations.find((d) => d.id === id);
        if (!deco) return;
        dragRef.current = {
          id,
          offsetX: svgPt.x - deco.x,
          offsetY: svgPt.y - deco.y,
          isDeco: true,
        };
        setSelectedDecoId(id);
        setSelectedId(null);
      } else {
        const piece = furniture.find((f) => f.id === id);
        if (!piece) return;
        dragRef.current = {
          id,
          offsetX: svgPt.x - piece.x,
          offsetY: svgPt.y - piece.y,
          isDeco: false,
        };
        setSelectedId(id);
        setSelectedDecoId(null);
      }
    },
    [furniture, decorations, toSVGCoords]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragRef.current || !svgRef.current) return;
      const svgPt = toSVGCoords(e.clientX, e.clientY);
      const { id, offsetX, offsetY, isDeco } = dragRef.current;
      if (isDeco) {
        setDecorations((prev) =>
          prev.map((d) =>
            d.id === id
              ? { ...d, x: Math.round(svgPt.x - offsetX), y: Math.round(svgPt.y - offsetY) }
              : d
          )
        );
      } else {
        setFurniture((prev) =>
          prev.map((f) =>
            f.id === id
              ? {
                  ...f,
                  x: Math.round(svgPt.x - offsetX),
                  y: Math.round(svgPt.y - offsetY),
                }
              : f
          )
        );
      }
    },
    [toSVGCoords]
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const addFurniture = (type: FurnitureType) => {
    const piece = newFurniturePiece(type, canvasW / 2, canvasH / 2);
    setFurniture((prev) => [...prev, piece]);
    setSelectedId(piece.id);
    setSelectedDecoId(null);
  };

  const addDecoration = (type: DecorationType) => {
    const newDeco: Decoration = {
      id: `d-${Date.now()}`,
      type,
      x: canvasW / 2,
      y: canvasH / 2,
      rotation: 0,
    };
    setDecorations((prev) => [...prev, newDeco]);
    setSelectedDecoId(newDeco.id);
    setSelectedId(null);
  };

  const updateDecoration = (id: string, updates: Partial<Decoration>) => {
    setDecorations((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
  };

  const deleteFurniture = (id: string) => {
    setFurniture((prev) => prev.filter((f) => f.id !== id));
    setSelectedId(null);
  };

  const deleteDecoration = (id: string) => {
    setDecorations((prev) => prev.filter((d) => d.id !== id));
    setSelectedDecoId(null);
  };

  const updatePiece = (id: string, updates: Partial<FurniturePiece>) => {
    setFurniture((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const selected = furniture.find((f) => f.id === selectedId);
  const selectedDeco = decorations.find((d) => d.id === selectedDecoId);
  const capacity = roomCapacity(furniture);

  return (
    <div className="flex flex-col md:flex-row gap-0 h-full">
      {/* Mobile warning */}
      <div className="md:hidden bg-[#1e1e1e] border-b border-[#f87171] px-4 py-2 text-[#f87171] font-mono text-[10px] tracking-[0.2em] uppercase text-center">
        Room editor works best on desktop.
      </div>

      {/* Toolbar */}
      <div className="w-full md:w-36 bg-[#161616] border-b md:border-b-0 md:border-r border-[#2a2a2a] p-3 flex flex-row md:flex-col gap-2 shrink-0 flex-wrap">
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-1 w-full">
          Add furniture
        </p>
        {(['sofa', 'sofa-l', 'chair', 'bench', 'cushion'] as FurnitureType[]).map(
          (type) => (
            <button
              key={type}
              type="button"
              onClick={() => addFurniture(type)}
              className="text-left font-mono text-[10px] px-3 py-2 bg-[#1e1e1e] hover:border-[#e8c84a] text-[#e8e4dc] hover:text-[#e8c84a] transition-colors border border-[#2a2a2a] min-w-[80px]"
              style={{ borderRadius: 0 }}
            >
              + {type}
            </button>
          )
        )}
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mt-4 mb-1 w-full">
          Decor
        </p>
        {(
          [
            'plant',
            'lamp',
            'table',
            'bookshelf',
            'tv',
            'coffee-table',
          ] as DecorationType[]
        ).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => addDecoration(type)}
            className="text-left font-mono text-[10px] px-3 py-2 bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] hover:border-[#e8c84a] hover:text-[#e8c84a] transition-colors min-w-[80px]"
            style={{ borderRadius: 0 }}
          >
            + {type}
          </button>
        ))}
        <div className="mt-auto pt-4 border-t border-[#2a2a2a] w-full">
          <p className="font-mono text-[10px] text-[#888888] mb-1">Total seats</p>
          <p className="text-[#e8c84a] text-xl font-mono">{capacity}</p>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto bg-[#2a2218] relative min-h-[300px]">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${canvasW} ${canvasH}`}
          width={canvasW}
          height={canvasH}
          className="max-w-full h-auto block pixel"
          style={{ imageRendering: 'pixelated' }}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onClick={(e) => {
            if (e.target === svgRef.current) {
              setSelectedId(null);
              setSelectedDecoId(null);
            }
          }}
        >
          <rect width={canvasW} height={canvasH} fill="#2a2218" />
          {Array.from({ length: Math.floor(canvasH / 40) }, (_, i) => (
            <line
              key={`h-${i}`}
              x1={0}
              y1={(i + 1) * 40}
              x2={canvasW}
              y2={(i + 1) * 40}
              stroke="#252015"
              strokeWidth={1}
            />
          ))}
          {Array.from({ length: Math.floor(canvasW / 40) }, (_, i) => (
            <line
              key={`v-${i}`}
              x1={(i + 1) * 40}
              y1={0}
              x2={(i + 1) * 40}
              y2={canvasH}
              stroke="#252015"
              strokeWidth={1}
            />
          ))}
          {decorations.map((d) => (
            <g
              key={d.id}
              onPointerDown={(e) => onPointerDown(e, d.id, true)}
              style={{ cursor: 'grab', userSelect: 'none' }}
            >
              <DecorationSVG decoration={d} />
            </g>
          ))}
          {furniture.map((piece) => (
            <g
              key={piece.id}
              onPointerDown={(e) => onPointerDown(e, piece.id, false)}
              style={{ cursor: 'grab', userSelect: 'none' }}
            >
              <FurnitureSVG
                piece={piece}
                selected={selectedId === piece.id}
                onSelect={() => setSelectedId(piece.id)}
              />
            </g>
          ))}
        </svg>
      </div>

      {/* Properties panel */}
      <div className="w-full md:w-52 bg-[#161616] border-t md:border-t-0 md:border-l border-[#2a2a2a] p-4 shrink-0 overflow-y-auto">
        {selected ? (
          <>
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#e8c84a] mb-4">
              {selected.type}
            </p>
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2">
              Colour
            </p>
            <div className="grid grid-cols-4 gap-1 mb-3">
              {COLOUR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => updatePiece(selected.id, { color: c })}
                  style={{ backgroundColor: c, borderRadius: 0 }}
                  className={`w-full aspect-square border-2 transition-colors ${
                    selected.color === c
                      ? 'border-[#e8c84a]'
                      : 'border-transparent hover:border-[#888888]'
                  }`}
                />
              ))}
            </div>
            <label
              htmlFor="room-editor-color-picker"
              className="flex items-center gap-2 cursor-pointer mb-3"
            >
              <div
                style={{ backgroundColor: selected.color, borderRadius: 0 }}
                className="w-8 h-8 border border-[#2a2a2a] flex-shrink-0"
              />
              <span className="font-mono text-[13px] text-[#888888]">Custom</span>
              <input
                type="color"
                value={selected.color}
                onChange={(e) => updatePiece(selected.id, { color: e.target.value })}
                className="opacity-0 absolute w-0 h-0"
                id="room-editor-color-picker"
              />
            </label>
            {!SEAT_RULES[selected.type].fixed && (
              <>
                <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-1">
                  Seats ({SEAT_RULES[selected.type].minSeats}–
                  {SEAT_RULES[selected.type].maxSeats})
                </label>
                <input
                  type="range"
                  min={SEAT_RULES[selected.type].minSeats}
                  max={SEAT_RULES[selected.type].maxSeats}
                  value={selected.seats}
                  onChange={(e) =>
                    updatePiece(selected.id, { seats: +e.target.value })
                  }
                  className="w-full mb-1"
                />
                <p className="text-[#e8c84a] text-[13px] font-mono mb-3">
                  {selected.seats} seats
                </p>
              </>
            )}
            {canSqueeze(selected) && (
              <>
                <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-1">
                  Squeeze extra
                </label>
                <input
                  type="range"
                  min={0}
                  max={2}
                  value={selected.squeezeExtra}
                  onChange={(e) =>
                    updatePiece(selected.id, { squeezeExtra: +e.target.value })
                  }
                  className="w-full mb-1"
                />
                <p className="font-mono text-[10px] text-[#888888] mb-3">
                  +{selected.squeezeExtra} when full
                </p>
              </>
            )}
            <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-1">Rotation</label>
            <div className="grid grid-cols-4 gap-1 mb-3">
              {([0, 90, 180, 270] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => updatePiece(selected.id, { rotation: r })}
                  className={`font-mono text-[10px] py-1 border transition-colors min-h-[36px] ${
                    selected.rotation === r
                      ? 'bg-[#e8c84a] text-[#0f0f0f] border-[#e8c84a]'
                      : 'bg-[#1e1e1e] text-[#888888] border-[#2a2a2a] hover:border-[#e8c84a] hover:text-[#e8c84a]'
                  }`}
                  style={{ borderRadius: 0 }}
                >
                  {r}°
                </button>
              ))}
            </div>
            {selected.type === 'sofa-l' && (
              <>
                <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-1">
                  L direction
                </label>
                <select
                  value={selected.lOrientation}
                  onChange={(e) =>
                    updatePiece(selected.id, {
                      lOrientation: e.target.value as FurniturePiece['lOrientation'],
                    })
                  }
                  className="w-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] p-2 mb-3 outline-none focus:border-[#e8c84a]"
                  style={{ borderRadius: 0 }}
                >
                  <option value="bottom-right">└ bottom-right</option>
                  <option value="bottom-left">┘ bottom-left</option>
                  <option value="top-right">┐ top-right</option>
                  <option value="top-left">┌ top-left</option>
                </select>
              </>
            )}
            <button
              type="button"
              onClick={() => deleteFurniture(selected.id)}
              className="w-full font-mono text-[10px] tracking-[0.2em] uppercase py-2 border border-[#f87171] text-[#f87171] hover:opacity-85 transition-opacity mt-2"
              style={{ borderRadius: 0 }}
            >
              Delete
            </button>
          </>
        ) : selectedDeco ? (
          <>
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#e8c84a] mb-4">
              {selectedDeco.type}
            </p>
            <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-1">Rotation</label>
            <div className="grid grid-cols-4 gap-1 mb-3">
              {([0, 90, 180, 270] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => updateDecoration(selectedDeco.id, { rotation: r })}
                  className={`font-mono text-[10px] py-1 border transition-colors min-h-[36px] ${
                    (selectedDeco.rotation ?? 0) === r
                      ? 'bg-[#e8c84a] text-[#0f0f0f] border-[#e8c84a]'
                      : 'bg-[#1e1e1e] text-[#888888] border-[#2a2a2a] hover:border-[#e8c84a] hover:text-[#e8c84a]'
                  }`}
                  style={{ borderRadius: 0 }}
                >
                  {r}°
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => deleteDecoration(selectedDeco.id)}
              className="w-full font-mono text-[10px] tracking-[0.2em] uppercase py-2 border border-[#f87171] text-[#f87171] hover:opacity-85 transition-opacity"
              style={{ borderRadius: 0 }}
            >
              Delete
            </button>
          </>
        ) : (
          <p className="font-mono text-[13px] text-[#888888]">
            Click a piece to select it.
          </p>
        )}
        <button
          type="button"
          onClick={async () => {
            await Promise.resolve(onSave(furniture, decorations));
            setSavedFlash(true);
            setTimeout(() => setSavedFlash(false), 2000);
          }}
          className="w-full mt-6 bg-[#e8c84a] text-[#0f0f0f] font-mono text-[10px] tracking-[0.2em] uppercase py-3 min-h-[44px] hover:opacity-85 active:scale-[0.97] transition-all"
          style={{ borderRadius: 0 }}
        >
          Save Room
        </button>
        {savedFlash && (
          <p className="font-mono text-[13px] text-[#4ade80] mt-2">Saved</p>
        )}
      </div>
    </div>
  );
}
