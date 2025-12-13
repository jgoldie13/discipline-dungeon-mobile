-- Create user_settings table for versioned JSON settings
-- Stores PolicyEngine configuration per user

CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  version INT DEFAULT 1,
  settings JSONB DEFAULT '{
    "dailyPhoneLimitMin": 30,
    "blockPresets": [10, 30, 60],
    "pomodoroEnabled": false,
    "pomodoroFocusMin": 25,
    "pomodoroBreakMin": 5,
    "weekdayLimitMin": 30,
    "weekendLimitMin": 60,
    "microtasksEnabled": true,
    "difficultyLevel": "normal"
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Users can only read their own settings
CREATE POLICY "Users can view own settings"
  ON public.user_settings
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own settings
CREATE POLICY "Users can update own settings"
  ON public.user_settings
  FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own settings (on first access)
CREATE POLICY "Users can insert own settings"
  ON public.user_settings
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Auto-update updated_at timestamp
CREATE TRIGGER on_user_settings_updated
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create settings on profile creation
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile();
