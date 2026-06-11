/**
 * Unit tests for lib/config.ts — app name and tagline from env.
 * Assumes NEXT_PUBLIC_APP_NAME and NEXT_PUBLIC_APP_TAGLINE are unset (defaults).
 */
import {
  APP_NAME,
  APP_TAGLINE,
  APP_NAME_PARTS,
  DEVELOPER_NAME,
  DEVELOPER_URL,
  HOST_NAME,
  PAST_SCREENINGS_URL_EN,
  PAST_SCREENINGS_URL_ZH,
  RECEIPT_SUBTITLE,
  VENUE_ADDRESS,
} from '../config';

describe('config', () => {
  it('default APP_NAME is "Sofa Salon" when env unset', () => {
    expect(APP_NAME).toBe('Sofa Salon');
  });

  it('default APP_TAGLINE is the living room tagline when env unset', () => {
    expect(APP_TAGLINE).toBe("Your host's living room");
  });

  it('APP_NAME_PARTS splits APP_NAME by space and matches default', () => {
    expect(APP_NAME_PARTS).toEqual(['Sofa', 'Salon']);
    expect(APP_NAME_PARTS.join(' ')).toBe(APP_NAME);
  });

  it('APP_NAME_PARTS has no empty strings', () => {
    expect(APP_NAME_PARTS.every((p) => p.length > 0)).toBe(true);
  });

  it('keeps the current deployment identity as backwards-compatible defaults', () => {
    expect(PAST_SCREENINGS_URL_EN).toContain('letterboxd.com');
    expect(PAST_SCREENINGS_URL_ZH).toContain('docs.google.com/spreadsheets');
    expect(DEVELOPER_NAME).toBe('Eve');
    expect(DEVELOPER_URL).toBe('https://eveshi.com/');
    expect(HOST_NAME).toBe('Ziggy');
    expect(VENUE_ADDRESS).toBe('');
    expect(RECEIPT_SUBTITLE).toBe('SCREENING ROOM');
  });
});

describe('isLeaderboardHostDisplayName', () => {
  afterEach(() => {
    delete process.env.LEADERBOARD_HOST_DISPLAY_NAMES;
  });

  it('matches default host Ziggy but not co-admin 471', () => {
    jest.isolateModules(() => {
      delete process.env.LEADERBOARD_HOST_DISPLAY_NAMES;
      const mod = require('../config') as typeof import('../config');
      expect(mod.isLeaderboardHostDisplayName('Ziggy')).toBe(true);
      expect(mod.isLeaderboardHostDisplayName('ziggy')).toBe(true);
      expect(mod.isLeaderboardHostDisplayName('471')).toBe(false);
    });
  });
});

describe('CUSTOMER_SITE_ORIGIN', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_CUSTOMER_SITE_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it('defaults to localhost instead of another deployment when site URLs are unset', () => {
    jest.isolateModules(() => {
      delete process.env.NEXT_PUBLIC_CUSTOMER_SITE_URL;
      delete process.env.NEXT_PUBLIC_APP_URL;
      const mod = require('../config') as typeof import('../config');
      expect(mod.CUSTOMER_SITE_ORIGIN).toBe('http://localhost:3000');
    });
  });

  it('uses NEXT_PUBLIC_CUSTOMER_SITE_URL and strips trailing slash', () => {
    jest.isolateModules(() => {
      process.env.NEXT_PUBLIC_CUSTOMER_SITE_URL = 'https://staging.example/';
      const mod = require('../config') as typeof import('../config');
      expect(mod.CUSTOMER_SITE_ORIGIN).toBe('https://staging.example');
    });
  });

  it('falls back to NEXT_PUBLIC_APP_URL and strips its trailing slash', () => {
    jest.isolateModules(() => {
      delete process.env.NEXT_PUBLIC_CUSTOMER_SITE_URL;
      process.env.NEXT_PUBLIC_APP_URL = 'https://app.example/';
      const mod = require('../config') as typeof import('../config');
      expect(mod.CUSTOMER_SITE_ORIGIN).toBe('https://app.example');
    });
  });
});

describe('deployment identity overrides', () => {
  const keys = [
    'NEXT_PUBLIC_PAST_SCREENINGS_URL_EN',
    'NEXT_PUBLIC_PAST_SCREENINGS_URL_ZH',
    'NEXT_PUBLIC_DEVELOPER_NAME',
    'NEXT_PUBLIC_DEVELOPER_URL',
    'NEXT_PUBLIC_HOST_NAME',
    'NEXT_PUBLIC_VENUE_ADDRESS',
    'NEXT_PUBLIC_RECEIPT_SUBTITLE',
  ] as const;

  afterEach(() => {
    for (const key of keys) delete process.env[key];
  });

  it('uses public environment variables for fork-specific identity', () => {
    jest.isolateModules(() => {
      process.env.NEXT_PUBLIC_PAST_SCREENINGS_URL_EN = 'https://example.com/archive/en';
      process.env.NEXT_PUBLIC_PAST_SCREENINGS_URL_ZH = 'https://example.com/archive/zh';
      process.env.NEXT_PUBLIC_DEVELOPER_NAME = 'Example Dev';
      process.env.NEXT_PUBLIC_DEVELOPER_URL = 'https://example.com/dev';
      process.env.NEXT_PUBLIC_HOST_NAME = 'Example Host';
      process.env.NEXT_PUBLIC_VENUE_ADDRESS = 'Example address';
      process.env.NEXT_PUBLIC_RECEIPT_SUBTITLE = 'FILM CLUB';
      const mod = require('../config') as typeof import('../config');

      expect(mod.PAST_SCREENINGS_URL_EN).toBe('https://example.com/archive/en');
      expect(mod.PAST_SCREENINGS_URL_ZH).toBe('https://example.com/archive/zh');
      expect(mod.DEVELOPER_NAME).toBe('Example Dev');
      expect(mod.DEVELOPER_URL).toBe('https://example.com/dev');
      expect(mod.HOST_NAME).toBe('Example Host');
      expect(mod.VENUE_ADDRESS).toBe('Example address');
      expect(mod.RECEIPT_SUBTITLE).toBe('FILM CLUB');
    });
  });
});
