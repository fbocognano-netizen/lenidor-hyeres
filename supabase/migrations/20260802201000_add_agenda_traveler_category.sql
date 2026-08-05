ALTER TABLE IF EXISTS public.agenda_events
  ADD COLUMN IF NOT EXISTS traveler_category text;

DO $$
BEGIN
  IF to_regclass('public.agenda_events') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'agenda_events_traveler_category_check'
    ) THEN
    ALTER TABLE public.agenda_events
      ADD CONSTRAINT agenda_events_traveler_category_check
      CHECK (
        traveler_category IS NULL OR traveler_category IN (
          'music_nightlife', 'culture', 'family', 'markets_food',
          'outdoor_sport', 'wellbeing', 'local_life', 'other'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS agenda_events_traveler_category_idx
  ON public.agenda_events (traveler_category);
