-- Sessions (phone-free blocks)
-- Renamed from PhoneFreeBlock for clarity

CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Timing
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_min INT NOT NULL,

  -- Verification
  verified BOOLEAN DEFAULT false,
  verify_method TEXT DEFAULT 'honor_system', -- 'honor_system', 'photo', 'partner'

  -- XP
  xp_earned INT DEFAULT 0,

  -- Boss battle integration
  is_boss_block BOOLEAN DEFAULT false,
  linked_boss_id UUID REFERENCES public.user_tasks(id) ON DELETE SET NULL,
  time_of_day TEXT, -- 'morning', 'afternoon', 'evening'
  damage_dealt INT DEFAULT 0,

  -- Pomodoro
  pomodoro_enabled BOOLEAN DEFAULT false,
  pomodoro_focus_min INT,
  pomodoro_break_min INT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
  ON public.sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_sessions_start_time ON public.sessions(user_id, start_time);

-- Boss attacks junction table
CREATE TABLE IF NOT EXISTS public.boss_attacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.user_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Attack metrics
  damage_dealt INT NOT NULL,
  time_of_day TEXT NOT NULL,
  multiplier DECIMAL(3,2) DEFAULT 1.0,

  -- Context
  user_hp INT,
  block_duration_min INT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.boss_attacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own boss attacks"
  ON public.boss_attacks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own boss attacks"
  ON public.boss_attacks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_boss_attacks_task ON public.boss_attacks(task_id, created_at);
CREATE INDEX idx_boss_attacks_session ON public.boss_attacks(session_id);
