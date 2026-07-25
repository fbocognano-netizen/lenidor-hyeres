CREATE TABLE public.ota_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url text NOT NULL,
  label text,
  position integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ota_links TO anon;
GRANT SELECT ON public.ota_links TO authenticated;
GRANT ALL ON public.ota_links TO service_role;

ALTER TABLE public.ota_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read enabled ota links" ON public.ota_links
  FOR SELECT TO anon, authenticated USING (enabled = true);

CREATE POLICY "Backend can manage ota links" ON public.ota_links
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_ota_links_updated_at
  BEFORE UPDATE ON public.ota_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.ota_links (url, position) VALUES
  ('https://www.airbnb.fr/rooms/1526120631746320177', 10),
  ('https://www.leboncoin.fr/ad/locations_saisonnieres/3216372939', 20);