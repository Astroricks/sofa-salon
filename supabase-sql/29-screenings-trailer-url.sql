-- Optional trailer / promo video URL (YouTube or any https link) for screenings.

ALTER TABLE public.screenings ADD COLUMN IF NOT EXISTS trailer_url TEXT DEFAULT '';
