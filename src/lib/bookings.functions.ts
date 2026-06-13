import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// --- iCal parser (minimal, handles VEVENT DTSTART/DTEND) ---
function parseICal(ics: string): Array<{ start: Date; end: Date }> {
  const events: Array<{ start: Date; end: Date }> = [];
  // Unfold lines (RFC 5545: lines starting with space/tab continue the previous)
  const unfolded = ics.replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);

  let inEvent = false;
  let dtStart: Date | null = null;
  let dtEnd: Date | null = null;

  const parseDate = (val: string): Date | null => {
    // YYYYMMDD or YYYYMMDDTHHMMSSZ
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
    if (line.startsWith("DTSTART")) {
      const v = line.split(":")[1] ?? "";
      dtStart = parseDate(v);
    } else if (line.startsWith("DTEND")) {
      const v = line.split(":")[1] ?? "";
      dtEnd = parseDate(v);
    }
  }
  return events;
}

function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

async function fetchBlockedRanges(): Promise<Array<{ start: Date; end: Date }>> {
  const url = process.env.AIRBNB_ICAL_URL;
  if (!url) return [];
  try {
    const res = await fetch(url, { headers: { "User-Agent": "BnB-Hyeres-Site/1.0" } });
    if (!res.ok) return [];
    const text = await res.text();
    return parseICal(text);
  } catch (e) {
    console.error("iCal fetch failed", e);
    return [];
  }
}

export const getBlockedDates = createServerFn({ method: "GET" }).handler(async () => {
  const ranges = await fetchBlockedRanges();
  // Also include confirmed/pending local bookings
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("bookings")
    .select("check_in, check_out, status")
    .in("status", ["pending", "confirmed"]);
  const local = (data ?? []).map((b) => ({
    start: new Date(b.check_in + "T00:00:00Z"),
    end: new Date(b.check_out + "T00:00:00Z"),
  }));
  const all = [...ranges, ...local].map((r) => ({
    start: r.start.toISOString(),
    end: r.end.toISOString(),
  }));
  return { ranges: all };
});

const bookingSchema = z.object({
  guest_name: z.string().min(2).max(120),
  email: z.string().email().max(200),
  phone: z.string().max(40).optional().nullable(),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.number().int().min(1).max(2),
  message: z.string().max(2000).optional().nullable(),
});

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => bookingSchema.parse(data))
  .handler(async ({ data }) => {
    const checkIn = new Date(data.check_in + "T00:00:00Z");
    const checkOut = new Date(data.check_out + "T00:00:00Z");
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (checkIn < today) throw new Error("La date d'arrivée doit être dans le futur.");
    if (checkOut <= checkIn) throw new Error("La date de départ doit être après l'arrivée.");

    const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000);
    if (nights < 2) throw new Error("Minimum 2 nuits.");

    // Check overlap against blocked ranges
    const blocked = await fetchBlockedRanges();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("bookings")
      .select("check_in, check_out, status")
      .in("status", ["pending", "confirmed"]);
    const localRanges = (existing ?? []).map((b) => ({
      start: new Date(b.check_in + "T00:00:00Z"),
      end: new Date(b.check_out + "T00:00:00Z"),
    }));

    for (const r of [...blocked, ...localRanges]) {
      if (rangesOverlap(checkIn, checkOut, r.start, r.end)) {
        throw new Error("Ces dates ne sont plus disponibles. Merci d'en choisir d'autres.");
      }
    }

    const PRICE_PER_NIGHT = 95; // EUR (modifiable)
    const total = nights * PRICE_PER_NIGHT;

    const { error } = await supabaseAdmin.from("bookings").insert({
      guest_name: data.guest_name,
      email: data.email,
      phone: data.phone ?? null,
      check_in: data.check_in,
      check_out: data.check_out,
      guests: data.guests,
      message: data.message ?? null,
      total_price: total,
      status: "pending",
    });
    if (error) {
      console.error("insert booking failed", error);
      throw new Error("Impossible d'enregistrer votre demande. Réessayez.");
    }

    return { ok: true, nights, total };
  });
