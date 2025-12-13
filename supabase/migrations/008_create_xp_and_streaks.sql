-- XP Events Ledger (immutable, append-only source of truth for XP)

CREATE TABLE IF NOT EXISTS public.xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL, -- 'block_complete', 'urge_resist', 'task_complete', 'violation_penalty', 'decay'
  delta INT NOT NULL, -- XP change (positive or negative)

  -- Reference to source
  related_table TEXT, -- 'sessions', 'urge_events', 'user_tasks', 'usage_violations'
  related_id UUID,

  -- Metadata
  description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;

-- XP ledger is append-only: users can read and insert, but not update or delete
CREATE POLICY "Users can view own xp events"
  ON public.xp_events
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own xp events"
  ON public.xp_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_xp_events_user ON public.xp_events(user_id);
CREATE INDEX idx_xp_events_created ON public.xp_events(user_id, created_at);
CREATE INDEX idx_xp_events_related ON public.xp_events(related_table, related_id);

-- Streak History (daily streak snapshots)
CREATE TABLE IF NOT EXISTS public.streak_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  date DATE NOT NULL,
  streak_count INT NOT NULL,
  broken BOOLEAN DEFAULT false,
  reason TEXT, -- Why streak was broken

  -- Daily performance
  under_limit BOOLEAN DEFAULT true,
  violation_count INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, date)
);

ALTER TABLE public.streak_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streak history"
  ON public.streak_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own streak history"
  ON public.streak_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_streak_history_user_date ON public.streak_history(user_id, date);

-- Sleep Logs (circadian tracking)
CREATE TABLE IF NOT EXISTS public.sleep_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  date DATE NOT NULL, -- Morning you wake up

  -- Sleep window
  bedtime TIMESTAMPTZ NOT NULL,
  waketime TIMESTAMPTZ NOT NULL,
  sleep_duration_min INT NOT NULL,

  -- Quality
  subjective_rested INT, -- 1-5 scale
  sleep_quality INT DEFAULT 0, -- 0-100 derived score

  -- Circadian alignment
  wake_on_time BOOLEAN DEFAULT false,
  wake_variance_min INT DEFAULT 0,

  -- HP calculation
  hp_calculated INT DEFAULT 60,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, date)
);

ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sleep logs"
  ON public.sleep_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sleep logs"
  ON public.sleep_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sleep logs"
  ON public.sleep_logs
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_sleep_logs_user_date ON public.sleep_logs(user_id, date);

-- Daily Protocol (morning routine tracking)
CREATE TABLE IF NOT EXISTS public.daily_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  date DATE NOT NULL,

  -- Checklist
  woke_on_time BOOLEAN DEFAULT false,
  got_morning_light BOOLEAN DEFAULT false,
  drank_water BOOLEAN DEFAULT false,
  delayed_caffeine BOOLEAN DEFAULT false,

  -- Completion
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  xp_earned INT DEFAULT 0,
  hp_bonus INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, date)
);

ALTER TABLE public.daily_protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own protocols"
  ON public.daily_protocols
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own protocols"
  ON public.daily_protocols
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own protocols"
  ON public.daily_protocols
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_daily_protocols_user_date ON public.daily_protocols(user_id, date);
