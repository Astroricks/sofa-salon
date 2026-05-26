/** Badge tier breakpoints (attendance count). All tiers use emoji for consistent visual weight. */
export type BadgeLevel = {
  level: number;
  label: string;
  labelEn: string;
  emoji: string;
};

/** Tier breakpoints (high → low). Keep in sync with supabase-sql/query-audit-attendance-count.sql. */
export const BADGE_TIERS: { min: number; level: number; label: string; labelEn: string; emoji: string }[] = [
  { min: 80, level: 7, label: '镇店', labelEn: 'House legend', emoji: '🏆' },
  { min: 50, level: 6, label: '贡宾', labelEn: 'Patron', emoji: '👑' },
  { min: 30, level: 5, label: '座上宾', labelEn: 'Honored guest', emoji: '🛋️' },
  { min: 20, level: 4, label: '钻石', labelEn: 'Diamond', emoji: '💎' },
  { min: 10, level: 3, label: '黄金', labelEn: 'Gold', emoji: '🥇' },
  { min: 5, level: 2, label: '白银', labelEn: 'Silver', emoji: '🥈' },
  { min: 3, level: 1, label: '青铜', labelEn: 'Bronze', emoji: '🥉' },
  { min: 0, level: 0, label: '新芽', labelEn: 'Sprout', emoji: '🌱' },
];

/** Returns badge tier for attendance count. Negative counts clamp to Sprout. */
export function getBadgeLevel(attendanceCount: number): BadgeLevel {
  const n = Math.max(0, Math.floor(attendanceCount));
  for (const t of BADGE_TIERS) {
    if (n >= t.min) {
      return {
        level: t.level,
        label: t.label,
        labelEn: t.labelEn,
        emoji: t.emoji,
      };
    }
  }
  const fallback = BADGE_TIERS[BADGE_TIERS.length - 1];
  return {
    level: fallback.level,
    label: fallback.label,
    labelEn: fallback.labelEn,
    emoji: fallback.emoji,
  };
}
