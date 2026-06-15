describe('isScreeningPast', () => {
  it('returns true when screening_at is before now', async () => {
    const { isScreeningPast } = await import('../screening-datetime');
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(isScreeningPast(past)).toBe(true);
  });

  it('returns false for upcoming screenings', async () => {
    const { isScreeningPast } = await import('../screening-datetime');
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(isScreeningPast(future)).toBe(false);
  });
});

describe('formatScreeningAtForEmail', () => {
  const originalTz = process.env.TZ;
  const originalVenueTz = process.env.VENUE_TIMEZONE;
  const originalPublicVenueTz = process.env.NEXT_PUBLIC_VENUE_TIMEZONE;

  beforeEach(() => {
    jest.resetModules();
    process.env.TZ = 'UTC';
    process.env.VENUE_TIMEZONE = 'America/New_York';
    process.env.NEXT_PUBLIC_VENUE_TIMEZONE = 'America/Los_Angeles';
  });

  afterEach(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
    if (originalVenueTz === undefined) delete process.env.VENUE_TIMEZONE;
    else process.env.VENUE_TIMEZONE = originalVenueTz;
    if (originalPublicVenueTz === undefined) delete process.env.NEXT_PUBLIC_VENUE_TIMEZONE;
    else process.env.NEXT_PUBLIC_VENUE_TIMEZONE = originalPublicVenueTz;
  });

  it('formats UTC instant in the public venue timezone', async () => {
    const { formatScreeningAtForEmail } = await import('../screening-datetime');
    // 2026-06-15 16:00 Pacific (PDT) = 2026-06-15T23:00:00.000Z
    const formatted = formatScreeningAtForEmail('2026-06-15T23:00:00.000Z');
    expect(formatted).toContain('4:00');
    expect(formatted).toMatch(/PM/i);
    expect(formatted).toMatch(/PDT|PST/);
  });

  it('returns input when ISO is invalid', async () => {
    const { formatScreeningAtForEmail } = await import('../screening-datetime');
    expect(formatScreeningAtForEmail('not-a-date')).toBe('not-a-date');
  });

  it('converts venue wall time to UTC and back during daylight-saving time', async () => {
    const { toVenueDatetimeLocal, venueDatetimeLocalToIso } = await import('../screening-datetime');
    const iso = venueDatetimeLocalToIso('2026-06-15T16:00');
    expect(iso).toBe('2026-06-15T23:00:00.000Z');
    expect(toVenueDatetimeLocal(iso)).toBe('2026-06-15T16:00');
  });

  it('uses standard time offset in winter', async () => {
    const { venueDatetimeLocalToIso } = await import('../screening-datetime');
    expect(venueDatetimeLocalToIso('2026-01-15T16:00')).toBe(
      '2026-01-16T00:00:00.000Z'
    );
  });
});
