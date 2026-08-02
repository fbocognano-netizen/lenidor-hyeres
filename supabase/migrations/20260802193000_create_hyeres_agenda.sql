CREATE TABLE public.agenda_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'hyeres',
  source_event_id text NOT NULL,
  source_url text NOT NULL,
  title text NOT NULL,
  category text,
  location_slug text,
  location_label text,
  schedule_text text,
  source_published_at timestamptz,
  source_updated_at timestamptz,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agenda_events_source_event_unique UNIQUE (source, source_event_id),
  CONSTRAINT agenda_events_source_url_unique UNIQUE (source_url)
);

CREATE TABLE public.agenda_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.agenda_events(id) ON DELETE CASCADE,
  occurrence_date date NOT NULL,
  source_checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agenda_occurrences_event_date_unique UNIQUE (event_id, occurrence_date)
);

CREATE TABLE public.agenda_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'hyeres',
  range_start date NOT NULL,
  range_end date NOT NULL,
  status text NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  events_seen integer NOT NULL DEFAULT 0,
  occurrences_seen integer NOT NULL DEFAULT 0,
  unmatched_events integer NOT NULL DEFAULT 0,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX agenda_events_category_idx ON public.agenda_events (category);
CREATE INDEX agenda_events_location_slug_idx ON public.agenda_events (location_slug);
CREATE INDEX agenda_occurrences_date_idx ON public.agenda_occurrences (occurrence_date);
CREATE INDEX agenda_sync_runs_started_at_idx ON public.agenda_sync_runs (started_at DESC);

GRANT ALL ON public.agenda_events TO service_role;
GRANT ALL ON public.agenda_occurrences TO service_role;
GRANT ALL ON public.agenda_sync_runs TO service_role;

ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Backend can manage agenda events" ON public.agenda_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Backend can manage agenda occurrences" ON public.agenda_occurrences
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Backend can manage agenda sync runs" ON public.agenda_sync_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_agenda_events_updated_at
  BEFORE UPDATE ON public.agenda_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
