export type FurnitureType = 'sofa' | 'sofa-l' | 'chair' | 'bench' | 'cushion';
export type DecorationType =
  | 'plant'
  | 'lamp'
  | 'table'
  | 'bookshelf'
  | 'tv'
  | 'coffee-table';
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
}

export interface Room {
  id: string;
  name: string;
  furniture: FurniturePiece[];
  decorations: Decoration[];
  canvasW: number;
  canvasH: number;
}

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
};

export function canSqueeze(piece: FurniturePiece): boolean {
  return SEAT_RULES[piece.type].canSqueeze;
}

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
};

/** Approximate axis-aligned bounds for decorations (from DecorationSVG). Center at (x,y). */
export const DECORATION_BOUNDS: Record<DecorationType, { w: number; h: number }> = {
  plant: { w: 28, h: 32 },
  lamp: { w: 36, h: 24 },
  table: { w: 54, h: 54 },
  bookshelf: { w: 60, h: 40 },
  tv: { w: 160, h: 42 },
  'coffee-table': { w: 144, h: 56 },
};

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

export function getSeatPositions(piece: FurniturePiece): SeatPos[] {
  const positions: SeatPos[] = [];
  const { id, type, x, y, seats, rotation } = piece;

  if (type === 'sofa') {
    const seatW = 52;
    const totalW = seatW * seats;
    const startX = x - totalW / 2 + seatW / 2;
    for (let i = 0; i < seats; i++) {
      const sx = startX + i * seatW;
      const sy = y + 8;
      const [rx, ry] = rot(sx, sy, x, y, rotation);
      positions.push({ seatKey: `${id}:${i}`, x: rx, y: ry });
    }
  }

  if (type === 'sofa-l') {
    const [longN, shortN] = lSofaSeatSplit(seats);
    const seatW = 52;
    const lOr = piece.lOrientation ?? 'bottom-right';
    const longStartX = x - (longN * seatW) / 2 + seatW / 2;
    for (let i = 0; i < longN; i++) {
      const sx = longStartX + i * seatW;
      const sy = y + 8;
      const [rx, ry] = rot(sx, sy, x, y, rotation);
      positions.push({ seatKey: `${id}:${i}`, x: rx, y: ry });
    }
    const shortSeatH = 52;
    const cornerX = lOr.includes('right')
      ? x + (longN * seatW) / 2 - seatW / 2
      : x - (longN * seatW) / 2 + seatW / 2;
    const shortStartY = y + 8 + shortSeatH / 2;
    for (let i = 0; i < shortN; i++) {
      const sx = cornerX;
      const sy = shortStartY + i * shortSeatH;
      const [rx, ry] = rot(sx, sy, x, y, rotation);
      positions.push({ seatKey: `${id}:${longN + i}`, x: rx, y: ry });
    }
  }

  if (type === 'chair' || type === 'bench' || type === 'cushion') {
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
    const r = d.rotation ?? 0;
    const aabb = pieceAABB(d.x, d.y, bounds.w, bounds.h, r);
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
  };
  return defaults[type];
}

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
