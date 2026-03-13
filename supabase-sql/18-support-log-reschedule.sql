-- Support/feedback logs (technical issues, cancel issues). Admin sees these in Feedback page.
-- Reschedule: proposals + options (date+time) + votes. Voting ends 24h before screening_at; max 5 options per screening.
-- Run in Supabase SQL Editor once.

-- Support log: one row per user-reported issue
CREATE TABLE IF NOT EXISTS support_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type         TEXT NOT NULL,  -- cancel_issue | seat_gone | booking_cancelled | page_broken | cant_select | reschedule_request
  screening_id UUID REFERENCES screenings(id) ON DELETE SET NULL,
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  priority     SMALLINT DEFAULT 2,  -- 1 = urgent, 2 = normal
  message      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE support_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read
CREATE POLICY "Admin read support_logs" ON support_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Authenticated users can insert (their own report)
CREATE POLICY "User insert support_log" ON support_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_support_logs_created ON support_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_logs_type ON support_logs(type);
CREATE INDEX IF NOT EXISTS idx_support_logs_screening ON support_logs(screening_id) WHERE screening_id IS NOT NULL;

-- Reschedule: one proposal per screening (first user creates it and adds up to 3 options; others add 1 or vote)
CREATE TABLE IF NOT EXISTS reschedule_proposals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_id UUID NOT NULL REFERENCES screenings(id) ON DELETE CASCADE,
  created_by   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(screening_id)
);

CREATE TABLE IF NOT EXISTS reschedule_options (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id    UUID NOT NULL REFERENCES reschedule_proposals(id) ON DELETE CASCADE,
  option_date    DATE NOT NULL,
  time_slot      TEXT NOT NULL,  -- e.g. "19:00–22:00" or "14:00–17:00"
  position       SMALLINT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reschedule_votes (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_id  UUID NOT NULL REFERENCES reschedule_options(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, option_id)
);

ALTER TABLE reschedule_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE reschedule_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE reschedule_votes ENABLE ROW LEVEL SECURITY;

-- Proposals: anyone can read (to show options); creator or admin can insert/update
CREATE POLICY "Read reschedule_proposals" ON reschedule_proposals FOR SELECT USING (true);
CREATE POLICY "Insert reschedule_proposal" ON reschedule_proposals
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Options: anyone can read
CREATE POLICY "Read reschedule_options" ON reschedule_options FOR SELECT USING (true);
CREATE POLICY "Insert reschedule_option" ON reschedule_options
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM reschedule_proposals p WHERE p.id = proposal_id AND p.created_by = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- Votes: anyone logged in can insert/delete own vote
CREATE POLICY "Read reschedule_votes" ON reschedule_votes FOR SELECT USING (true);
CREATE POLICY "Insert own vote" ON reschedule_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own vote" ON reschedule_votes FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_reschedule_options_proposal ON reschedule_options(proposal_id);
CREATE INDEX IF NOT EXISTS idx_reschedule_votes_option ON reschedule_votes(option_id);
