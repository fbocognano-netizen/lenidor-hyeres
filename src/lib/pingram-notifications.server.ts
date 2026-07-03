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
      <p style="margin:0 0 16px;color:#555">Une demande vient d'être enregistrée sur le site Villa d'Or.</p>
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
  }

  const apiKey = process.env.PINGRAM_API_KEY;
  if (!apiKey) {
    await updateNotification(notification?.id, {
      status: "failed",
      error_message: "PINGRAM_API_KEY not configured",
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
        email: {
          subject: "Nouvelle demande de réservation — Villa d'Or",
          html: buildHtml(lead),
          previewText: `Nouvelle demande de ${lead.guest_name} du ${lead.check_in} au ${lead.check_out}`,
        },
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
    return { ok: false as const, notificationId: notification?.id, error: message };
  }
}