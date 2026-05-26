-- Enforce attended column: NULL = present (default), false = no-show only.
-- Run after 31-attended-present-normalize.sql (no attended=true rows).

ALTER TABLE reservations
  DROP CONSTRAINT IF EXISTS reservations_attended_present_or_no_show;

ALTER TABLE reservations
  ADD CONSTRAINT reservations_attended_present_or_no_show
  CHECK (attended IS NULL OR attended = false);
