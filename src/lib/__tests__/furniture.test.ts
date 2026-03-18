/**
 * Unit tests for lib/furniture.ts — seat keys, squeeze, L-sofa split.
 */
import {
  canSqueeze,
  lSofaSeatSplit,
  seatKeyToDisplayLabel,
  roomCapacity,
  roomCapacityWithSqueeze,
} from '../furniture';
import type { FurniturePiece } from '../furniture';

describe('seatKeyToDisplayLabel', () => {
  it('strips trailing id from chair', () => {
    expect(seatKeyToDisplayLabel('chair-1773297376014:0')).toBe('chair');
  });

  it('returns "squeeze" for squeeze suffix', () => {
    expect(seatKeyToDisplayLabel('sofa-123:squeeze')).toBe('squeeze');
  });

  it('returns sofa for sofa seat key', () => {
    expect(seatKeyToDisplayLabel('sofa-1:0')).toBe('sofa');
  });

  it('handles sofa-l key', () => {
    expect(seatKeyToDisplayLabel('sofa-l-99:2')).toBe('sofa-l');
  });

  it('handles key with only colon suffix (no squeeze)', () => {
    expect(seatKeyToDisplayLabel('bench-1:0')).toBe('bench');
  });
});

describe('lSofaSeatSplit', () => {
  it('splits 10 seats with 60% on long side', () => {
    const [long, short] = lSofaSeatSplit(10);
    expect(long).toBe(6);
    expect(short).toBe(4);
    expect(long + short).toBe(10);
  });

  it('splits 5 seats', () => {
    const [long, short] = lSofaSeatSplit(5);
    expect(long + short).toBe(5);
  });
});

function piece(type: FurniturePiece['type'], seats: number): FurniturePiece {
  return {
    type,
    id: type + '-1',
    x: 0,
    y: 0,
    seats,
    rotation: 0,
    color: '#333',
    squeezeExtra: type === 'sofa' || type === 'sofa-l' ? 1 : 0,
  };
}

describe('canSqueeze', () => {
  it('returns true for sofa type', () => {
    expect(canSqueeze(piece('sofa', 3))).toBe(true);
  });

  it('returns true for sofa-l', () => {
    expect(canSqueeze(piece('sofa-l', 8))).toBe(true);
  });

  it('returns false for chair', () => {
    expect(canSqueeze(piece('chair', 1))).toBe(false);
  });
});

describe('roomCapacity', () => {
  it('sums seats of all pieces', () => {
    const pieces: FurniturePiece[] = [piece('sofa', 3), piece('chair', 1)];
    expect(roomCapacity(pieces)).toBe(4);
  });

  it('returns 0 for empty room', () => {
    expect(roomCapacity([])).toBe(0);
  });

  it('returns correct total for multiple pieces', () => {
    const pieces: FurniturePiece[] = [
      piece('sofa', 4),
      piece('sofa-l', 6),
      piece('chair', 1),
    ];
    expect(roomCapacity(pieces)).toBe(11);
  });
});

describe('roomCapacityWithSqueeze', () => {
  it('includes squeeze seats for sofa', () => {
    const pieces: FurniturePiece[] = [piece('sofa', 3)];
    expect(roomCapacityWithSqueeze(pieces)).toBeGreaterThanOrEqual(3);
  });

  it('returns 0 for empty room', () => {
    expect(roomCapacityWithSqueeze([])).toBe(0);
  });

  it('sofa with squeezeExtra adds extra capacity', () => {
    const p = piece('sofa', 3);
    p.squeezeExtra = 1;
    expect(roomCapacityWithSqueeze([p])).toBe(4);
  });
});
