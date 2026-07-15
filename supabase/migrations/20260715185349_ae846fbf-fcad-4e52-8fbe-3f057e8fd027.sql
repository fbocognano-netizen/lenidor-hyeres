CREATE TABLE public.ical_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label text NOT NULL,
  url text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.ical_sources TO service_role;

ALTER TABLE public.ical_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Backend can manage ical sources" ON public.ical_sources
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_ical_sources_updated_at
  BEFORE UPDATE ON public.ical_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.ical_sources (label, url) VALUES
  ('Airbnb', 'https://www.airbnb.fr/calendar/ical/1526120631746320177.ics?t=774616f2469d47389d29985aecbbead5'),
  ('Abritel', 'https://www.abritel.fr/icalendar/cf2da2a6506e4b74b4663602f0dd9803.ics?nonTentative&includeTentative=false'),
  ('Gens de Confiance', 'https://static.gensdeconfiance.com/calendars/1a32a175-a6ff-4fdb-a0f9-a04876a2c4d5.calendar.ics');