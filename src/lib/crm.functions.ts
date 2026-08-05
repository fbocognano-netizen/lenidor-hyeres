import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";

const CONSENT_VERSION = "club-nid-or-2026-07-31";

const crmLeadSchema = z.object({
  first_name: z.string().trim().min(1, "Le prénom est requis").max(80, "Prénom trop long"),
  email: z.string().trim().email("Email invalide").max(255, "Email trop long"),
  phone: z.string().trim().max(50, "Téléphone trop long").optional().nullable(),
  source: z.enum(["club_nid_or", "direct_booking_offer"]),
  source_url: z.string().trim().max(500).optional().nullable(),
  stay_period: z.string().trim().max(120).optional().nullable(),
  desired_dates: z.string().trim().max(180).optional().nullable(),
  message: z.string().trim().max(1000, "Message trop long").optional().nullable(),
  newsletter_consent: z.literal(true, {
    errorMap: () => ({ message: "Le consentement est requis pour recevoir nos offres." }),
  }),
});

export const captureCrmLead = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => crmLeadSchema.parse(data))
  .handler(async ({ data }) => {
    const { error } = await supabase.rpc("capture_crm_lead", {
      p_first_name: data.first_name,
      p_email: data.email,
      p_phone: data.phone || "",
      p_source: data.source,
      p_source_url: data.source_url || "",
      p_stay_period: data.stay_period || "",
      p_desired_dates: data.desired_dates || "",
      p_message: data.message || "",
      p_newsletter_consent: data.newsletter_consent,
      p_consent_version: CONSENT_VERSION,
    });

    if (error) {
      console.error("crm lead capture failed", { message: error.message, source: data.source });
      throw new Error("Impossible d'enregistrer votre inscription. Merci de réessayer.");
    }

    return { ok: true as const };
  });
