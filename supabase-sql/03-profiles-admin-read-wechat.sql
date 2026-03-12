-- Optional: let admins read other users' display_name and wechat_id (for seat map guest detail / contact).
-- Run in Supabase SQL Editor if admin seat-detail modal shows "—" for WeChat ID.
-- Requires: profiles has is_admin column; RLS is enabled on profiles.

-- Helper: true if current user is admin (avoids self-reference in policy).
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_admin FROM profiles WHERE id = auth.uid()), false);
$$;

-- Allow users to read own profile; allow admins to read all profiles.
DROP POLICY IF EXISTS "Admin read all profiles" ON profiles;
CREATE POLICY "Admin read all profiles" ON profiles
  FOR SELECT
  USING (auth.uid() = id OR public.current_user_is_admin());
