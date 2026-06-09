# Supabase SQL migrations

All database schema and migrations for ZiggyGraph / Sofa Salon. Run in **Supabase Dashboard → SQL Editor** in numeric order (00 → 21, then 25 → 35 as needed).

## Migration safety

- **Always back up your database before running migrations on production.** Use Supabase Dashboard → Database → Backups, or `pg_dump`, before applying new scripts.
- **Run migrations in numeric order.** Skipping a file (e.g. running 05 before 04) can cause errors or broken schema. If you are setting up a new environment, run 00 first, then 01 through 21, then 25 through 35 as applicable.
- **If a migration fails halfway**, the database may be in an inconsistent state. Read the failed SQL file to understand what it was doing; fix data or schema manually if needed, then re-run only the failed file (or the remainder) after fixing.

## Order of execution

| Step | File | Purpose |
|------|------|--------|
| **00** | `00-base-schema.sql` | Base schema: `profiles`, `rooms`, `screenings`, `reservations`, `waitlist`, RLS, trigger `handle_new_user`, function `reorder_waitlist`, realtime for reservations/waitlist. **Run this first.** |
| 01 | `01-profiles-rls-allow-insert.sql` | Ensures users can insert their own profile row (fixes RLS "new row violates" on sign-up). |
| 02 | `02-screenings-year-director-duration.sql` | Adds `year`, `director`, `duration_minutes` to `screenings` (for film cards and receipt). |
| 03 | `03-profiles-admin-read-wechat.sql` | Lets admins read all `wechat_id` (seat map viewer details). |
| 04 | `04-ratings-and-ticker.sql` | `screening_ratings` (1–5 stars), `ticker_custom`, `ticker_config` (ticker management). |
| 05 | `05-reservations-allow-ghost-multi.sql` | Allows multiple ghost seats per screening; relaxes unique constraints for ghosts. |
| 06 | `06-reservations-multi-seat-per-user.sql` | Allows one user to hold multiple seats per screening (e.g. for friends); unique on `(screening_id, seat_key)`. Run after 05. |
| 07 | `07-reservations-attended.sql` | Adds `attended` to `reservations` (admin marks attendance / no-show). |
| 08 | `08-profiles-no-show-badge.sql` | Adds `no_show_count`, `consecutive_attendances` (blood bar / pigeon). Badges: **27** RPCs. |
| 09 | `09-ticker-user-messages.sql` | Table `ticker_user_messages` for user-submitted ticker lines. |
| 10 | `10-config-cancel-no-show-hours.sql` | Config key `cancel_no_show_hours` (default 24) for “no-show” cutoff. |
| 11 | `11-reservations-drop-screening-user-unique.sql` | Drops `(screening_id, user_id)` unique on reservations (required after multi-seat). |
| 12 | `12-reservations-friend-avatar.sql` | Adds `friend_avatar` to reservations (friend-seat display). |
| 13 | `13-profiles-email-preferences.sql` | Adds email preference columns: `email_event_reminder`, `email_waitlist_promotion`, `email_post_event_rating`. |
| 14 | `14-profiles-welcome-email-sent.sql` | Adds `welcome_email_sent_at` to profiles (one-time welcome email). |
| 15 | `15-ticker-custom-created-by.sql` | Adds `created_by` to `ticker_custom` (admin attribution on ticker). |
| 16 | `16-ticker-system-events.sql` | Table `ticker_system_events` (cancel/reschedule notices) and config for showing them. |
| 17 | `17-waitlist-manual-promote-one.sql` | **Query + template only.** Use to fix historical “promoted but no reservation” cases; not a schema change. |
| 18 | `18-support-log-reschedule.sql` | `support_logs`, reschedule proposals/options/votes (feedback and reschedule flow). |
| 19 | `19-reschedule-options-any-user.sql` | Allows any authenticated user to insert reschedule options. Run after 18. |
| 20 | `20-support-logs-status.sql` | Adds `status` (open/fixed/dismissed), `resolved_at`, `resolved_by` to `support_logs`. Run after 18. |
| 21 | `21-rooms-background.sql` | Adds `room_background_id` to `rooms` (default `'warm'`). |
| 25 | `25-profiles-admin-update-rls.sql` | RLS: admins may `UPDATE` any `profiles` row (guest pigeon / consecutive fields). Requires **03** (`current_user_is_admin`). |
| 26 | `26-user-attendance-counts-view.sql` | Optional view `user_attendance_counts` + indexes (ad-hoc SQL). App uses **27** RPCs. |
| 27 | `27-user-attendance-counts-functions.sql` | `SECURITY DEFINER` RPCs for badge counts. `EXECUTE` for `anon`, `authenticated`, `service_role`. |
| 28 | `28-drop-profiles-attendance-count.sql` | Drops legacy `profiles.attendance_count` if present (fresh **08** no longer adds it). |
| 29 | `29-screenings-trailer-url.sql` | Adds `screenings.trailer_url` (optional trailer / video link). |
| 30 | `30-reservations-admin-update-rls.sql` | RLS: admins may `UPDATE` `reservations` (attendance / no-show marks). Requires **03**. |
| 31 | `31-profiles-contact-platform.sql` | Adds `contact_platform` + `contact_id`; backfill from `wechat_id`. |
| 32 | `32-profiles-existing-contact-platform-data.sql` | Data: default `wechat`; edit `YOUR_WHATSAPP_DISPLAY_NAME_*` for WhatsApp guests. Run after **31**. |
| 33 | `33-profiles-contact-id-unique-index.sql` | Unique on `(display_name, contact_id)` — not global. Run after **32**; if it fails, use `query-find-duplicate-contact-ids.sql` first. |
| 34 | `34-profiles-reset-no-show-counts.sql` | Resets `no_show_count` and `consecutive_attendances` to 0 for all profiles. |
| — | `31-attended-present-normalize.sql` | **One-time data:** `attended=true` → `null`. Run once if upgrading from tri-state marks. |
| 35 | `35-reservations-attended-check.sql` | `CHECK`: `attended` is only `NULL` (present) or `false` (no-show). Run after normalize. |
| 36 | `36-screenings-catalog-archive.sql` | RLS: authenticated users can read past `screenings` (`screening_at < now()`). |
| 37 | `37-seed-historical-screenings-catalog.sql` | Sheet seed (273 rows) + fill empty `title`/`title_en` on existing same-night rows. Regenerate: `node scripts/generate-historical-screenings-sql.mjs`. |
| 41 | `41-patch-historical-duration-minutes.sql` | **One-off data:** `duration_minutes` for past rows (OMDb + manual). Run `node scripts/fetch-historical-durations-omdb.mjs` and/or `apply-manual-durations.mjs`; review `scripts/data/historical-duration-omdb-review.json`. |

### First-time: past screenings + sheet sync (36 → 37)

You have **not** run these yet. In **Supabase → SQL Editor**, in order:

1. **`36-screenings-catalog-archive.sql`** — one RLS policy only. No new tables. Lets logged-in users search/claim **any** past row in `screenings` (site-created or sheet).

2. **`37-seed-historical-screenings-catalog.sql`** — two steps in one file:
   - **(A)** Inserts 273 past screenings from the Google Sheet CSV (`is_active = false`; normal `screenings` rows, not a separate catalog table).
   - **(B)** For screenings **already on your site** on the same NY date + release year as the sheet, fills **only** empty `title` / `title_en` from the sheet (Letterboxd-matched English). Rows that already have **both** names (e.g. 蒙巴纳斯 + Montparnasse) are **not** overwritten.
   - **(C)** Any row with `title` like `女孩们都很好 Las chicas están bien` is split: Chinese → `title`, Latin suffix → `title_en` (all such rows, not just one film).

Does **not** change `screening_at`, directors, reservations, or attendance.

Safe to re-run **37** after editing the CSV (regenerate the file first with `node scripts/generate-historical-screenings-sql.mjs`).

**Already ran 37 and see duplicate past screenings in 补登?** Run **`40-remove-sheet-seed-duplicates.sql`** once (then re-run **37** if needed).

**Already ran 37 before part (C) existed?** Run `node scripts/normalize-bilingual-screening-titles.mjs` once (same split logic).

**Do not run** old `38` / `39` if present — that logic is merged into **37**.

## New environment setup

1. Create a Supabase project and note **Project URL** and **anon** / **service_role** keys.
2. Run **00** first. If `ALTER PUBLICATION supabase_realtime` fails (e.g. already added), skip those two lines.
3. Run **01** through **21**, then **25**–**32** in order. Skip **17** unless you need the one-off repair query. **28** is harmless if `attendance_count` was never on `profiles`.
4. Set an admin: `UPDATE profiles SET is_admin = TRUE WHERE id = '<your-auth-user-uuid>';`

## Notes

- **00** creates the minimum needed for the app (auth, profiles, rooms, screenings, reservations, waitlist).
- Later files use `IF NOT EXISTS` / `DROP POLICY IF EXISTS` where possible so re-running is safe.
- **17** is documentation + a manual query/template; run the `SELECT` to find rows, then fill and run the `INSERT`/`UPDATE` block if needed.

## Adding a new migration

1. Add a new file with the next number (e.g. `22-my-feature.sql`).
2. Write the SQL (prefer `IF NOT EXISTS` / `DROP ... IF EXISTS` so re-running is safe).
3. Update this README: add a row to the table above and describe the purpose in one line.
4. Run the new file in Supabase SQL Editor after all previous migrations have been applied.
