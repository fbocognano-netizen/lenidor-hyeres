import { errorDetails, logAppEvent } from "./logging.server";

const fallbackAdminEmail = "usertinder543@gmail.com";

export interface BookingNotificationLead {
  booking_id: string;
  guest_name: string;
  email: string;
  phone?: string | null;
  message?: string | null;
  check_in: string;
  check_out: string;
  guests: number;
  total_price?: number | null;
}

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(lead: BookingNotificationLead): string {
  const created = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:16px;color:#222">
      <h2 style="margin:0 0 12px">Nouvelle demande de réservation</h2>
      <p style="margin:0 0 16px;color:#555">Une demande vient d'être enregistrée sur le site Le Nid d'Or.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tbody>
          <tr><td style="padding:6px 0;color:#666">Nom</td><td style="padding:6px 0"><strong>${esc(lead.guest_name)}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#666">Email</td><td style="padding:6px 0"><a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a></td></tr>
          <tr><td style="padding:6px 0;color:#666">Téléphone</td><td style="padding:6px 0">${esc(lead.phone) || "—"}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Arrivée</td><td style="padding:6px 0">${esc(lead.check_in)}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Départ</td><td style="padding:6px 0">${esc(lead.check_out)}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Voyageurs</td><td style="padding:6px 0">${esc(lead.guests)}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Total estimé</td><td style="padding:6px 0">${lead.total_price != null ? esc(lead.total_price) + " €" : "—"}</td></tr>
          <tr><td style="padding:6px 0;color:#666;vertical-align:top">Message</td><td style="padding:6px 0;white-space:pre-wrap">${esc(lead.message) || "—"}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Reçu le</td><td style="padding:6px 0">${esc(created)}</td></tr>
        </tbody>
      </table>
      <p style="margin-top:20px;font-size:12px;color:#888">Espace hôte : connectez-vous sur /admin pour gérer cette demande.</p>
    </div>`;
}

async function updateNotification(
  notificationId: string | undefined,
  patch: {
    status: "sent" | "failed";
    provider_status?: number;
    provider_response?: string;
    error_message?: string;
    sent_at?: string;
  },
) {
  if (!notificationId) return;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("booking_notifications")
    .update(patch)
    .eq("id", notificationId);

  if (error) {
    console.error("booking notification status update failed", { notificationId, error });
    await logAppEvent({
      level: "error",
      event: "booking_notification_status_update_failed",
      area: "notification",
      message: "Mise à jour du statut de notification impossible.",
      details: errorDetails(error, { notificationId }),
    });
  }
}

export async function createAndSendBookingNotification(lead: BookingNotificationLead) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const recipientEmail = (process.env.NOTIFY_ADMIN_EMAIL ?? fallbackAdminEmail).trim() || fallbackAdminEmail;

  const { data: notification, error: notificationError } = await supabaseAdmin
    .from("booking_notifications")
    .insert({
      booking_id: lead.booking_id,
      provider: "pingram",
      recipient_email: recipientEmail,
      status: "pending",
    })
    .select("id")
    .single();

  if (notificationError) {
    console.error("booking notification tracking insert failed", {
      bookingId: lead.booking_id,
      error: notificationError,
    });
    await logAppEvent({
      level: "error",
      event: "booking_notification_tracking_insert_failed",
      area: "notification",
      message: "Création du suivi de notification admin impossible.",
      details: errorDetails(notificationError, { bookingId: lead.booking_id }),
    });
  }

  const apiKey = process.env.PINGRAM_API_KEY;
  if (!apiKey) {
    await updateNotification(notification?.id, {
      status: "failed",
      error_message: "PINGRAM_API_KEY not configured",
    });
    await logAppEvent({
      level: "error",
      event: "pingram_api_key_missing",
      area: "notification",
      message: "PINGRAM_API_KEY n'est pas configuré.",
      details: { bookingId: lead.booking_id, notificationId: notification?.id },
    });
    return { ok: false as const, notificationId: notification?.id, error: "PINGRAM_API_KEY not configured" };
  }

  try {
    const res = await fetch("https://api.pingram.io/email", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "new_lead",
        to: recipientEmail,
        subject: "Nouvelle demande de réservation — Le Nid d'Or",
        html: buildHtml(lead),
      }),

    });

    const responseText = await res.text();
    if (!res.ok) {
      await updateNotification(notification?.id, {
        status: "failed",
        provider_status: res.status,
        provider_response: responseText.slice(0, 2000),
        error_message: "Pingram send failed",
      });
      console.error("Pingram send failed", {
        bookingId: lead.booking_id,
        notificationId: notification?.id,
        status: res.status,
        body: responseText,
      });
      await logAppEvent({
        level: "error",
        event: "pingram_admin_send_failed",
        area: "notification",
        message: "Pingram a refusé l'envoi de la notification admin.",
        details: { bookingId: lead.booking_id, notificationId: notification?.id, status: res.status, body: responseText },
      });
      return { ok: false as const, notificationId: notification?.id, status: res.status, error: responseText };
    }

    await updateNotification(notification?.id, {
      status: "sent",
      provider_status: res.status,
      provider_response: responseText.slice(0, 2000),
      sent_at: new Date().toISOString(),
    });
    return { ok: true as const, notificationId: notification?.id, status: res.status };
  } catch (error) {
    const message = String(error);
    await updateNotification(notification?.id, {
      status: "failed",
      error_message: message,
    });
    console.error("Pingram send threw", { bookingId: lead.booking_id, notificationId: notification?.id, error: message });
    await logAppEvent({
      level: "error",
      event: "pingram_admin_send_threw",
      area: "notification",
      message: "Exception pendant l'envoi Pingram admin.",
      details: errorDetails(error, { bookingId: lead.booking_id, notificationId: notification?.id }),
    });
    return { ok: false as const, notificationId: notification?.id, error: message };
  }
}

function buildGuestHtml(lead: BookingNotificationLead): string {
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:16px;color:#222">
      <h2 style="margin:0 0 12px">Merci pour votre demande de réservation ✨</h2>
      <p style="margin:0 0 16px;color:#555">Bonjour ${esc(lead.guest_name)}, nous avons bien reçu votre demande pour <strong>Le Nid d'Or</strong> à Hyères. Joëlle, votre hôte, vous répondra en personne sous 2 heures pour confirmer les disponibilités.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;background:#faf7f2;border-radius:8px;padding:8px">
        <tbody>
          <tr><td style="padding:6px 12px;color:#666">Arrivée</td><td style="padding:6px 12px"><strong>${esc(lead.check_in)}</strong></td></tr>
          <tr><td style="padding:6px 12px;color:#666">Départ</td><td style="padding:6px 12px"><strong>${esc(lead.check_out)}</strong></td></tr>
          <tr><td style="padding:6px 12px;color:#666">Voyageurs</td><td style="padding:6px 12px">${esc(lead.guests)}</td></tr>
          <tr><td style="padding:6px 12px;color:#666">Total estimé</td><td style="padding:6px 12px">${lead.total_price != null ? esc(lead.total_price) + " €" : "—"}</td></tr>
        </tbody>
      </table>
      <p style="margin:20px 0 8px;color:#555">Cette demande n'est pas encore confirmée : les dates seront validées manuellement par votre hôte. Vous recevrez un email de confirmation dès que ce sera fait, avec les instructions d'arrivée.</p>
      <p style="margin:16px 0 0;color:#555">À très bientôt sur les hauteurs d'Hyères,<br/>Joëlle — Le Nid d'Or</p>
      <p style="margin-top:24px;font-size:12px;color:#888">Si vous avez une question, répondez directement à cet email.</p>
    </div>`;
}

export async function sendGuestConfirmationEmail(lead: BookingNotificationLead) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const recipientEmail = lead.email.trim();

  const { data: notification, error: notificationError } = await supabaseAdmin
    .from("booking_notifications")
    .insert({
      booking_id: lead.booking_id,
      provider: "pingram",
      recipient_email: recipientEmail,
      status: "pending",
    })
    .select("id")
    .single();

  if (notificationError) {
    console.error("guest notification tracking insert failed", {
      bookingId: lead.booking_id,
      error: notificationError,
    });
    await logAppEvent({
      level: "error",
      event: "guest_notification_tracking_insert_failed",
      area: "notification",
      message: "Création du suivi de notification client impossible.",
      details: errorDetails(notificationError, { bookingId: lead.booking_id }),
    });
  }

  const apiKey = process.env.PINGRAM_API_KEY;
  if (!apiKey) {
    await updateNotification(notification?.id, {
      status: "failed",
      error_message: "PINGRAM_API_KEY not configured",
    });
    await logAppEvent({
      level: "error",
      event: "pingram_guest_api_key_missing",
      area: "notification",
      message: "PINGRAM_API_KEY n'est pas configuré pour la confirmation client.",
      details: { bookingId: lead.booking_id, notificationId: notification?.id },
    });
    return { ok: false as const, notificationId: notification?.id, error: "PINGRAM_API_KEY not configured" };
  }

  try {
    const res = await fetch("https://api.pingram.io/email", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "booking_confirmation",
        to: recipientEmail,
        subject: "Votre demande de réservation — Le Nid d'Or à Hyères",
        html: buildGuestHtml(lead),
      }),
    });

    const responseText = await res.text();
    if (!res.ok) {
      await updateNotification(notification?.id, {
        status: "failed",
        provider_status: res.status,
        provider_response: responseText.slice(0, 2000),
        error_message: "Pingram guest send failed",
      });
      console.error("Pingram guest send failed", {
        bookingId: lead.booking_id,
        notificationId: notification?.id,
        status: res.status,
        body: responseText,
      });
      await logAppEvent({
        level: "error",
        event: "pingram_guest_send_failed",
        area: "notification",
        message: "Pingram a refusé l'envoi de la confirmation client.",
        details: { bookingId: lead.booking_id, notificationId: notification?.id, status: res.status, body: responseText },
      });
      return { ok: false as const, notificationId: notification?.id, status: res.status, error: responseText };
    }

    await updateNotification(notification?.id, {
      status: "sent",
      provider_status: res.status,
      provider_response: responseText.slice(0, 2000),
      sent_at: new Date().toISOString(),
    });
    return { ok: true as const, notificationId: notification?.id, status: res.status };
  } catch (error) {
    const message = String(error);
    await updateNotification(notification?.id, {
      status: "failed",
      error_message: message,
    });
    console.error("Pingram guest send threw", { bookingId: lead.booking_id, notificationId: notification?.id, error: message });
    await logAppEvent({
      level: "error",
      event: "pingram_guest_send_threw",
      area: "notification",
      message: "Exception pendant l'envoi Pingram client.",
      details: errorDetails(error, { bookingId: lead.booking_id, notificationId: notification?.id }),
    });
    return { ok: false as const, notificationId: notification?.id, error: message };
  }
}
