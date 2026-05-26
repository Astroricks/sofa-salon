-- Mark whether a reservation attended (出席) or no-show (鸽了).
-- Used by admin and for pigeon recovery / badge counts.
-- Run in Supabase SQL Editor once.

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS attended boolean DEFAULT NULL;

COMMENT ON COLUMN reservations.attended IS 'NULL = present (default), false = no-show (鸽了). App writes only null or false.';
