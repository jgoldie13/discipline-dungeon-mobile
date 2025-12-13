-- Task Templates (global curated defaults, read-only for users)
-- These are system-provided task suggestions

CREATE TABLE IF NOT EXISTS public.task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'exposure', 'habit', 'productivity'
  category TEXT, -- 'social', 'physical', 'mental', 'creative'
  duration_min INT,
  difficulty TEXT DEFAULT 'medium', -- 'easy', 'medium', 'hard'
  xp_reward INT DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- No RLS on templates - they are public read-only
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read task templates"
  ON public.task_templates
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- User Tasks (user-specific copies + overrides)
CREATE TABLE IF NOT EXISTS public.user_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.task_templates(id) ON DELETE SET NULL,

  -- Task details (can override template)
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'exposure', 'habit', 'boss', 'job_search'
  duration_min INT,

  -- Status
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  xp_earned INT DEFAULT 0,

  -- Boss battle fields
  is_boss BOOLEAN DEFAULT false,
  boss_hp INT,
  boss_hp_remaining INT,
  boss_difficulty TEXT, -- 'easy', 'medium', 'hard', 'brutal'

  -- Scheduling
  scheduled_time TIMESTAMPTZ,
  optimal_window TEXT, -- 'morning', 'afternoon', 'evening'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks"
  ON public.user_tasks
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tasks"
  ON public.user_tasks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON public.user_tasks
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON public.user_tasks
  FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_user_tasks_user_id ON public.user_tasks(user_id);
CREATE INDEX idx_user_tasks_completed ON public.user_tasks(user_id, completed, created_at);

-- Auto-update updated_at
CREATE TRIGGER on_user_tasks_updated
  BEFORE UPDATE ON public.user_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
