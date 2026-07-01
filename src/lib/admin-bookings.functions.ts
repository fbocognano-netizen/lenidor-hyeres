import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

type AdminSession = { unlocked?: boolean };

const statusSchema = z.enum(["pending", "confirmed", "cancelled"]);

async function getAdminSession() {
  const secret = process.env.ADMIN_ACCESS_TOKEN;
  if (!secret) throw new Error("La protection admin n'est pas configurée.");

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
  const inputHash = createHash("sha256").update(input, "utf8").digest();
  const expectedHash = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(inputHash, expectedHash);
}

async function isAdminUnlocked() {
  const session = await getAdminSession();
  return Boolean(session.data.unlocked);
}

export const signInAdmin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ code: z.string().min(1).max(200) }).parse(data),
  )
  .handler(async ({ data }) => {
    const expected = process.env.ADMIN_ACCESS_CODE;
    if (!expected) throw new Error("Le code d'accès admin n'est pas configuré.");

    const ok = await passwordMatches(data.code, expected);
    if (!ok) return { ok: false as const };

    const session = await getAdminSession();
    await session.update({ unlocked: true });
    return { ok: true as const };
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
  }));

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