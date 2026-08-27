-- 1) Lock down SECURITY DEFINER / trigger functions
REVOKE ALL ON FUNCTION public.capture_crm_lead(text,text,text,text,text,text,text,text,boolean,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.capture_crm_lead(text,text,text,text,text,text,text,text,boolean,text) TO service_role;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- 2) Public read access for agenda content
GRANT SELECT ON public.agenda_events TO anon, authenticated;
GRANT SELECT ON public.agenda_occurrences TO anon, authenticated;

DROP POLICY IF EXISTS "Public can read active agenda events" ON public.agenda_events;
CREATE POLICY "Public can read active agenda events"
ON public.agenda_events FOR SELECT TO anon, authenticated
USING (status = 'active');

DROP POLICY IF EXISTS "Public can read agenda occurrences" ON public.agenda_occurrences;
CREATE POLICY "Public can read agenda occurrences"
ON public.agenda_occurrences FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.agenda_events e
  WHERE e.id = agenda_occurrences.event_id AND e.status = 'active'
));

-- 3) Storage: explicit deny-by-default policies for the private gallery bucket
DROP POLICY IF EXISTS "Backend manages gallery objects" ON storage.objects;
CREATE POLICY "Backend manages gallery objects"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'gallery')
WITH CHECK (bucket_id = 'gallery');