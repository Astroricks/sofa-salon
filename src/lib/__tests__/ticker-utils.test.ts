/**
 * Unit tests for lib/ticker-utils.ts — ticker rating display and constants.
 */
import { RECENT_RATINGS_SCREENING_LIMIT, starsFromAvg } from '../ticker-utils';

describe('RECENT_RATINGS_SCREENING_LIMIT', () => {
  it('is 2 so only the two most recent past screenings show ratings on ticker', () => {
    expect(RECENT_RATINGS_SCREENING_LIMIT).toBe(2);
  });
});

describe('starsFromAvg', () => {
  it('returns 5 full stars for 5', () => {
    expect(starsFromAvg(5)).toBe('★★★★★');
  });

  it('returns 0 full stars for 0', () => {
    expect(starsFromAvg(0)).toBe('☆☆☆☆☆');
  });

  it('rounds 3.4 to 3 stars', () => {
    expect(starsFromAvg(3.4)).toBe('★★★☆☆');
  });

  it('rounds 3.6 to 4 stars', () => {
    expect(starsFromAvg(3.6)).toBe('★★★★☆');
  });

  it('handles 2.5 as 3 stars', () => {
    expect(starsFromAvg(2.5)).toBe('★★★☆☆');
  });

  it('produces exactly 5 characters', () => {
    expect(starsFromAvg(1)).toHaveLength(5);
    expect(starsFromAvg(4.9)).toHaveLength(5);
  });

  it('clamps negative to 0 full stars', () => {
    expect(starsFromAvg(-0.1)).toBe('☆☆☆☆☆');
  });

  it('clamps over 5 to 5 full stars', () => {
    expect(starsFromAvg(5.9)).toBe('★★★★★');
  });
});
