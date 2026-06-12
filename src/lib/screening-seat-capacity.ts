import {
  getSeatPositions,
  getSqueezePositions,
  type FurniturePiece,
  type SeatPos,
} from '@/lib/furniture';

export function regularSeatPositions(furniture: FurniturePiece[]): SeatPos[] {
  return furniture.flatMap((piece) => getSeatPositions(piece));
}

export function effectiveRegularSeatPositions(
  furniture: FurniturePiece[],
  seatLimit: number | null | undefined
): SeatPos[] {
  const seats = regularSeatPositions(furniture);
  if (seatLimit == null) return seats;
  return seats.slice(0, Math.max(0, seatLimit));
}

/**
 * A configured seat limit is a hard cap and disables squeeze seats.
 * Legacy screenings with no limit retain the full room plus squeeze behavior.
 */
export function reservableSeatPositions(
  furniture: FurniturePiece[],
  seatLimit: number | null | undefined
): SeatPos[] {
  const regular = effectiveRegularSeatPositions(furniture, seatLimit);
  if (seatLimit != null) return regular;
  return [
    ...regular,
    ...furniture.flatMap((piece) => getSqueezePositions(piece)),
  ];
}

export function reservableSeatKeys(
  furniture: FurniturePiece[],
  seatLimit: number | null | undefined
): string[] {
  return reservableSeatPositions(furniture, seatLimit).map((seat) => seat.seatKey);
}

export function screeningCapacity(
  furniture: FurniturePiece[],
  seatLimit: number | null | undefined
): number {
  return effectiveRegularSeatPositions(furniture, seatLimit).length;
}

export function screeningCapacityWithSqueeze(
  furniture: FurniturePiece[],
  seatLimit: number | null | undefined
): number {
  return reservableSeatPositions(furniture, seatLimit).length;
}

export function parseSeatLimit(
  raw: unknown
): { value: number | null; error: string | null } {
  if (raw == null || raw === '') return { value: null, error: null };
  const value = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    return { value: null, error: 'Seat count must be a positive whole number' };
  }
  return { value, error: null };
}

export function validateSeatLimitForFurniture(
  furniture: FurniturePiece[],
  raw: unknown
): { value: number | null; error: string | null } {
  const parsed = parseSeatLimit(raw);
  if (parsed.error || parsed.value == null) return parsed;

  const roomCapacity = regularSeatPositions(furniture).length;
  if (roomCapacity === 0) {
    return { value: null, error: 'Select a room with at least one seat' };
  }
  if (parsed.value > roomCapacity) {
    return {
      value: null,
      error: `Seat count cannot exceed room capacity (${roomCapacity})`,
    };
  }
  return parsed;
}
