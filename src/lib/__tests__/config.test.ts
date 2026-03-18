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
