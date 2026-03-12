-- ── SCREENING RATINGS (user rates film quality for attended screenings) ───
-- Run in Supabase SQL Editor once.

CREATE TABLE IF NOT EXISTS screening_ratings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  screening_id UUID NOT NULL REFERENCES screenings(id) ON DELETE CASCADE,
  rating       SMALLINT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, screening_id)
);

ALTER TABLE screening_ratings ENABLE ROW LEVEL SECURITY;

-- User can insert/update/delete own rating only
CREATE POLICY "Own ratings" ON screening_ratings
  FOR ALL USING (auth.uid() = user_id);

-- Admins can read all (for report)
CREATE POLICY "Admin read ratings" ON screening_ratings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

CREATE INDEX IF NOT EXISTS idx_screening_ratings_screening_id ON screening_ratings(screening_id);


-- ── TICKER CUSTOM LINES (admin-managed ticker content) ─────────────────────
CREATE TABLE IF NOT EXISTS ticker_custom (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content    TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ticker_custom ENABLE ROW LEVEL SECURITY;

-- Public can read active lines (for Ticker component)
CREATE POLICY "Public read active" ON ticker_custom
  FOR SELECT USING (is_active = TRUE);

-- Admin can do everything
CREATE POLICY "Admin all ticker_custom" ON ticker_custom
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );


-- ── TICKER CONFIG (what to show: upcoming events, ratings) ──────────────────
CREATE TABLE IF NOT EXISTS ticker_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT 'true'
);

ALTER TABLE ticker_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read ticker_config" ON ticker_config FOR SELECT USING (TRUE);
CREATE POLICY "Admin all ticker_config" ON ticker_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Defaults: show upcoming, show ratings
INSERT INTO ticker_config (key, value) VALUES ('show_upcoming', 'true'), ('show_ratings', 'true')
  ON CONFLICT (key) DO NOTHING;
