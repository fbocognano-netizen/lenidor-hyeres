import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { createAndSendBookingNotification } from "./pingram-notifications.server";

type AdminSession = { unlocked?: boolean };

const statusSchema = z.enum(["pending", "confirmed", "cancelled"]);

const fallbackAdminEmail = "usertinder543@gmail.com";
const adminLogPrefix = "[admin-auth]";

// --- Minimal iCal parser (duplicated from bookings.functions to keep admin self-contained) ---
function parseICal(ics: string): Array<{ start: Date; end: Date }> {
  const events: Array<{ start: Date; end: Date }> = [];
  const unfolded = ics.replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);
  let inEvent = false;
  let dtStart: Date | null = null;
  let dtEnd: Date | null = null;
  const parseDate = (val: string): Date | null => {
    const m = val.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z?)?$/);
    if (!m) return null;
    const [, y, mo, d, h = "0", mi = "0", s = "0"] = m;
    return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (line === "BEGIN:VEVENT") { inEvent = true; dtStart = null; dtEnd = null; continue; }
    if (line === "END:VEVENT") {
      if (inEvent && dtStart && dtEnd) events.push({ start: dtStart, end: dtEnd });
      inEvent = false; continue;
    }
    if (!inEvent) continue;
    if (line.startsWith("DTSTART")) dtStart = parseDate(line.split(":")[1] ?? "");
    else if (line.startsWith("DTEND")) dtEnd = parseDate(line.split(":")[1] ?? "");
  }
  return events;
}

async function fetchICalRanges(url: string): Promise<Array<{ start: Date; end: Date }>> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "BnB-Hyeres-Site/1.0" } });
    if (!res.ok) return [];
    return parseICal(await res.text());
  } catch (e) {
    console.error("iCal fetch failed", url, e);
    return [];
  }
}

async function getAdminSession() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("La session admin n'est pas configurée.");

  const { useSession } = await import("@tanstack/react-start/server");
  return useSession<AdminSession>({
    password: secret,
    name: "villa-admin-session",
    maxAge: 60 * 60 * 24 * 14,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  });
}

async function passwordMatches(input: string, expected: string): Promise<boolean> {
  const { createHash, timingSafeEqual } = await import("node:crypto");
  const normalizeSecret = (value: string) =>
    value
      .normalize("NFKC")
      .trim()
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\u00A0/g, " ")
      .replace(/^["']|["']$/g, "");
  const normalizedInput = normalizeSecret(input);
  const normalizedExpected = normalizeSecret(expected);
  const inputHash = createHash("sha256").update(normalizedInput, "utf8").digest();
  const expectedHash = createHash("sha256").update(normalizedExpected, "utf8").digest();
  return timingSafeEqual(inputHash, expectedHash);
}

async function isAdminUnlocked() {
  try {
    const session = await getAdminSession();
    const authenticated = Boolean(session.data.unlocked);
    console.info(adminLogPrefix, "authenticated", { authenticated });
    return authenticated;
  } catch (error) {
    console.error(adminLogPrefix, "session_read_failed", { error: String(error) });
    return false;
  }
}

export const getAdminConfigStatus = createServerFn({ method: "GET" }).handler(async () => {
  console.info(adminLogPrefix, "config_status", {
    accessCodeConfigured: Boolean(process.env.ADMIN_ACCESS_CODE),
    sessionSecretConfigured: Boolean(process.env.ADMIN_SESSION_SECRET),
  });

  return {
    configured: Boolean(process.env.ADMIN_ACCESS_CODE),
    sessionConfigured: Boolean(process.env.ADMIN_SESSION_SECRET),
    notifyAdminEmail: process.env.NOTIFY_ADMIN_EMAIL ?? fallbackAdminEmail,
    notifyAdminEmailConfigured: Boolean(process.env.NOTIFY_ADMIN_EMAIL),
  };
});

export const signInAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ code: z.string().min(1).max(200) }).parse(data),
  )
  .handler(async ({ data }) => {
    const expected = process.env.ADMIN_ACCESS_CODE;
    if (!expected) {
      console.info(adminLogPrefix, "login_missing_access_code");
      return { ok: false as const, reason: "not_configured" as const };
    }

    if (!process.env.ADMIN_SESSION_SECRET) {
      console.error(adminLogPrefix, "login_missing_session_secret");
      return { ok: false as const, reason: "session_not_configured" as const };
    }

    const ok = await passwordMatches(data.code, expected);
    if (!ok) {
      console.info(adminLogPrefix, "login_invalid_code");
      return { ok: false as const, reason: "invalid" as const };
    }

    try {
      const session = await getAdminSession();
      await session.update({ unlocked: true });
      console.info(adminLogPrefix, "login_ok_session_updated");
      return { ok: true as const };
    } catch (error) {
      console.error(adminLogPrefix, "login_session_update_failed", { error: String(error) });
      return { ok: false as const, reason: "session_error" as const };
    }
  });

export const signOutAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const session = await getAdminSession();
  await session.clear();
  return { ok: true as const };
});

export const getAdminBookings = createServerFn({ method: "GET" }).handler(async () => {
  if (!(await isAdminUnlocked())) {
    return {
      authenticated: false as const,
      bookings: [],
      counts: { pending: 0, confirmed: 0, cancelled: 0, total: 0 },
    };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("bookings")
    .select("id, guest_name, email, phone, check_in, check_out, guests, message, total_price, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("admin bookings fetch failed", error);
    throw new Error("Impossible de charger les demandes de réservation.");
  }

  const bookings = (data ?? []).map((booking) => ({
    id: booking.id,
    guest_name: booking.guest_name,
    email: booking.email,
    phone: booking.phone,
    check_in: booking.check_in,
    check_out: booking.check_out,
    guests: booking.guests,
    message: booking.message,
    total_price: booking.total_price === null ? null : Number(booking.total_price),
    status: booking.status,
    created_at: booking.created_at,
    notification: null as null | {
      status: string;
      recipient_email: string;
      provider_status: number | null;
      error_message: string | null;
      sent_at: string | null;
      created_at: string;
    },
  }));

  if (bookings.length > 0) {
    const bookingIds = bookings.map((booking) => booking.id);
    const { data: notifications, error: notificationsError } = await supabaseAdmin
      .from("booking_notifications")
      .select("booking_id, status, recipient_email, provider_status, error_message, sent_at, created_at")
      .in("booking_id", bookingIds)
      .order("created_at", { ascending: false });

    if (notificationsError) {
      console.error("admin booking notifications fetch failed", notificationsError);
    } else {
      const latestByBooking = new Map<string, NonNullable<(typeof bookings)[number]["notification"]>>();
      for (const notification of notifications ?? []) {
        if (notification.booking_id && !latestByBooking.has(notification.booking_id)) {
          latestByBooking.set(notification.booking_id, {
            status: notification.status,
            recipient_email: notification.recipient_email,
            provider_status: notification.provider_status,
            error_message: notification.error_message,
            sent_at: notification.sent_at,
            created_at: notification.created_at,
          });
        }
      }

      for (const booking of bookings) {
        booking.notification = latestByBooking.get(booking.id) ?? null;
      }
    }
  }

  return {
    authenticated: true as const,
    bookings,
    counts: {
      pending: bookings.filter((booking) => booking.status === "pending").length,
      confirmed: bookings.filter((booking) => booking.status === "confirmed").length,
      cancelled: bookings.filter((booking) => booking.status === "cancelled").length,
      total: bookings.length,
    },
  };
});

export const updateBookingStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), status: statusSchema }).parse(data),
  )
  .handler(async ({ data }) => {
    if (!(await isAdminUnlocked())) return { authenticated: false as const, ok: false as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("bookings")
      .update({ status: data.status })
      .eq("id", data.id);

    if (error) {
      console.error("admin booking status update failed", error);
      throw new Error("Impossible de modifier le statut de la réservation.");
    }

    return { authenticated: true as const, ok: true as const };
  });

export const resendBookingNotification = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    if (!(await isAdminUnlocked())) return { authenticated: false as const, ok: false as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select("id, guest_name, email, phone, check_in, check_out, guests, message, total_price")
      .eq("id", data.id)
      .single();

    if (bookingError || !booking) {
      console.error("admin booking notification resend fetch failed", { bookingId: data.id, error: bookingError });
      throw new Error("Impossible de retrouver cette demande.");
    }

    const result = await createAndSendBookingNotification({
      booking_id: booking.id,
      guest_name: booking.guest_name,
      email: booking.email,
      phone: booking.phone,
      message: booking.message,
      check_in: booking.check_in,
      check_out: booking.check_out,
      guests: booking.guests,
      total_price: booking.total_price === null ? null : Number(booking.total_price),
    });

    if (!result.ok) {
      console.error("admin booking notification resend failed", { bookingId: booking.id, result });
      throw new Error("La notification n'a pas pu être renvoyée.");
    }

    return { authenticated: true as const, ok: true as const };
  });

export const getAdminOtaRanges = createServerFn({ method: "GET" }).handler(async () => {
  if (!(await isAdminUnlocked())) {
    return { authenticated: false as const, ranges: [] as Array<{ source: string; start: string; end: string }> };
  }
  const { getActiveIcalSources } = await import("./ical-sources.server");
  const sources = await getActiveIcalSources();
  const results = await Promise.all(
    sources.map(async ({ label, url }) => {
      const ranges = await fetchICalRanges(url);
      return ranges.map((r) => ({ source: label, start: r.start.toISOString(), end: r.end.toISOString() }));
    }),
  );
  return { authenticated: true as const, ranges: results.flat() };
});

// --- iCal sources CRUD (admin only) ---

export const listIcalSources = createServerFn({ method: "GET" }).handler(async () => {
  if (!(await isAdminUnlocked())) return { authenticated: false as const, sources: [] as Array<{ id: string; label: string; url: string; enabled: boolean }> };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("ical_sources")
    .select("id, label, url, enabled")
    .order("label", { ascending: true });
  if (error) {
    console.error("list ical_sources failed", error);
    throw new Error("Impossible de charger les calendriers.");
  }
  return { authenticated: true as const, sources: data ?? [] };
});

const urlSchema = z.string().url().max(2000);

export const createIcalSource = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ label: z.string().min(1).max(80), url: urlSchema }).parse(data),
  )
  .handler(async ({ data }) => {
    if (!(await isAdminUnlocked())) return { authenticated: false as const, ok: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("ical_sources").insert({ label: data.label, url: data.url });
    if (error) {
      console.error("create ical_source failed", error);
      throw new Error("Impossible d'ajouter ce calendrier.");
    }
    return { authenticated: true as const, ok: true as const };
  });

export const updateIcalSource = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({
      id: z.string().uuid(),
      label: z.string().min(1).max(80).optional(),
      url: urlSchema.optional(),
      enabled: z.boolean().optional(),
    }).parse(data),
  )
  .handler(async ({ data }) => {
    if (!(await isAdminUnlocked())) return { authenticated: false as const, ok: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = {};
    if (data.label !== undefined) patch.label = data.label;
    if (data.url !== undefined) patch.url = data.url;
    if (data.enabled !== undefined) patch.enabled = data.enabled;
    const { error } = await supabaseAdmin.from("ical_sources").update(patch).eq("id", data.id);
    if (error) {
      console.error("update ical_source failed", error);
      throw new Error("Impossible de modifier ce calendrier.");
    }
    return { authenticated: true as const, ok: true as const };
  });

export const deleteIcalSource = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    if (!(await isAdminUnlocked())) return { authenticated: false as const, ok: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("ical_sources").delete().eq("id", data.id);
    if (error) {
      console.error("delete ical_source failed", error);
      throw new Error("Impossible de supprimer ce calendrier.");
    }
    return { authenticated: true as const, ok: true as const };
  });
