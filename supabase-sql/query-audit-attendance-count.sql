-- Audit: every profile with badge attendance count and tier (matches app getBadgeLevel / migration 27).
-- Count logic: non-ghost, past screening, attended IS DISTINCT FROM false (unset counts; explicit no-show excluded).
-- Uses view user_attendance_counts (migration 26); equivalent to get_user_attendance_count per user.

SELECT
  p.display_name,
  p.id AS user_id,
  COALESCE(p.no_show_count, 0) AS no_show_count,
  COALESCE(uac.attendance_count, 0) AS attendance_count,
  CASE
    WHEN COALESCE(uac.attendance_count, 0) >= 20 THEN 'Diamond'
    WHEN COALESCE(uac.attendance_count, 0) >= 10 THEN 'Gold'
    WHEN COALESCE(uac.attendance_count, 0) >= 5 THEN 'Silver'
    WHEN COALESCE(uac.attendance_count, 0) >= 3 THEN 'Bronze'
    ELSE 'Sprout'
  END AS badge_level_en,
  CASE
    WHEN COALESCE(uac.attendance_count, 0) >= 20 THEN '钻石'
    WHEN COALESCE(uac.attendance_count, 0) >= 10 THEN '黄金'
    WHEN COALESCE(uac.attendance_count, 0) >= 5 THEN '白银'
    WHEN COALESCE(uac.attendance_count, 0) >= 3 THEN '青铜'
    ELSE '新芽'
  END AS badge_level_zh,
  CASE
    WHEN COALESCE(uac.attendance_count, 0) >= 20 THEN '💎'
    WHEN COALESCE(uac.attendance_count, 0) >= 10 THEN '🥇'
    WHEN COALESCE(uac.attendance_count, 0) >= 5 THEN '🥈'
    WHEN COALESCE(uac.attendance_count, 0) >= 3 THEN '🥉'
    ELSE '🌱'
  END AS badge_emoji
FROM profiles p
LEFT JOIN public.user_attendance_counts uac ON uac.user_id = p.id
ORDER BY attendance_count DESC, display_name;
