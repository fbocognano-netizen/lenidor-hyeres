// Edge Function: notify-lead
// Sends an admin notification email via Pingram when a new booking is created.
// Uses direct HTML content (no templateId).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface LeadPayload {
  booking_id?: string;
  notification_id?: string;
  guest_name?: string;
  email?: string;
  phone?: string | null;
  message?: string | null;
  check_in?: string;
  check_out?: string;
  guests?: number;
  total_price?: number | null;
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("notification tracking skipped: backend env missing", { notificationId });
    return;
  }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/booking_notifications?id=eq.${encodeURIComponent(notificationId)}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${serviceRoleKey}`,
        "apikey": serviceRoleKey,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify(patch),
    });

    if (!res.ok) {
      console.error("notification tracking update failed", {
        notificationId,
        status: res.status,
        body: await res.text(),
      });
    }
  } catch (error) {
    console.error("notification tracking update threw", { notificationId, error: String(error) });
  }
}

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(lead: LeadPayload): string {
  const created = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:16px;color:#222">
      <h2 style="margin:0 0 12px">Nouveau lead depuis le site</h2>
      <p style="margin:0 0 16px;color:#555">Une demande de réservation vient d'être enregistrée.</p>
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let lead: LeadPayload | undefined;
  try {
    const apiKey = Deno.env.get("PINGRAM_API_KEY");
    const toEmail = Deno.env.get("NOTIFY_ADMIN_EMAIL");

    if (!apiKey) {
      console.error("PINGRAM_API_KEY missing");
      return new Response(JSON.stringify({ error: "PINGRAM_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });
    }
    if (!toEmail) {
      console.error("NOTIFY_ADMIN_EMAIL missing");
      return new Response(JSON.stringify({ error: "NOTIFY_ADMIN_EMAIL not configured" }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });
    }

    lead = (await req.json()) as LeadPayload;
    console.log("notify-lead received", {
      bookingId: lead.booking_id ?? null,
      notificationId: lead.notification_id ?? null,
      to: toEmail,
    });

    const payload = {
      type: "new_lead",
      to: toEmail,
      subject: "Nouveau lead depuis le site",
      html: buildHtml(lead),
    };

    const res = await fetch("https://api.pingram.io/email", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await res.text();
    if (!res.ok) {
      console.error("Pingram send failed", {
        bookingId: lead.booking_id ?? null,
        notificationId: lead.notification_id ?? null,
        status: res.status,
        body: responseText,
      });
      await updateNotification(lead.notification_id, {
        status: "failed",
        provider_status: res.status,
        provider_response: responseText.slice(0, 2000),
        error_message: "Pingram send failed",
      });
      return new Response(JSON.stringify({ error: "Pingram send failed", status: res.status, body: responseText }), { status: 502, headers: { ...corsHeaders, "content-type": "application/json" } });
    }

    await updateNotification(lead.notification_id, {
      status: "sent",
      provider_status: res.status,
      provider_response: responseText.slice(0, 2000),
      sent_at: new Date().toISOString(),
    });
    console.log("Pingram send ok", {
      bookingId: lead.booking_id ?? null,
      notificationId: lead.notification_id ?? null,
      status: res.status,
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "content-type": "application/json" } });
  } catch (e) {
    await updateNotification(lead?.notification_id, {
      status: "failed",
      error_message: String(e),
    });
    console.error("notify-lead error", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });
  }
});
