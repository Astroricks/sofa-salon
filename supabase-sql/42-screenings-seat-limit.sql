-- Optional hard seat cap per screening.
-- NULL preserves legacy behavior: all room seats plus configured squeeze seats.

ALTER TABLE public.screenings
  ADD COLUMN IF NOT EXISTS seat_limit INT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'screenings_seat_limit_positive'
  ) THEN
    ALTER TABLE public.screenings
      ADD CONSTRAINT screenings_seat_limit_positive
      CHECK (seat_limit IS NULL OR seat_limit > 0);
  END IF;
END $$;

COMMENT ON COLUMN public.screenings.seat_limit IS
  'Hard reservation capacity for this screening. NULL uses the full room and squeeze seats.';
