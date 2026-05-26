-- Pigeon (放鸽子) fields on profiles.
-- no_show_count: incremented when user cancels within 24h of screening (max 3).
-- consecutive_attendances: reset on no-show, +1 when admin clears no-show; used for pigeon recovery.
-- Badge tiers are not stored here — see migration 27 (RPCs) and 26 (optional view).
-- Run in Supabase SQL Editor once.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS no_show_count integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS consecutive_attendances integer DEFAULT 0;

COMMENT ON COLUMN profiles.no_show_count IS 'Late cancels within 24h (max 3 → 鸽子)';
COMMENT ON COLUMN profiles.consecutive_attendances IS 'For pigeon recovery: reset on no-show, +1 when admin clears no-show';
