import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { errorDetails, logAppEvent } from "./logging.server";
import { createAndSendBookingNotification, sendGuestConfirmationEmail } from "./pingram-notifications.server";

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

// Tarifs saisonniers + frais
const CLEANING_FEE = 40;
const DEPOSIT_CASH = 500; // caution espèces à l'arrivée (non incluse dans le total)
// Taxe de séjour TPM (meublé non classé) :
//   prix par personne et par nuit = total hébergement (hors ménage) / nuits / occupants
//   taxe par personne et par nuit = MIN(prix pp/nuit x 5 %, 3,09 €) x 1,44
//   taxe totale = taxe pp/nuit x nuits x personnes taxables
const TOURIST_TAX_RATE = 0.05;
const TOURIST_TAX_CAP = 3.09; // plafond 2026 avant taxes additionnelles
const TOURIST_TAX_SURCHARGE = 1.44; // 1 + 10 % département + 34 % région
function computeTouristTax(nightsTotal: number, nights: number, occupants: number): number {
  if (nights <= 0 || occupants <= 0) return 0;
  const perPersonNight = nightsTotal / nights / occupants;
  const taxPerPersonNight = Math.min(perPersonNight * TOURIST_TAX_RATE, TOURIST_TAX_CAP) * TOURIST_TAX_SURCHARGE;
  return Math.round(taxPerPersonNight * nights * occupants * 100) / 100;
}
function nightlyRateForDate(d: Date): number {
  const m = d.getUTCMonth() + 1;
  if (m === 7 || m === 8) return 130; // haute saison
  if (m === 4 || m === 5 || m === 6 || m === 9) return 95; // moyenne
  return 75; // basse
}
function computeNightsTotal(checkIn: Date, checkOut: Date): { nights: number; nightsTotal: number } {
  let nights = 0;
  let nightsTotal = 0;
  for (let d = new Date(checkIn); d < checkOut; d = new Date(d.getTime() + 86400000)) {
    nights++;
    nightsTotal += nightlyRateForDate(d);
  }
  return { nights, nightsTotal };
}

async function fetchBlockedRanges(): Promise<Array<{ start: Date; end: Date }>> {
  const { getActiveIcalSources } = await import("./ical-sources.server");
  const sources = await getActiveIcalSources();
  const all: Array<{ start: Date; end: Date }> = [];
  await Promise.all(sources.map(async ({ url }) => {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "BnB-Hyeres-Site/1.0" } });
      if (!res.ok) return;
      const text = await res.text();
      all.push(...parseICal(text));
    } catch (e) {
      console.error("iCal fetch failed", url, e);
      await logAppEvent({
        level: "warning",
        event: "ical_fetch_failed",
        area: "booking",
        message: "Impossible de récupérer un calendrier iCal public.",
        details: errorDetails(e, { url }),
      });
    }
  }));
  return all;
}


export const quoteStay = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({
    check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }).parse(data))
  .handler(async ({ data }) => {
    const ci = new Date(data.check_in + "T00:00:00Z");
    const co = new Date(data.check_out + "T00:00:00Z");
    const { nights, nightsTotal } = computeNightsTotal(ci, co);
    return {
      nights,
      nightsTotal,
      cleaningFee: CLEANING_FEE,
      total: nightsTotal + (nights > 0 ? CLEANING_FEE : 0),
      depositCash: DEPOSIT_CASH,
    };
  });

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

    const { nightsTotal } = computeNightsTotal(checkIn, checkOut);
    const touristTax = computeTouristTax(nightsTotal, nights, data.guests);
    const total = Math.round((nightsTotal + CLEANING_FEE + touristTax) * 100) / 100;


    const { data: insertedBooking, error } = await supabaseAdmin.from("bookings").insert({
      guest_name: data.guest_name,
      email: data.email,
      phone: data.phone ?? null,
      check_in: data.check_in,
      check_out: data.check_out,
      guests: data.guests,
      message: data.message ?? null,
      total_price: total,
      status: "pending",
    }).select("id").single();
    if (error) {
      console.error("insert booking failed", error);
      await logAppEvent({
        level: "error",
        event: "booking_insert_failed",
        area: "booking",
        message: "Enregistrement d'une demande de réservation impossible.",
        details: errorDetails(error, {
          check_in: data.check_in,
          check_out: data.check_out,
          guests: data.guests,
        }),
      });
      throw new Error("Impossible d'enregistrer votre demande. Réessayez.");
    }

    // Fire-and-forget admin notification (Pingram). Never break the booking flow.
    try {
      await createAndSendBookingNotification({
        booking_id: insertedBooking.id,
        guest_name: data.guest_name,
        email: data.email,
        phone: data.phone ?? null,
        message: data.message ?? null,
        check_in: data.check_in,
        check_out: data.check_out,
        guests: data.guests,
        total_price: total,
      });
    } catch (e) {
      console.error("booking notification send threw", { bookingId: insertedBooking.id, error: e });
      await logAppEvent({
        level: "error",
        event: "booking_admin_notification_threw",
        area: "booking",
        message: "Exception pendant l'envoi de notification admin.",
        details: errorDetails(e, { bookingId: insertedBooking.id }),
      });
    }

    // Fire-and-forget guest confirmation.
    try {
      await sendGuestConfirmationEmail({
        booking_id: insertedBooking.id,
        guest_name: data.guest_name,
        email: data.email,
        phone: data.phone ?? null,
        message: data.message ?? null,
        check_in: data.check_in,
        check_out: data.check_out,
        guests: data.guests,
        total_price: total,
      });
    } catch (e) {
      console.error("guest confirmation send threw", { bookingId: insertedBooking.id, error: e });
      await logAppEvent({
        level: "error",
        event: "booking_guest_confirmation_threw",
        area: "booking",
        message: "Exception pendant l'envoi de confirmation client.",
        details: errorDetails(e, { bookingId: insertedBooking.id }),
      });
    }

    return { ok: true, nights, total };
  });
