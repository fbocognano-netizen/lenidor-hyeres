CREATE TABLE public.app_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL CHECK (level IN ('debug', 'info', 'warning', 'error')),
  event text NOT NULL,
  area text,
  message text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  url text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.app_logs TO service_role;

ALTER TABLE public.app_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Backend can manage app logs"
ON public.app_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE INDEX app_logs_created_at_idx ON public.app_logs(created_at DESC);
CREATE INDEX app_logs_level_idx ON public.app_logs(level);
CREATE INDEX app_logs_event_idx ON public.app_logs(event);