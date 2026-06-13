export type FurnitureType =
  | 'sofa'
  | 'sofa-l'
  | 'chair'
  | 'bench'
  | 'cushion'
  | 'floor'
  | 'bean-bag';
export type DecorationType =
  | 'plant'
  /** Legacy saved values; normalized to plant variants by the room editor. */
  | 'plant-tall'
  | 'fern'
  | 'lamp'
  | 'floor-lamp'
  | 'table'
  | 'rug'
  | 'tv'
  | 'projector-screen'
  | 'speaker'
  | 'coffee-table';
export type PlantVariant =
  | 'cactus'
  | 'maidenhair-fern'
  | 'spider-plant'
  | 'monstera'
  | 'umbrella-tree';
export type LOrientation =
  | 'bottom-right'
  | 'bottom-left'
  | 'top-right'
  | 'top-left';

export interface FurniturePiece {
  id: string;
  type: FurnitureType;
  x: number;
  y: number;
  rotation: 0 | 90 | 180 | 270;
  color: string;
  seats: number;
  squeezeExtra: number;
  lOrientation?: LOrientation;
}

export type DecorationRotation = 0 | 90 | 180 | 270;

export interface Decoration {
  id: string;
  type: DecorationType;
  x: number;
  y: number;
  rotation?: DecorationRotation;
  /** Optional tint for lamp, table, tv, etc. */
  color?: string;
  /** Display scale for room decorations (0.5-2), default 1. */
  scale?: number;
  /** Botanical style when type is plant. */
  plantVariant?: PlantVariant;
}

export interface Room {
  id: string;
  name: string;
  furniture: FurniturePiece[];
  decorations: Decoration[];
  canvasW: number;
  canvasH: number;
}

/** 座位图房间背景预设（用户可选，存 localStorage）。 */
export const ROOM_BACKGROUND_PRESETS: Array<{
  id: string;
  name_zh: string;
  name_en: string;
  fill: string;
  lineFill: string;
}> = [
  { id: 'warm', name_zh: '暖黄', name_en: 'Warm', fill: '#2a2218', lineFill: '#252015' },
  { id: 'yellow-carpet', name_zh: '淡黄毯', name_en: 'Yellow carpet', fill: '#5a5344', lineFill: '#4d4638' },
  { id: 'cool', name_zh: '冷灰', name_en: 'Cool gray', fill: '#1a1a1a', lineFill: '#252525' },
  { id: 'neutral', name_zh: '中性灰', name_en: 'Neutral', fill: '#1e1e1e', lineFill: '#2a2a2a' },
  { id: 'slate', name_zh: '深灰蓝', name_en: 'Slate', fill: '#1a1d2e', lineFill: '#252a40' },
  { id: 'forest', name_zh: '暗绿', name_en: 'Forest', fill: '#1a2218', lineFill: '#202520' },
];


export const SEAT_RULES: Record<
  FurnitureType,
  {
    fixed: boolean;
    minSeats: number;
    maxSeats: number;
    canSqueeze: boolean;
    defaultSqueezeExtra: number;
  }
> = {
  sofa: {
    fixed: false,
    minSeats: 2,
    maxSeats: 6,
    canSqueeze: true,
    defaultSqueezeExtra: 1,
  },
  'sofa-l': {
    fixed: false,
    minSeats: 3,
    maxSeats: 8,
    canSqueeze: true,
    defaultSqueezeExtra: 1,
  },
  chair: {
    fixed: true,
    minSeats: 1,
    maxSeats: 1,
    canSqueeze: false,
    defaultSqueezeExtra: 0,
  },
  bench: {
    fixed: true,
    minSeats: 1,
    maxSeats: 1,
    canSqueeze: false,
    defaultSqueezeExtra: 0,
  },
  cushion: {
    fixed: true,
    minSeats: 1,
    maxSeats: 1,
    canSqueeze: false,
    defaultSqueezeExtra: 0,
  },
  floor: {
    fixed: true,
    minSeats: 1,
    maxSeats: 1,
    canSqueeze: false,
    defaultSqueezeExtra: 0,
  },
  'bean-bag': {
    fixed: true,
    minSeats: 1,
    maxSeats: 1,
    canSqueeze: false,
    defaultSqueezeExtra: 0,
  },
};

/** Whether this piece type allows an extra "squeeze" seat when the room is full (sofa, sofa-l only). */
export function canSqueeze(piece: FurniturePiece): boolean {
  return SEAT_RULES[piece.type].canSqueeze;
}

/** Splits L-sofa seats: 60% on long side, rest on short. Returns [longCount, shortCount]. */
export function lSofaSeatSplit(totalSeats: number): [number, number] {
  const longSide = Math.ceil(totalSeats * 0.6);
  return [longSide, totalSeats - longSide];
}

export interface SeatPos {
  seatKey: string;
  x: number;
  y: number;
}

export const FURNITURE_DIMS: Record<FurnitureType, { w: number; h: number }> = {
  sofa: { w: 56, h: 40 },
  'sofa-l': { w: 100, h: 80 },
  chair: { w: 44, h: 44 },
  bench: { w: 36, h: 30 },
  cushion: { w: 32, h: 32 },
  floor: { w: 40, h: 40 },
  'bean-bag': { w: 56, h: 56 },
};

/** Approximate axis-aligned bounds for decorations (from DecorationSVG). Center at (x,y). */
export const DECORATION_BOUNDS: Record<DecorationType, { w: number; h: number }> = {
  plant: { w: 38, h: 48 },
  'plant-tall': { w: 52, h: 92 },
  fern: { w: 72, h: 70 },
  lamp: { w: 36, h: 38 },
  'floor-lamp': { w: 56, h: 100 },
  table: { w: 60, h: 72 },
  rug: { w: 84, h: 54 },
  tv: { w: 160, h: 48 },
  'projector-screen': { w: 184, h: 44 },
  speaker: { w: 24, h: 36 },
  'coffee-table': { w: 152, h: 60 },
};

export const DECORATION_SCALE_MIN = 0.5;
export const DECORATION_SCALE_MAX = 2;

/** Normalizes decoration scale from saved JSON before using it in SVG geometry. */
export function decorationScale(decoration: Pick<Decoration, 'scale'>): number {
  const scale = decoration.scale ?? 1;
  if (!Number.isFinite(scale)) return 1;
  return Math.min(DECORATION_SCALE_MAX, Math.max(DECORATION_SCALE_MIN, scale));
}

export function normalizeDecoration(decoration: Decoration): Decoration {
  if (decoration.type === 'plant-tall') {
    return {
      ...decoration,
      type: 'plant',
      plantVariant: 'umbrella-tree',
    };
  }
  if (decoration.type === 'fern') {
    return {
      ...decoration,
      type: 'plant',
      plantVariant: 'maidenhair-fern',
    };
  }
  if (decoration.type === 'plant' && !decoration.plantVariant) {
    return {
      ...decoration,
      plantVariant: 'monstera',
    };
  }
  return decoration;
}

function rot(
  px: number,
  py: number,
  cx: number,
  cy: number,
  deg: number
): [number, number] {
  if (deg === 0) return [px, py];
  if (deg === 90) return [cx + (cy - py), cy - (cx - px)];
  if (deg === 180) return [2 * cx - px, 2 * cy - py];
  if (deg === 270) return [cx - (cy - py), cy + (cx - px)];
  return [px, py];
}

/**
 * Returns a user-facing label for a seat_key (e.g. "chair", "sofa", "squeeze").
 * Strips internal IDs like "chair-1773297376014:0" -> "chair".
 */
export function seatKeyToDisplayLabel(seatKey: string): string {
  const parts = seatKey.split(':');
  if (parts[1] === 'squeeze') return 'squeeze';
  const id = parts[0] ?? '';
  const withoutTrailingId = id.replace(/-\d+$/, '');
  return withoutTrailingId || id;
}

/**
 * 画布坐标系（与 CSS/Canvas 一致，旋转前以家具中心 (x,y) 为参考）：
 * - X 轴：正方向 = 屏幕向右。数值越大，座位越在右侧。
 * - Y 轴：正方向 = 屏幕向下。数值越大，座位越在屏幕下方。
 *
 * 若人物看起来“坐在地上”（太靠上），说明座位 Y 偏小，应把相关 offset 调大（更正的数），
 * 座位就会往屏幕下方移，人就会落在沙发上。
 */
export function getSeatPositions(piece: FurniturePiece): SeatPos[] {
  const positions: SeatPos[] = [];
  const { id, type, x, y, seats, rotation } = piece;

  if (type === 'sofa') {
    const seatW = 52;
    const totalW = seatW * seats;
    const startX = x - totalW / 2 + seatW / 2;
    /** 直沙发：座位在中心 y 下方的偏移。调大 = 座位整体下移（人更“坐进”沙发）。 */
    const sofaSeatOffsetY = 8;
    for (let i = 0; i < seats; i++) {
      const sx = startX + i * seatW;
      const sy = y + sofaSeatOffsetY;
      const [rx, ry] = rot(sx, sy, x, y, rotation);
      positions.push({ seatKey: `${id}:${i}`, x: rx, y: ry });
    }
  }

  if (type === 'sofa-l') {
    const [longN, shortN] = lSofaSeatSplit(seats);
    const seatW = 52;
    const lOr = piece.lOrientation ?? 'bottom-right';
    const longW = longN * seatW;
    const longStartX = x - longW / 2 + seatW / 2;
    /** 长边座位 Y 偏移。调大 = 长边上的座位整体下移。 */
    const longSeatOffsetY = 8;
    for (let i = 0; i < longN; i++) {
      const sx = longStartX + i * seatW;
      const sy = y + longSeatOffsetY;
      const [rx, ry] = rot(sx, sy, x, y, rotation);
      positions.push({ seatKey: `${id}:${i}`, x: rx, y: ry });
    }

    /**
     * 短边座位：与 FurnitureSVG 中 SofaLShape 的短边座垫几何一致。
     * 四种方向各自规则（局部坐标系，再统一用 rotation 旋转）：
     * - bottom-right: 短边在右、在下 → sx = x + (longW/2 - 38), sy = y + 57 + i*52
     * - bottom-left:  短边在左、在下 → sx = x - (longW/2 - 38), sy = y + 57 + i*52
     * - top-right:    短边在右、在上 → sx = x + (longW/2 - 38), sy = y - 57 - i*52
     * - top-left:     短边在左、在上 → sx = x - (longW/2 - 38), sy = y - 57 - i*52
     */
    const shortOffsetFromCenter = 38;
    const shortFirstSeatOffsetY = 57;
    const shortSeatPitch = 52;

    for (let i = 0; i < shortN; i++) {
      let sx: number;
      let sy: number;
      switch (lOr) {
        case 'bottom-right':
          sx = x + (longW / 2 - shortOffsetFromCenter);
          sy = y + (shortFirstSeatOffsetY + i * shortSeatPitch);
          break;
        case 'bottom-left':
          sx = x - (longW / 2 - shortOffsetFromCenter);
          sy = y + (shortFirstSeatOffsetY + i * shortSeatPitch);
          break;
        case 'top-right':
          sx = x + (longW / 2 - shortOffsetFromCenter);
          sy = y - (shortFirstSeatOffsetY + i * shortSeatPitch);
          break;
        case 'top-left':
          sx = x - (longW / 2 - shortOffsetFromCenter);
          sy = y - (shortFirstSeatOffsetY + i * shortSeatPitch);
          break;
        default:
          sx = x + (longW / 2 - shortOffsetFromCenter);
          sy = y + (shortFirstSeatOffsetY + i * shortSeatPitch);
      }
      const [rx, ry] = rot(sx, sy, x, y, rotation);
      positions.push({ seatKey: `${id}:${longN + i}`, x: rx, y: ry });
    }
  }

  if (type === 'chair' || type === 'bench' || type === 'cushion' || type === 'floor' || type === 'bean-bag') {
    const [rx, ry] = rot(x, y + 6, x, y, rotation);
    positions.push({ seatKey: `${id}:0`, x: rx, y: ry });
  }

  return positions;
}

export function getSqueezePositions(piece: FurniturePiece): SeatPos[] {
  if (!canSqueeze(piece) || piece.squeezeExtra === 0) return [];
  const midX = piece.x;
  const midY = piece.y + 8;
  const positions: SeatPos[] = [];
  for (let i = 0; i < piece.squeezeExtra; i++) {
    const offset = (i - (piece.squeezeExtra - 1) / 2) * 20;
    positions.push({
      seatKey: `${piece.id}:squeeze:${i}`,
      x: midX + offset,
      y: midY,
    });
  }
  return positions;
}

export function roomCapacity(furniture: FurniturePiece[]): number {
  return furniture.reduce((sum, f) => sum + f.seats, 0);
}

export function roomCapacityWithSqueeze(furniture: FurniturePiece[]): number {
  return furniture.reduce(
    (sum, f) => sum + f.seats + (canSqueeze(f) ? f.squeezeExtra : 0),
    0
  );
}

/** Axis-aligned bounding box of a rotated rect centered at (cx, cy). */
function pieceAABB(
  cx: number,
  cy: number,
  w: number,
  h: number,
  rotation: number
): { minX: number; minY: number; maxX: number; maxY: number } {
  const hw = w / 2;
  const hh = h / 2;
  const corners: [number, number][] = [
    [cx - hw, cy - hh],
    [cx + hw, cy - hh],
    [cx + hw, cy + hh],
    [cx - hw, cy + hh],
  ];
  const rotated = corners.map(([px, py]) => rot(px, py, cx, cy, rotation));
  const xs = rotated.map(([x]) => x);
  const ys = rotated.map(([, y]) => y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

/**
 * Bounding box of the "furniture area" (all furniture, decorations including TV, and seats).
 * Used on mobile to focus the view so the room doesn't feel empty. Desktop keeps full canvas.
 */
export function getFurnitureFocusBox(
  furniture: FurniturePiece[],
  decorations: Decoration[],
  canvasW: number,
  canvasH: number,
  padding = 32
): { minX: number; minY: number; w: number; h: number } | null {
  const points: { x: number; y: number }[] = [];

  for (const p of furniture) {
    const dims = FURNITURE_DIMS[p.type];
    const aabb = pieceAABB(p.x, p.y, dims.w, dims.h, p.rotation);
    points.push({ x: aabb.minX, y: aabb.minY });
    points.push({ x: aabb.maxX, y: aabb.maxY });
  }
  for (const d of decorations) {
    const bounds = DECORATION_BOUNDS[d.type];
    if (!bounds) continue;
    const scale = decorationScale(d);
    const r = d.rotation ?? 0;
    const aabb = pieceAABB(d.x, d.y, bounds.w * scale, bounds.h * scale, r);
    points.push({ x: aabb.minX, y: aabb.minY });
    points.push({ x: aabb.maxX, y: aabb.maxY });
  }
  const seatPositions = furniture.flatMap((p) => [
    ...getSeatPositions(p),
    ...getSqueezePositions(p),
  ]);
  for (const s of seatPositions) {
    points.push({ x: s.x, y: s.y });
  }

  if (points.length === 0) return null;
  const minX = Math.max(0, Math.min(...points.map((p) => p.x)) - padding);
  const minY = Math.max(0, Math.min(...points.map((p) => p.y)) - padding);
  const maxX = Math.min(canvasW, Math.max(...points.map((p) => p.x)) + padding);
  const maxY = Math.min(canvasH, Math.max(...points.map((p) => p.y)) + padding);
  const w = maxX - minX;
  const h = maxY - minY;
  if (w <= 0 || h <= 0) return null;
  return { minX, minY, w, h };
}

function defaultColor(type: FurnitureType): string {
  const defaults: Record<FurnitureType, string> = {
    sofa: '#7a5230',
    'sofa-l': '#5c3d1e',
    chair: '#2a4fd6',
    bench: '#4a3820',
    cushion: '#3ab87a',
    floor: '#4a3d2e',
    'bean-bag': '#7B5399',
  };
  return defaults[type];
}

/** Creates a new furniture piece with defaults (id from timestamp, minSeats+1 or 1, defaultSqueezeExtra). */
export function newFurniturePiece(
  type: FurnitureType,
  x = 300,
  y = 200
): FurniturePiece {
  const rules = SEAT_RULES[type];
  return {
    id: `${type}-${Date.now()}`,
    type,
    x,
    y,
    rotation: 0,
    color: defaultColor(type),
    seats: rules.fixed ? 1 : rules.minSeats + 1,
    squeezeExtra: rules.defaultSqueezeExtra,
    lOrientation: type === 'sofa-l' ? 'bottom-right' : undefined,
  };
}
