-- Urge Events (unified table for scroll intents, urge resistance, and microtask selection)
-- This consolidates Urge model + scroll_intent + microtask_selected events

CREATE TABLE IF NOT EXISTS public.urge_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Event type
  event_type TEXT NOT NULL, -- 'scroll_intent', 'microtask_selected', 'urge_logged', 'urge_resisted'

  -- Trigger/source info
  trigger TEXT, -- 'boredom', 'anxiety', 'habit', 'scroll'
  source TEXT, -- 'bottom_nav', 'mobile_button', 'urge_page'
  page TEXT, -- Current pathname when event occurred

  -- Microtask selection (if applicable)
  microtask_choice TEXT, -- 'block_10', 'block_30', 'urge_scroll', 'phone_log', 'tasks', 'build'

  -- Urge resistance (if applicable)
  replacement_task TEXT, -- What user did instead
  completed BOOLEAN DEFAULT false,
  duration_sec INT, -- How long they resisted

  -- Metadata
  metadata JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.urge_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own urge events"
  ON public.urge_events
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own urge events"
  ON public.urge_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes for analytics queries
CREATE INDEX idx_urge_events_user_id ON public.urge_events(user_id);
CREATE INDEX idx_urge_events_created ON public.urge_events(user_id, created_at);
CREATE INDEX idx_urge_events_type ON public.urge_events(user_id, event_type, created_at);
CREATE INDEX idx_urge_events_source ON public.urge_events(source, created_at);
