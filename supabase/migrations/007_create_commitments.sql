-- Commitments (weekly stake commitments with results)

CREATE TABLE IF NOT EXISTS public.commitments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Period
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Stake
  amount INT NOT NULL, -- Amount in cents (e.g., 10000 = $100)

  -- Success criteria (stored as JSONB for flexibility)
  criteria JSONB NOT NULL DEFAULT '{
    "maxSocialMediaMin": 30,
    "minExposureTasks": 3,
    "minPhoneFreeBlocks": 5
  }'::jsonb,

  -- Anti-charity target
  anti_charity_name TEXT DEFAULT 'Trump 2024 Campaign',
  anti_charity_url TEXT,

  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'evaluating', 'passed', 'failed', 'cancelled'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.commitments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own commitments"
  ON public.commitments
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own commitments"
  ON public.commitments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own commitments"
  ON public.commitments
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_commitments_user ON public.commitments(user_id);
CREATE INDEX idx_commitments_dates ON public.commitments(user_id, start_date, end_date);

CREATE TRIGGER on_commitments_updated
  BEFORE UPDATE ON public.commitments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Commitment Results (evaluation and payment tracking)
CREATE TABLE IF NOT EXISTS public.commitment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commitment_id UUID NOT NULL REFERENCES public.commitments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Evaluation
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  outcome TEXT NOT NULL, -- 'pass', 'fail'

  -- Metrics at evaluation time
  metrics JSONB NOT NULL, -- { actualSocialMediaMin, actualExposureTasks, actualPhoneFreeBlocks, ... }

  -- Payment tracking (manual, no Stripe)
  paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMPTZ,
  proof_url TEXT, -- Screenshot of donation receipt
  cheated BOOLEAN DEFAULT false, -- User admitted to not paying

  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.commitment_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own results"
  ON public.commitment_results
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own results"
  ON public.commitment_results
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own results"
  ON public.commitment_results
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_commitment_results_commitment ON public.commitment_results(commitment_id);
CREATE INDEX idx_commitment_results_user ON public.commitment_results(user_id);
