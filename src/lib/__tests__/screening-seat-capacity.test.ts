import type { FurniturePiece } from '../furniture';
import {
  effectiveRegularSeatPositions,
  parseSeatLimit,
  reservableSeatKeys,
  screeningCapacity,
  screeningCapacityWithSqueeze,
  validateSeatLimitForFurniture,
} from '../screening-seat-capacity';

function piece(
  id: string,
  type: FurniturePiece['type'],
  seats: number,
  squeezeExtra = 0
): FurniturePiece {
  return {
    id,
    type,
    x: 100,
    y: 100,
    rotation: 0,
    color: '#000',
    seats,
    squeezeExtra,
  };
}

describe('screening seat capacity', () => {
  const furniture = [
    piece('sofa-1', 'sofa', 3, 1),
    piece('chair-1', 'chair', 1),
  ];

  it('limits regular seats in stable room order', () => {
    expect(
      effectiveRegularSeatPositions(furniture, 2).map((seat) => seat.seatKey)
    ).toEqual(['sofa-1:0', 'sofa-1:1']);
    expect(screeningCapacity(furniture, 2)).toBe(2);
  });

  it('disables squeeze seats when a hard limit is configured', () => {
    expect(reservableSeatKeys(furniture, 3)).toEqual([
      'sofa-1:0',
      'sofa-1:1',
      'sofa-1:2',
    ]);
    expect(screeningCapacityWithSqueeze(furniture, 3)).toBe(3);
  });

  it('preserves full room and squeeze seats when no limit is configured', () => {
    expect(reservableSeatKeys(furniture, null)).toEqual([
      'sofa-1:0',
      'sofa-1:1',
      'sofa-1:2',
      'chair-1:0',
      'sofa-1:squeeze:0',
    ]);
    expect(screeningCapacityWithSqueeze(furniture, null)).toBe(5);
  });
});

describe('parseSeatLimit', () => {
  it('accepts blank as legacy room capacity', () => {
    expect(parseSeatLimit('')).toEqual({ value: null, error: null });
  });

  it('accepts positive integers', () => {
    expect(parseSeatLimit('12')).toEqual({ value: 12, error: null });
  });

  it('rejects zero and fractional values', () => {
    expect(parseSeatLimit(0).error).toBeTruthy();
    expect(parseSeatLimit(2.5).error).toBeTruthy();
  });

  it('rejects values above the physical room capacity', () => {
    const furniture = [piece('sofa-1', 'sofa', 3)];
    expect(validateSeatLimitForFurniture(furniture, 4)).toEqual({
      value: null,
      error: 'Seat count cannot exceed room capacity (3)',
    });
  });
});
