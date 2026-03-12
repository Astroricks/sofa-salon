-- Add year, director, duration_minutes to screenings (for prototype card: "1994 · Wong Kar-wai · 98 min")
-- Run in Supabase SQL Editor.

ALTER TABLE screenings ADD COLUMN IF NOT EXISTS year INT;
ALTER TABLE screenings ADD COLUMN IF NOT EXISTS director TEXT DEFAULT '';
ALTER TABLE screenings ADD COLUMN IF NOT EXISTS duration_minutes INT;
