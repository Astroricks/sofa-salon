/**
 * Unit tests for lib/config.ts — app name and tagline from env.
 * Assumes NEXT_PUBLIC_APP_NAME and NEXT_PUBLIC_APP_TAGLINE are unset (defaults).
 */
import { APP_NAME, APP_TAGLINE, APP_NAME_PARTS } from '../config';

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
  });

  it('defaults to https://ziggygraph.app when NEXT_PUBLIC_CUSTOMER_SITE_URL is unset', () => {
    jest.isolateModules(() => {
      delete process.env.NEXT_PUBLIC_CUSTOMER_SITE_URL;
      const mod = require('../config') as typeof import('../config');
      expect(mod.CUSTOMER_SITE_ORIGIN).toBe('https://ziggygraph.app');
    });
  });

  it('uses NEXT_PUBLIC_CUSTOMER_SITE_URL and strips trailing slash', () => {
    jest.isolateModules(() => {
      process.env.NEXT_PUBLIC_CUSTOMER_SITE_URL = 'https://staging.example/';
      const mod = require('../config') as typeof import('../config');
      expect(mod.CUSTOMER_SITE_ORIGIN).toBe('https://staging.example');
    });
  });
});
