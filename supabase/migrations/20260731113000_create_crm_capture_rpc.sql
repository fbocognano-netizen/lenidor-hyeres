CREATE OR REPLACE FUNCTION public.capture_crm_lead(
  p_first_name text,
  p_email text,
  p_phone text,
  p_source text,
  p_source_url text,
  p_stay_period text,
  p_desired_dates text,
  p_message text,
  p_newsletter_consent boolean,
  p_consent_version text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(p_email));
  v_first_name text := trim(p_first_name);
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
  v_contact_id uuid;
  v_existing_segments text[] := '{}';
  v_existing_sources text[] := '{}';
  v_existing_stage text;
  v_lifecycle_stage text;
  v_segments text[];
  v_event_type text;
  v_consent_text text := 'J''accepte de recevoir les offres, actualités et disponibilités du Nid d''Or par email.';
BEGIN
  IF p_newsletter_consent IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'newsletter_consent_required';
  END IF;

  IF v_first_name = '' OR v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION 'invalid_contact';
  END IF;

  IF p_source = 'club_nid_or' THEN
    v_lifecycle_stage := 'former_guest';
    v_segments := ARRAY['club_nid_or', 'ancien_voyageur', 'offre_retour'];
    v_event_type := 'club_signup';
  ELSIF p_source = 'direct_booking_offer' THEN
    v_lifecycle_stage := 'prospect';
    v_segments := ARRAY['prospect', 'reservation_directe', 'offre_directe'];
    v_event_type := 'direct_offer_signup';
  ELSE
    RAISE EXCEPTION 'invalid_source';
  END IF;

  SELECT id, segments, sources, lifecycle_stage
    INTO v_contact_id, v_existing_segments, v_existing_sources, v_existing_stage
  FROM public.crm_contacts
  WHERE email = v_email;

  IF v_contact_id IS NULL THEN
    INSERT INTO public.crm_contacts (
      email,
      first_name,
      phone,
      lifecycle_stage,
      segments,
      sources,
      last_source,
      last_source_url,
      newsletter_consent,
      newsletter_consent_at,
      newsletter_consent_text,
      newsletter_consent_version,
      last_submitted_at
    )
    VALUES (
      v_email,
      v_first_name,
      v_phone,
      v_lifecycle_stage,
      v_segments,
      ARRAY[p_source],
      p_source,
      nullif(trim(coalesce(p_source_url, '')), ''),
      true,
      now(),
      v_consent_text,
      p_consent_version,
      now()
    )
    RETURNING id INTO v_contact_id;
  ELSE
    UPDATE public.crm_contacts
    SET
      first_name = v_first_name,
      phone = v_phone,
      lifecycle_stage = CASE WHEN v_existing_stage = 'client' THEN 'client' ELSE v_lifecycle_stage END,
      segments = ARRAY(SELECT DISTINCT unnest(coalesce(v_existing_segments, '{}') || v_segments)),
      sources = ARRAY(SELECT DISTINCT unnest(coalesce(v_existing_sources, '{}') || ARRAY[p_source])),
      last_source = p_source,
      last_source_url = nullif(trim(coalesce(p_source_url, '')), ''),
      newsletter_consent = true,
      newsletter_consent_at = now(),
      newsletter_consent_text = v_consent_text,
      newsletter_consent_version = p_consent_version,
      last_submitted_at = now()
    WHERE id = v_contact_id;
  END IF;

  INSERT INTO public.crm_events (
    contact_id,
    event_type,
    source,
    source_url,
    metadata
  )
  VALUES (
    v_contact_id,
    v_event_type,
    p_source,
    nullif(trim(coalesce(p_source_url, '')), ''),
    jsonb_build_object(
      'stay_period', nullif(trim(coalesce(p_stay_period, '')), ''),
      'desired_dates', nullif(trim(coalesce(p_desired_dates, '')), ''),
      'message', nullif(trim(coalesce(p_message, '')), ''),
      'consent_version', p_consent_version
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.capture_crm_lead(text, text, text, text, text, text, text, text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.capture_crm_lead(text, text, text, text, text, text, text, text, boolean, text) TO anon;
GRANT EXECUTE ON FUNCTION public.capture_crm_lead(text, text, text, text, text, text, text, text, boolean, text) TO authenticated;
