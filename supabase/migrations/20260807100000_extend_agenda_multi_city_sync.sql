ALTER TABLE public.agenda_events
  ADD COLUMN IF NOT EXISTS source_name text,
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS price_text text,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Europe/Paris',
  ADD COLUMN IF NOT EXISTS event_fingerprint text,
  ADD COLUMN IF NOT EXISTS raw_payload_hash text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS first_seen_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.agenda_sync_runs
  ADD COLUMN IF NOT EXISTS source_stats jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS agenda_events_city_idx ON public.agenda_events (city);
CREATE INDEX IF NOT EXISTS agenda_events_source_name_idx ON public.agenda_events (source_name);
CREATE INDEX IF NOT EXISTS agenda_events_fingerprint_idx ON public.agenda_events (event_fingerprint);
CREATE INDEX IF NOT EXISTS agenda_events_status_idx ON public.agenda_events (status);
CREATE INDEX IF NOT EXISTS agenda_events_last_seen_at_idx ON public.agenda_events (last_seen_at DESC);

COMMENT ON COLUMN public.agenda_events.source_name IS
  'Human-readable source name displayed in admin and used for source diagnostics.';
COMMENT ON COLUMN public.agenda_events.city IS
  'Normalized city where the event is located. Events outside the supported Hyères area are ignored.';
COMMENT ON COLUMN public.agenda_events.event_fingerprint IS
  'Deterministic title/date/city/location key used for duplicate analysis across sources.';
COMMENT ON COLUMN public.agenda_events.raw_payload_hash IS
  'Hash of the normalized source payload used to detect source changes without storing full copyrighted payloads.';
COMMENT ON COLUMN public.agenda_sync_runs.source_stats IS
  'Per-source sync diagnostics: status, event count and non-sensitive error messages.';
