'use client';

import { useState, useRef, useCallback } from 'react';
import {
  FurniturePiece,
  FurnitureType,
  newFurniturePiece,
  roomCapacity,
  ROOM_BACKGROUND_PRESETS,
  SEAT_RULES,
  canSqueeze,
  DECORATION_SCALE_MAX,
  DECORATION_SCALE_MIN,
  decorationScale,
  normalizeDecoration,
  type Decoration,
  type DecorationType,
  type PlantVariant,
} from '@/lib/furniture';
import FurnitureSVG from '@/components/FurnitureSVG';
import DecorationSVG from '@/components/DecorationSVG';
import { useLocale } from '@/components/LocaleProvider';

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
  /** When provided (e.g. in admin), canvas background uses this preset and shows room background row above furniture tools */
  roomBackgroundId?: string;
  onRoomBackgroundChange?: (id: string) => void;
}

export default function RoomEditor({
  initialFurniture,
  initialDecorations,
  canvasW,
  canvasH,
  onSave,
  roomBackgroundId,
  onRoomBackgroundChange,
}: Props) {
  const [furniture, setFurniture] = useState<FurniturePiece[]>(initialFurniture);
  const [decorations, setDecorations] = useState<Decoration[]>(() =>
    initialDecorations.map(normalizeDecoration)
  );
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
      color:
        type === 'lamp' || type === 'floor-lamp'
          ? '#c8a060'
          : type === 'table'
            ? '#4a3820'
            : type === 'tv'
              ? '#0d1a2e'
              : type === 'speaker'
                ? '#2a2a2a'
              : type === 'rug'
                ? '#4a3820'
                : undefined,
      scale: 1,
      plantVariant: type === 'plant' ? 'cactus' : undefined,
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
  const { t, locale } = useLocale();
  const re = t.admin.roomEditor;
  const isZh = locale === 'zh';
  const bgPreset = roomBackgroundId
    ? ROOM_BACKGROUND_PRESETS.find((p) => p.id === roomBackgroundId)
    : null;
  const canvasFill = bgPreset?.fill ?? '#2a2218';
  const canvasLineFill = bgPreset?.lineFill ?? '#252015';
  const showRoomBackgroundRow = roomBackgroundId != null && onRoomBackgroundChange != null;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Mobile warning */}
      <div className="md:hidden bg-[#1e1e1e] border-b border-[#f87171] px-4 py-2 text-[#f87171] font-mono text-[10px] tracking-[0.2em] uppercase text-center shrink-0">
        {re.worksBest}
      </div>

      {/* Row: Room background (admin only, above furniture tools) */}
      {showRoomBackgroundRow && (
        <div className="shrink-0 border-b border-[#2a2a2a] bg-[#161616] px-3 py-2">
          <div className="flex items-center gap-2 flex-nowrap">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] shrink-0">
              {t.admin.roomBackground}
            </span>
            <select
              value={roomBackgroundId}
              onChange={(e) => onRoomBackgroundChange(e.target.value)}
              className="bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] px-2 py-1.5 outline-none focus:border-[#e8c84a] shrink-0"
              style={{ borderRadius: 0 }}
              aria-label={t.admin.roomBackground}
            >
              {ROOM_BACKGROUND_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {isZh ? p.name_zh : p.name_en}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Row: Furniture + Decor horizontal strip (1–2 rows, scrollable) */}
      <div className="shrink-0 border-b border-[#2a2a2a] bg-[#161616] overflow-x-auto">
        <div className="p-3 flex flex-col gap-2 min-w-0">
          <div className="flex items-center gap-2 flex-nowrap">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] shrink-0">
              {re.add}
            </span>
            {(
              [
                'sofa',
                'sofa-l',
                'chair',
                'bench',
                'cushion',
                'floor',
                'bean-bag',
              ] as FurnitureType[]
            ).map(
              (type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => addFurniture(type)}
                  className="font-mono text-[10px] px-3 py-2 bg-[#1e1e1e] hover:border-[#e8c84a] text-[#e8e4dc] hover:text-[#e8c84a] transition-colors border border-[#2a2a2a] shrink-0"
                  style={{ borderRadius: 0 }}
                >
                  + {re.furnitureTypes[type]}
                </button>
              )
            )}
            <span className="font-mono text-[10px] text-[#444444] mx-1 shrink-0">|</span>
            {furniture.map((piece) => (
              <button
                key={piece.id}
                type="button"
                onClick={() => { setSelectedId(piece.id); setSelectedDecoId(null); }}
                className={`font-mono text-[10px] px-3 py-2 border shrink-0 transition-colors ${
                  selectedId === piece.id
                    ? 'bg-[#e8c84a] text-[#0f0f0f] border-[#e8c84a]'
                    : 'bg-[#1e1e1e] text-[#e8e4dc] border-[#2a2a2a] hover:border-[#e8c84a] hover:text-[#e8c84a]'
                }`}
                style={{ borderRadius: 0 }}
              >
                {re.furnitureTypes[piece.type]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-nowrap">
            <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] shrink-0">
              {re.decor}
            </span>
            {(
              [
                'plant',
                'lamp',
                'floor-lamp',
                'table',
                'rug',
                'tv',
                'projector-screen',
                'speaker',
                'coffee-table',
              ] as DecorationType[]
            ).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => addDecoration(type)}
                className="font-mono text-[10px] px-3 py-2 bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] hover:border-[#e8c84a] hover:text-[#e8c84a] transition-colors shrink-0"
                style={{ borderRadius: 0 }}
              >
                + {re.decorationTypes[type]}
              </button>
            ))}
            <span className="font-mono text-[10px] text-[#444444] mx-1 shrink-0">|</span>
            {decorations.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => { setSelectedDecoId(d.id); setSelectedId(null); }}
                className={`font-mono text-[10px] px-3 py-2 border shrink-0 transition-colors ${
                  selectedDecoId === d.id
                    ? 'bg-[#e8c84a] text-[#0f0f0f] border-[#e8c84a]'
                    : 'bg-[#1e1e1e] text-[#e8e4dc] border-[#2a2a2a] hover:border-[#e8c84a] hover:text-[#e8c84a]'
                }`}
                style={{ borderRadius: 0 }}
              >
                {re.decorationTypes[d.type]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row: Room view (smaller) + Save Room panel */}
      <div className="flex-1 flex flex-col md:flex-row gap-0 min-h-0">
        {/* Canvas: fills available height, no scrollbar; SVG scales to fit */}
        <div
          className="flex-1 overflow-hidden relative min-h-[200px]"
          style={{ backgroundColor: canvasFill }}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${canvasW} ${canvasH}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full block pixel"
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
          <rect width={canvasW} height={canvasH} fill={canvasFill} />
          {Array.from({ length: Math.floor(canvasH / 40) }, (_, i) => (
            <line
              key={`h-${i}`}
              x1={0}
              y1={(i + 1) * 40}
              x2={canvasW}
              y2={(i + 1) * 40}
              stroke={canvasLineFill}
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
              stroke={canvasLineFill}
              strokeWidth={1}
            />
          ))}
          {/* Layer order: rug (bottom) → furniture → other decorations (top) */}
          {decorations.filter((d) => d.type === 'rug').map((d) => (
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
          {decorations.filter((d) => d.type !== 'rug').map((d) => (
            <g
              key={d.id}
              onPointerDown={(e) => onPointerDown(e, d.id, true)}
              style={{ cursor: 'grab', userSelect: 'none' }}
            >
              <DecorationSVG decoration={d} />
            </g>
          ))}
          </svg>
          {/* Total Seats overlay on room view corner */}
          <div
            className="absolute bottom-3 right-3 z-10 bg-[#0f0f0f]/95 border border-[#e8c84a] px-3 py-2 pointer-events-none"
            style={{ borderRadius: 0 }}
          >
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888]">{re.totalSeats}</p>
            <p className="text-[#e8c84a] text-xl font-mono">{capacity}</p>
          </div>
        </div>

        {/* Properties panel + Save Room */}
      <div className="room-editor-sidebar w-full md:w-52 bg-[#161616] border-t md:border-t-0 md:border-l border-[#2a2a2a] p-4 shrink-0 overflow-y-auto min-h-0">
        {selected ? (
          <>
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#e8c84a] mb-4">
              {re.furnitureTypes[selected.type]}
            </p>
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2">
              {re.colour}
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
              <span className="font-mono text-[13px] text-[#888888]">{re.custom}</span>
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
                  {re.seats} ({SEAT_RULES[selected.type].minSeats}–
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
                  {re.squeezeWhenFull.replace('{n}', String(selected.squeezeExtra))}
                </p>
              </>
            )}
            <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-1">{re.rotation}</label>
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
                  {re.lDirection}
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
                  <option value="bottom-right">{re.lOrientation['bottom-right']}</option>
                  <option value="bottom-left">{re.lOrientation['bottom-left']}</option>
                  <option value="top-right">{re.lOrientation['top-right']}</option>
                  <option value="top-left">{re.lOrientation['top-left']}</option>
                </select>
              </>
            )}
            <button
              type="button"
              onClick={() => deleteFurniture(selected.id)}
              className="w-full font-mono text-[10px] tracking-[0.2em] uppercase py-2 border border-[#f87171] text-[#f87171] hover:opacity-85 transition-opacity mt-2"
              style={{ borderRadius: 0 }}
            >
              {re.delete}
            </button>
          </>
        ) : selectedDeco ? (
          <>
            <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#e8c84a] mb-4">
              {re.decorationTypes[selectedDeco.type]}
            </p>
            {(['lamp', 'floor-lamp', 'table', 'tv', 'rug', 'speaker'] as DecorationType[]).includes(selectedDeco.type) && (
              <>
                <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-2">{re.colour}</p>
                <div className="grid grid-cols-4 gap-1 mb-3">
                  {COLOUR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateDecoration(selectedDeco.id, { color: c })}
                      style={{ backgroundColor: c, borderRadius: 0 }}
                      className={`w-full aspect-square border-2 transition-colors ${
                        (selectedDeco.color ?? '') === c ? 'border-[#e8c84a]' : 'border-transparent hover:border-[#888888]'
                      }`}
                    />
                  ))}
                </div>
                <label htmlFor="deco-color-picker" className="flex items-center gap-2 cursor-pointer mb-3">
                  <div
                    style={{ backgroundColor: selectedDeco.color ?? '#888', borderRadius: 0 }}
                    className="w-8 h-8 border border-[#2a2a2a] flex-shrink-0"
                  />
                  <span className="font-mono text-[13px] text-[#888888]">{re.custom}</span>
                  <input
                    type="color"
                    value={selectedDeco.color ?? '#888888'}
                    onChange={(e) => updateDecoration(selectedDeco.id, { color: e.target.value })}
                    className="opacity-0 absolute w-0 h-0"
                    id="deco-color-picker"
                  />
                </label>
              </>
            )}
            {selectedDeco.type === 'plant' && (
              <>
                <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-1">
                  {re.plantVariety}
                </label>
                <select
                  value={selectedDeco.plantVariant ?? 'monstera'}
                  onChange={(e) =>
                    updateDecoration(selectedDeco.id, {
                      plantVariant: e.target.value as PlantVariant,
                    })
                  }
                  className="w-full bg-[#1e1e1e] border border-[#2a2a2a] text-[#e8e4dc] font-mono text-[13px] p-2 mb-3 outline-none focus:border-[#e8c84a]"
                  style={{ borderRadius: 0 }}
                >
                  {(
                    [
                      'cactus',
                      'maidenhair-fern',
                      'spider-plant',
                      'monstera',
                      'umbrella-tree',
                    ] as PlantVariant[]
                  ).map((variant) => (
                    <option key={variant} value={variant}>
                      {re.plantVariants[variant]}
                    </option>
                  ))}
                </select>
              </>
            )}
            <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-1">{re.scale}</label>
            <input
              type="range"
              min={DECORATION_SCALE_MIN}
              max={DECORATION_SCALE_MAX}
              step={0.1}
              value={decorationScale(selectedDeco)}
              onChange={(e) => updateDecoration(selectedDeco.id, { scale: parseFloat(e.target.value) })}
              className="w-full mb-1"
            />
            <p className="font-mono text-[13px] text-[#e8c84a] mb-3">
              {decorationScale(selectedDeco).toFixed(1)}×
            </p>
            <label className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#888888] mb-1">{re.rotation}</label>
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
              {re.delete}
            </button>
          </>
        ) : (
          <p className="font-mono text-[13px] text-[#888888]">
            {re.clickToSelect}
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
          {re.saveRoom}
        </button>
        {savedFlash && (
          <p className="font-mono text-[13px] text-[#4ade80] mt-2">{re.saved}</p>
        )}
      </div>
      </div>
    </div>
  );
}
