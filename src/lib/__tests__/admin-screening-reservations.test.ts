import {
  normalizeDisplayNameQuery,
  pickAvailableSeatKey,
  pickSeatKeyForAdminAdd,
} from '../admin-screening-reservations';

describe('normalizeDisplayNameQuery', () => {
  it('trims whitespace', () => {
    expect(normalizeDisplayNameQuery('  Ziggy  ')).toBe('Ziggy');
  });
});

describe('pickAvailableSeatKey', () => {
  const all = ['sofa-1:0', 'sofa-1:1', 'sofa-1:squeeze:0'];

  it('returns first free regular seat', () => {
    expect(pickAvailableSeatKey(all, new Set(['sofa-1:0']))).toBe('sofa-1:1');
  });

  it('falls back to squeeze when only squeeze is free', () => {
    expect(
      pickAvailableSeatKey(all, new Set(['sofa-1:0', 'sofa-1:1']))
    ).toBe('sofa-1:squeeze:0');
  });

  it('returns null when full', () => {
    expect(pickAvailableSeatKey(all, new Set(all))).toBeNull();
  });
});

describe('pickSeatKeyForAdminAdd', () => {
  const userId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const futureAt = new Date(Date.now() + 86400000).toISOString();
  const pastAt = new Date(Date.now() - 86400000).toISOString();
  const roomKeys = ['sofa-1:0', 'sofa-1:1'];

  it('uses physical seat for upcoming screening with room', () => {
    const picked = pickSeatKeyForAdminAdd({
      userId,
      screeningAt: futureAt,
      roomSeatKeys: roomKeys,
      takenSeatKeys: new Set(),
    });
    expect(picked).toEqual({ seatKey: 'sofa-1:0', isCatalog: false });
  });

  it('uses catalog seat for past screening even when room exists', () => {
    const picked = pickSeatKeyForAdminAdd({
      userId,
      screeningAt: pastAt,
      roomSeatKeys: roomKeys,
      takenSeatKeys: new Set(),
    });
    expect(picked?.isCatalog).toBe(true);
    expect(picked?.seatKey).toMatch(/^catalog-/);
  });

  it('uses catalog seat when there is no room', () => {
    const picked = pickSeatKeyForAdminAdd({
      userId,
      screeningAt: futureAt,
      roomSeatKeys: [],
      takenSeatKeys: new Set(),
    });
    expect(picked?.isCatalog).toBe(true);
  });
});
