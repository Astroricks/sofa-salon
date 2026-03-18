/** Badge tier breakpoints: 0 = Sprout, 3 = Bronze, 5 = Silver, 10 = Gold, 20 = Diamond. */
const TIERS = [
  { min: 20, level: 4, label: '钻石', labelEn: 'Diamond', emoji: '💎' },
  { min: 10, level: 3, label: '黄金', labelEn: 'Gold', emoji: '🥇' },
  { min: 5, level: 2, label: '白银', labelEn: 'Silver', emoji: '🥈' },
  { min: 3, level: 1, label: '青铜', labelEn: 'Bronze', emoji: '🥉' },
  { min: 0, level: 0, label: '新芽', labelEn: 'Sprout', emoji: '🌱' },
] as const;

/** Returns the badge tier (level, label, labelEn, emoji) for a given attendance count. Negative counts clamp to Sprout. */
export function getBadgeLevel(attendanceCount: number): {
  level: number;
  label: string;
  labelEn: string;
  emoji: string;
} {
  const n = Math.max(0, Math.floor(attendanceCount));
  for (const t of TIERS) {
    if (n >= t.min) return { level: t.level, label: t.label, labelEn: t.labelEn, emoji: t.emoji };
  }
  return TIERS[TIERS.length - 1];
}
