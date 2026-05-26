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

  beforeEach(() => {
    jest.resetModules();
    process.env.TZ = 'UTC';
    process.env.VENUE_TIMEZONE = 'America/New_York';
  });

  afterEach(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
    if (originalVenueTz === undefined) delete process.env.VENUE_TIMEZONE;
    else process.env.VENUE_TIMEZONE = originalVenueTz;
  });

  it('formats UTC instant in venue timezone (not server UTC wall time)', async () => {
    const { formatScreeningAtForEmail } = await import('../screening-datetime');
    // 2026-03-15 19:00 Eastern (EDT) = 2026-03-15T23:00:00.000Z
    const formatted = formatScreeningAtForEmail('2026-03-15T23:00:00.000Z');
    expect(formatted).toContain('7:00');
    expect(formatted).toMatch(/PM/i);
    expect(formatted).toMatch(/EDT|EST/);
  });

  it('returns input when ISO is invalid', async () => {
    const { formatScreeningAtForEmail } = await import('../screening-datetime');
    expect(formatScreeningAtForEmail('not-a-date')).toBe('not-a-date');
  });
});
