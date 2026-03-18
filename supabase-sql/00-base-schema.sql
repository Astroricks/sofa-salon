-- =============================================================================
-- 00-base-schema.sql — Base schema for ZiggyGraph / Sofa Salon
-- =============================================================================
-- Run this first in Supabase SQL Editor. Then run 01, 02, ... 21 in order.
-- Creates: profiles, rooms, screenings, reservations, waitlist, triggers,
--          reorder_waitlist function, and enables realtime for reservations/waitlist.
-- =============================================================================

-- PROFILES (display name, wechat_id, avatar, is_admin)
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL DEFAULT '',
  wechat_id     TEXT DEFAULT '',
  avatar_config JSONB NOT NULL DEFAULT '{}',
  is_admin      BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read" ON profiles;
CREATE POLICY "Public read"  ON profiles FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Own update" ON profiles;
CREATE POLICY "Own update"   ON profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Own insert" ON profiles;
CREATE POLICY "Own insert"   ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ROOMS (furniture layout, decorations, canvas size)
CREATE TABLE IF NOT EXISTS rooms (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  owner_id         UUID REFERENCES profiles(id),
  furniture_json   JSONB NOT NULL DEFAULT '[]',
  decorations_json JSONB NOT NULL DEFAULT '[]',
  canvas_w         INT NOT NULL DEFAULT 600,
  canvas_h         INT NOT NULL DEFAULT 400,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin all"   ON rooms FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));
CREATE POLICY "Public read" ON rooms FOR SELECT USING (TRUE);

-- SCREENINGS (events: title, time, room, waitlist mode)
CREATE TABLE IF NOT EXISTS screenings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT DEFAULT '',
  screening_at  TIMESTAMPTZ NOT NULL,
  room_id       UUID REFERENCES rooms(id),
  squeeze_note  TEXT DEFAULT '',
  waitlist_mode TEXT NOT NULL DEFAULT 'auto',
  is_active     BOOLEAN DEFAULT TRUE,
  created_by    UUID REFERENCES profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE screenings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active" ON screenings FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admin all" ON screenings FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- RESERVATIONS (user booked seat for a screening)
CREATE TABLE IF NOT EXISTS reservations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_id UUID NOT NULL REFERENCES screenings(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seat_key     TEXT NOT NULL,
  is_squeezed  BOOLEAN DEFAULT FALSE,
  is_ghost     BOOLEAN DEFAULT FALSE,
  ghost_name   TEXT,
  ghost_avatar JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(screening_id, seat_key),
  UNIQUE(screening_id, user_id)
);
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read"  ON reservations FOR SELECT USING (TRUE);
CREATE POLICY "Own insert"   ON reservations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own delete"   ON reservations FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admin delete" ON reservations FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- WAITLIST (queue when screening is full)
CREATE TABLE IF NOT EXISTS waitlist (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_id UUID NOT NULL REFERENCES screenings(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  position     INT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'waiting',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(screening_id, user_id)
);
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read"  ON waitlist FOR SELECT USING (TRUE);
CREATE POLICY "Own insert"   ON waitlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own cancel"   ON waitlist FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admin all"    ON waitlist FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- Trigger: create profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
DECLARE initial_config JSONB;
BEGIN
  initial_config := jsonb_build_object(
    'skinTone',      (ARRAY['#f5c5a0','#d4a574','#c8a880','#a0724a','#7d4e2d','#f5deb3'])[floor(random()*6+1)],
    'hairStyle',     floor(random()*6+1)::int,
    'hairColor',     (ARRAY['#111111','#3a1a00','#8B4513','#DAA520','#FF6B6B','#4169E1','#9370DB'])[floor(random()*7+1)],
    'topStyle',      floor(random()*4+1)::int,
    'topColor',      (ARRAY['#2a4fd6','#e87cb5','#3ab87a','#e8c84a','#7c3ad6','#d63a2f','#e8824a'])[floor(random()*7+1)],
    'eyeExpression', (ARRAY['happy','sleepy','excited','neutral'])[floor(random()*4+1)],
    'accessory',     (ARRAY['none','none','none','glasses','hat'])[floor(random()*5+1)]
  );
  INSERT INTO public.profiles (id, display_name, wechat_id, avatar_config)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), '', initial_config);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function: reorder waitlist positions after promote/cancel
CREATE OR REPLACE FUNCTION reorder_waitlist(p_screening_id UUID) RETURNS VOID AS $$
BEGIN
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS new_pos
    FROM waitlist
    WHERE screening_id = p_screening_id AND status = 'waiting'
  )
  UPDATE waitlist w SET position = r.new_pos
  FROM ranked r WHERE w.id = r.id;
END;
$$ LANGUAGE plpgsql;

-- Realtime: broadcast changes to reservations and waitlist
ALTER PUBLICATION supabase_realtime ADD TABLE reservations;
ALTER PUBLICATION supabase_realtime ADD TABLE waitlist;
