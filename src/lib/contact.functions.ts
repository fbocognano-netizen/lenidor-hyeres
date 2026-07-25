import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sendAdminContactNotification } from "./pingram-notifications.server";
import { logAppEvent, errorDetails } from "./logging.server";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(100, "Le nom est trop long"),
  email: z.string().trim().email("Email invalide").max(255, "Email trop long"),
  phone: z.string().trim().max(50, "Téléphone trop long").nullable().optional(),
  message: z.string().trim().min(1, "Le message est requis").max(1000, "Message trop long"),
});

export type ContactFormData = z.infer<typeof contactSchema>;

export const sendContactMessage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => contactSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      await sendAdminContactNotification({
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        message: data.message,
      });
      return { ok: true as const };
    } catch (error) {
      await logAppEvent({
        level: "error",
        event: "contact_message_send_failed",
        area: "contact",
        message: "Échec de l'envoi du message de contact.",
        details: errorDetails(error, { email: data.email }),
      });
      throw new Error("Impossible d'envoyer le message. Veuillez réessayer.");
    }
  });

export const getContactInfo = createServerFn({ method: "GET" }).handler(async () => {
  const phone = process.env.CONTACT_PHONE_NUMBER?.trim();
  const digitsOnly = phone ? phone.replace(/\D/g, "") : null;
  return {
    phone: phone || null,
    telUrl: digitsOnly ? `tel:+${digitsOnly}` : null,
    whatsappUrl: digitsOnly ? `https://wa.me/${digitsOnly}` : null,
  };
});
