-- Phone Usage Logs (daily self-reported usage)

CREATE TABLE IF NOT EXISTS public.phone_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Date (one log per day per user)
  date DATE NOT NULL,

  -- Usage data
  social_media_min INT NOT NULL, -- Self-reported minutes
  limit_min INT NOT NULL, -- Daily limit at time of logging
  overage INT DEFAULT 0, -- Minutes over limit

  -- Penalty tracking
  penalty TEXT, -- Description of consequence
  penalty_executed BOOLEAN DEFAULT false,
  penalty_executed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- One log per user per day
  UNIQUE(user_id, date)
);

ALTER TABLE public.phone_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own phone logs"
  ON public.phone_usage_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own phone logs"
  ON public.phone_usage_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own phone logs"
  ON public.phone_usage_logs
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_phone_usage_logs_user_date ON public.phone_usage_logs(user_id, date);

-- Usage Violations (automated penalty records)
CREATE TABLE IF NOT EXISTS public.usage_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  date DATE NOT NULL,
  total_overage INT NOT NULL, -- Minutes over limit
  penalty TEXT NOT NULL, -- Description of penalty
  executed BOOLEAN DEFAULT false,
  executed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.usage_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own violations"
  ON public.usage_violations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own violations"
  ON public.usage_violations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_usage_violations_user_date ON public.usage_violations(user_id, date);
