/**
 * Unit tests for lib/badges.ts — badge tier by attendance count.
 */
import { getBadgeLevel } from '../badges';

describe('getBadgeLevel', () => {
  it('returns Sprout for 0 attendance', () => {
    const badge = getBadgeLevel(0);
    expect(badge.labelEn).toBe('Sprout');
    expect(badge.emoji).toBe('🌱');
    expect(badge.level).toBe(0);
  });

  it('returns Bronze for 3 attendance', () => {
    const badge = getBadgeLevel(3);
    expect(badge.labelEn).toBe('Bronze');
    expect(badge.emoji).toBe('🥉');
  });

  it('returns Silver for 5 attendance', () => {
    const badge = getBadgeLevel(5);
    expect(badge.labelEn).toBe('Silver');
    expect(badge.emoji).toBe('🥈');
  });

  it('returns Gold for 10 attendance', () => {
    const badge = getBadgeLevel(10);
    expect(badge.labelEn).toBe('Gold');
    expect(badge.emoji).toBe('🥇');
  });

  it('returns Diamond for 20 attendance', () => {
    const badge = getBadgeLevel(20);
    expect(badge.labelEn).toBe('Diamond');
    expect(badge.emoji).toBe('💎');
  });

  it('returns Honored guest at 30', () => {
    const badge = getBadgeLevel(30);
    expect(badge.labelEn).toBe('Honored guest');
    expect(badge.emoji).toBe('🛋️');
  });

  it('returns Patron at 50', () => {
    const badge = getBadgeLevel(50);
    expect(badge.labelEn).toBe('Patron');
    expect(badge.emoji).toBe('👑');
  });

  it('returns House legend at 80', () => {
    const badge = getBadgeLevel(80);
    expect(badge.labelEn).toBe('House legend');
    expect(badge.emoji).toBe('🏆');
  });

  it('clamps negative to Sprout', () => {
    const badge = getBadgeLevel(-1);
    expect(badge.labelEn).toBe('Sprout');
  });
});
