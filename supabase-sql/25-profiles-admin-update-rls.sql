-- Admins may UPDATE any profile row (no_show_count, consecutive_attendances, etc.).
-- Without this, only "Own update" (auth.uid() = id) applies — admin API routes
-- that call profiles.update for a guest user are blocked by RLS.
--
-- Requires: 03-profiles-admin-read-wechat.sql (function public.current_user_is_admin).

DROP POLICY IF EXISTS "Admin update all profiles" ON profiles;
CREATE POLICY "Admin update all profiles" ON profiles
  FOR UPDATE
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());
