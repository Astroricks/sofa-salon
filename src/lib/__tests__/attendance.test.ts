/** Unit tests for buildAttendanceMap and badge tiers (getBadgeLevel). */
import {
  buildAttendanceMap,
  shouldApplyNoShowForReservationRow,
  shouldApplyNoShowForScreeningUser,
} from '../attendance';
import { getBadgeLevel } from '../badges';

describe('buildAttendanceMap', () => {
  it('maps rows by user_id', () => {
    const map = buildAttendanceMap([
      { user_id: 'a', attendance_count: 2 },
      { user_id: 'b', attendance_count: 7 },
    ]);
    expect(map.get('a')).toBe(2);
    expect(map.get('b')).toBe(7);
  });

  it('returns undefined for missing users so callers can default to 0', () => {
    const map = buildAttendanceMap([{ user_id: 'a', attendance_count: 4 }]);
    expect(map.get('missing')).toBeUndefined();
    expect(map.get('missing') ?? 0).toBe(0);
  });

  it('skips malformed rows and clamps negatives / NaN to 0', () => {
    const map = buildAttendanceMap([
      { user_id: 'a', attendance_count: -3 },
      { user_id: 'b', attendance_count: Number.NaN },
      null,
      undefined,
      { user_id: '', attendance_count: 5 } as { user_id: string; attendance_count: number },
    ]);
    expect(map.get('a')).toBe(0);
    expect(map.get('b')).toBe(0);
    expect(map.has('')).toBe(false);
  });

  it('floors fractional counts', () => {
    const map = buildAttendanceMap([
      { user_id: 'a', attendance_count: 3.9 as unknown as number },
    ]);
    expect(map.get('a')).toBe(3);
  });

  it('drives the expected badge tiers', () => {
    const map = buildAttendanceMap([
      { user_id: 'sprout', attendance_count: 2 },
      { user_id: 'bronze', attendance_count: 3 },
      { user_id: 'silver', attendance_count: 5 },
      { user_id: 'gold', attendance_count: 10 },
      { user_id: 'diamond', attendance_count: 20 },
    ]);
    expect(getBadgeLevel(map.get('sprout') ?? 0).labelEn).toBe('Sprout');
    expect(getBadgeLevel(map.get('bronze') ?? 0).labelEn).toBe('Bronze');
    expect(getBadgeLevel(map.get('silver') ?? 0).labelEn).toBe('Silver');
    expect(getBadgeLevel(map.get('gold') ?? 0).labelEn).toBe('Gold');
    expect(getBadgeLevel(map.get('diamond') ?? 0).labelEn).toBe('Diamond');
    expect(getBadgeLevel(map.get('unseen-user') ?? 0).labelEn).toBe('Sprout');
  });
});

describe('shouldApplyNoShowForReservationRow', () => {
  it('returns false when row was already no-show (idempotent)', () => {
    expect(shouldApplyNoShowForReservationRow(false, false)).toBe(false);
  });

  it('returns false when another seat in the screening is already no-show', () => {
    expect(shouldApplyNoShowForReservationRow(null, true)).toBe(false);
    expect(shouldApplyNoShowForReservationRow(true, true)).toBe(false);
  });

  it('returns true when first no-show mark for this screening (this row, no sibling false)', () => {
    expect(shouldApplyNoShowForReservationRow(null, false)).toBe(true);
    expect(shouldApplyNoShowForReservationRow(true, false)).toBe(true);
    expect(shouldApplyNoShowForReservationRow(undefined, false)).toBe(true);
  });
});

describe('shouldApplyNoShowForScreeningUser', () => {
  it('returns false when every prior row was already false (bulk idempotent)', () => {
    expect(shouldApplyNoShowForScreeningUser([false])).toBe(false);
    expect(shouldApplyNoShowForScreeningUser([false, false])).toBe(false);
  });

  it('returns true when any prior row was not yet false', () => {
    expect(shouldApplyNoShowForScreeningUser([null])).toBe(true);
    expect(shouldApplyNoShowForScreeningUser([true])).toBe(true);
    expect(shouldApplyNoShowForScreeningUser([false, null])).toBe(true);
  });

  it('returns false for empty prior list', () => {
    expect(shouldApplyNoShowForScreeningUser([])).toBe(false);
  });
});
