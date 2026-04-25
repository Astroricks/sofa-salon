-- Remove legacy profiles.attendance_count (badges use migration 27 RPCs only).
-- Safe on DBs that never had the column (IF EXISTS). Run after 08 if 08 was
-- applied before attendance_count was removed from 08.

ALTER TABLE public.profiles DROP COLUMN IF EXISTS attendance_count;
