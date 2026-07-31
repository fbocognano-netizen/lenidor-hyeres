CREATE TABLE public.crm_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  first_name text NOT NULL,
  phone text,
  lifecycle_stage text NOT NULL DEFAULT 'prospect',
  segments text[] NOT NULL DEFAULT '{}',
  sources text[] NOT NULL DEFAULT '{}',
  last_source text,
  last_source_url text,
  newsletter_consent boolean NOT NULL DEFAULT false,
  newsletter_consent_at timestamptz,
  newsletter_consent_text text,
  newsletter_consent_version text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_submitted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_contacts_email_unique UNIQUE (email),
  CONSTRAINT crm_contacts_email_lowercase CHECK (email = lower(email)),
  CONSTRAINT crm_contacts_lifecycle_stage_check CHECK (
    lifecycle_stage IN ('prospect', 'client', 'former_guest')
  )
);

CREATE TABLE public.crm_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid NOT NULL REFERENCES public.crm_contacts(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  source text NOT NULL,
  source_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX crm_contacts_segments_idx ON public.crm_contacts USING gin (segments);
CREATE INDEX crm_contacts_sources_idx ON public.crm_contacts USING gin (sources);
CREATE INDEX crm_contacts_lifecycle_stage_idx ON public.crm_contacts (lifecycle_stage);
CREATE INDEX crm_events_contact_id_created_at_idx ON public.crm_events (contact_id, created_at DESC);

GRANT ALL ON public.crm_contacts TO service_role;
GRANT ALL ON public.crm_events TO service_role;

ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Backend can manage crm contacts" ON public.crm_contacts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Backend can manage crm events" ON public.crm_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER update_crm_contacts_updated_at
  BEFORE UPDATE ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
