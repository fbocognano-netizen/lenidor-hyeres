ALTER TABLE public.agenda_events
  ADD COLUMN IF NOT EXISTS source_category text;

COMMENT ON COLUMN public.agenda_events.source_category IS
  'Category exactly as received from the source; category stores the normalized internal value.';
