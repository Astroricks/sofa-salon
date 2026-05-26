/**
 * Unit tests for lib/ticker-utils.ts — ticker rating display and constants.
 */
import {
  formatSystemEventTickerMessage,
  RECENT_RATINGS_SCREENING_LIMIT,
  starsFromAvg,
  TICKER_USER_MESSAGE_MAX_AGE_DAYS,
  tickerUserMessagesVisibleSince,
} from '../ticker-utils';

describe('tickerUserMessagesVisibleSince', () => {
  it('uses a 30-day window', () => {
    expect(TICKER_USER_MESSAGE_MAX_AGE_DAYS).toBe(30);
    const now = new Date('2026-05-24T12:00:00.000Z');
    const since = new Date(tickerUserMessagesVisibleSince(now));
    const expected = new Date(now);
    expected.setDate(expected.getDate() - 30);
    expect(since.getTime()).toBe(expected.getTime());
  });
});

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

describe('formatSystemEventTickerMessage', () => {
  it('uses title_en in English for rescheduled', () => {
    expect(
      formatSystemEventTickerMessage('en', 'rescheduled', '你好世界', 'Hello World')
    ).toBe('Event "Hello World" has been rescheduled');
  });

  it('uses primary title in Chinese for rescheduled', () => {
    expect(formatSystemEventTickerMessage('zh', 'rescheduled', '你好世界', 'Hello World')).toBe(
      '活动《你好世界》已改期'
    );
  });

  it('uses title_en in English for cancelled', () => {
    expect(
      formatSystemEventTickerMessage('en', 'cancelled', '/foo/', 'Bar Film')
    ).toBe('Event "Bar Film" has been cancelled');
  });
});
