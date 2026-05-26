/** Unit tests for buildAttendanceMap and badge tiers (getBadgeLevel). */
import {
  buildAttendanceMap,
  countNoShowScreeningsFromRows,
  noShowCountAfterAdminMark,
  noShowCountAfterClearingAttendance,
  noShowCountAfterUndo,
  noShowScreeningIds,
  parseAdminAttendanceBody,
  presentAttendanceValue,
  profileUpdatesAfterConsecutiveAttendance,
  reservationIsNoShow,
  reservationIsPresent,
  shouldApplyNoShowForScreeningUser,
  shouldIncrementConsecutiveAttendance,
  shouldUndoNoShowForScreeningUser,
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

describe('noShowScreeningIds', () => {
  it('returns screening ids with attended=false on non-ghost reservations', () => {
    const ids = noShowScreeningIds([
      { screening_id: 'a', attended: false },
      { screening_id: 'b', attended: null },
      { screening_id: 'c', attended: false, is_ghost: true },
    ]);
    expect(ids.has('a')).toBe(true);
    expect(ids.has('b')).toBe(false);
    expect(ids.has('c')).toBe(false);
  });
});

describe('noShowCountAfterUndo', () => {
  it('decrements by one within 0–3', () => {
    expect(noShowCountAfterUndo(2)).toBe(1);
    expect(noShowCountAfterUndo(1)).toBe(0);
    expect(noShowCountAfterUndo(0)).toBe(0);
  });
});

describe('shouldUndoNoShowForScreeningUser', () => {
  it('returns true when clearing 鸽了 to present', () => {
    expect(shouldUndoNoShowForScreeningUser([false], null)).toBe(true);
    expect(shouldUndoNoShowForScreeningUser([false, false], null)).toBe(true);
  });

  it('returns false when marking no-show or screening was not false', () => {
    expect(shouldUndoNoShowForScreeningUser([false], false)).toBe(false);
    expect(shouldUndoNoShowForScreeningUser([null], null)).toBe(false);
  });
});

describe('noShowCountAfterAdminMark', () => {
  it('raises count to match false screenings', () => {
    expect(noShowCountAfterAdminMark(0, 1)).toBe(1);
    expect(noShowCountAfterAdminMark(2, 1)).toBe(2);
  });
});

describe('noShowCountAfterClearingAttendance', () => {
  it('clamps orphan no_show_count when profile has a strike but no attended=false rows', () => {
    expect(noShowCountAfterClearingAttendance(1, 0, false)).toBe(0);
  });

  it('decrements when clearing a screening that was marked false', () => {
    expect(noShowCountAfterClearingAttendance(2, 0, true)).toBe(0);
  });

  it('keeps count when another screening is still false', () => {
    expect(noShowCountAfterClearingAttendance(2, 1, true)).toBe(1);
  });
});

describe('countNoShowScreeningsFromRows', () => {
  it('counts distinct false screenings', () => {
    expect(
      countNoShowScreeningsFromRows([
        { screening_id: 'a', attended: false },
        { screening_id: 'a', attended: false },
      ])
    ).toBe(1);
  });
});

describe('reservationIsPresent', () => {
  it('treats null as present and false as no-show', () => {
    expect(reservationIsPresent(null)).toBe(true);
    expect(reservationIsPresent(false)).toBe(false);
  });
});

describe('parseAdminAttendanceBody', () => {
  it('maps noShow checkbox to attended values', () => {
    expect(parseAdminAttendanceBody({ noShow: true })).toEqual({ value: false });
    expect(parseAdminAttendanceBody({ noShow: false })).toEqual({ value: null });
  });

  it('accepts script-style attended false or null', () => {
    expect(parseAdminAttendanceBody({ attended: false })).toEqual({ value: false });
    expect(parseAdminAttendanceBody({ attended: null })).toEqual({ value: null });
  });

  it('rejects attended=true and invalid body', () => {
    expect(parseAdminAttendanceBody({ attended: true })).toHaveProperty('error');
    expect(parseAdminAttendanceBody({})).toHaveProperty('error');
  });
});

describe('presentAttendanceValue', () => {
  it('returns null for DB present state', () => {
    expect(presentAttendanceValue()).toBeNull();
  });
});

describe('shouldIncrementConsecutiveAttendance', () => {
  it('counts when clearing 鸽了 and no seat stays false', () => {
    expect(shouldIncrementConsecutiveAttendance([false], true)).toBe(true);
    expect(shouldIncrementConsecutiveAttendance([false, null], true)).toBe(true);
  });

  it('does not count when screening was already all present', () => {
    expect(shouldIncrementConsecutiveAttendance([null], true)).toBe(false);
    expect(shouldIncrementConsecutiveAttendance([null, null], true)).toBe(false);
  });

  it('does not count when another seat remains 鸽了', () => {
    expect(shouldIncrementConsecutiveAttendance([false], true, true)).toBe(false);
  });

  it('never counts when marking no-show', () => {
    expect(shouldIncrementConsecutiveAttendance([null], false)).toBe(false);
  });
});

describe('reservationIsNoShow', () => {
  it('is only false', () => {
    expect(reservationIsNoShow(false)).toBe(true);
    expect(reservationIsNoShow(null)).toBe(false);
  });
});

describe('profileUpdatesAfterConsecutiveAttendance', () => {
  it('clears pigeon after second consecutive when no_show_count is 3', () => {
    const u = profileUpdatesAfterConsecutiveAttendance(1, 3);
    expect(u.consecutive_attendances).toBe(0);
    expect(u.no_show_count).toBe(0);
    expect(u.noShow).toBe(0);
  });

  it('increments streak without clearing when not yet pigeon', () => {
    const u = profileUpdatesAfterConsecutiveAttendance(0, 2);
    expect(u.consecutive_attendances).toBe(1);
    expect(u.no_show_count).toBeUndefined();
    expect(u.noShow).toBe(2);
  });
});

describe('shouldApplyNoShowForScreeningUser', () => {
  it('returns false when every prior row was already false (bulk idempotent)', () => {
    expect(shouldApplyNoShowForScreeningUser([false])).toBe(false);
    expect(shouldApplyNoShowForScreeningUser([false, false])).toBe(false);
  });

  it('returns true when any prior row was not yet false', () => {
    expect(shouldApplyNoShowForScreeningUser([null])).toBe(true);
    expect(shouldApplyNoShowForScreeningUser([false, null])).toBe(true);
  });

  it('returns false for empty prior list', () => {
    expect(shouldApplyNoShowForScreeningUser([])).toBe(false);
  });
});
