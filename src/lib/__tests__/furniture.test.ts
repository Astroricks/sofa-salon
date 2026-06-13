/**
 * Unit tests for lib/furniture.ts — seat keys, squeeze, L-sofa split.
 */
import {
  canSqueeze,
  lSofaSeatSplit,
  seatKeyToDisplayLabel,
  roomCapacity,
  roomCapacityWithSqueeze,
  getSeatPositions,
  decorationScale,
  getFurnitureFocusBox,
  normalizeDecoration,
} from '../furniture';
import type { Decoration, FurniturePiece } from '../furniture';

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

  it('handles bean-bag key', () => {
    expect(seatKeyToDisplayLabel('bean-bag-12:0')).toBe('bean-bag');
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

  it('returns false for bean-bag', () => {
    expect(canSqueeze(piece('bean-bag', 1))).toBe(false);
  });
});

describe('getSeatPositions', () => {
  it('places one seat on bean-bag near center', () => {
    const p = piece('bean-bag', 1);
    p.id = 'bean-bag-99';
    const pos = getSeatPositions(p);
    expect(pos).toHaveLength(1);
    expect(pos[0].seatKey).toBe('bean-bag-99:0');
    expect(pos[0].y).toBeGreaterThan(p.y);
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

describe('decorationScale', () => {
  it('defaults to 1 and clamps saved values to the editor range', () => {
    expect(decorationScale({})).toBe(1);
    expect(decorationScale({ scale: 0.1 })).toBe(0.5);
    expect(decorationScale({ scale: 3 })).toBe(2);
  });
});

describe('normalizeDecoration', () => {
  it('converts legacy plant types to dropdown variants', () => {
    expect(
      normalizeDecoration({ id: 'old-fern', type: 'fern', x: 0, y: 0 })
    ).toMatchObject({
      type: 'plant',
      plantVariant: 'maidenhair-fern',
    });
    expect(
      normalizeDecoration({ id: 'old-tall', type: 'plant-tall', x: 0, y: 0 })
    ).toMatchObject({
      type: 'plant',
      plantVariant: 'umbrella-tree',
    });
  });

  it('defaults an old generic plant to monstera', () => {
    expect(
      normalizeDecoration({ id: 'old-plant', type: 'plant', x: 0, y: 0 })
    ).toMatchObject({
      type: 'plant',
      plantVariant: 'monstera',
    });
  });
});

describe('getFurnitureFocusBox decorations', () => {
  it('uses scale for every decoration type', () => {
    const decorations: Decoration[] = [
      {
        id: 'screen-1',
        type: 'projector-screen',
        x: 300,
        y: 200,
        rotation: 0,
        scale: 2,
      },
    ];

    expect(getFurnitureFocusBox([], decorations, 700, 500, 0)).toEqual({
      minX: 116,
      minY: 156,
      w: 368,
      h: 88,
    });
  });

  it('uses the reduced base plant bounds for every dropdown variant', () => {
    const decorations: Decoration[] = [
      {
        id: 'fern-1',
        type: 'plant',
        plantVariant: 'maidenhair-fern',
        x: 100,
        y: 100,
        scale: 1,
      },
    ];

    expect(getFurnitureFocusBox([], decorations, 400, 300, 0)).toEqual({
      minX: 81,
      minY: 76,
      w: 38,
      h: 48,
    });
  });
});
