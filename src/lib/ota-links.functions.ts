import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getAdminSessionState } from "./admin-session.server";
import { errorDetails, logAppEvent } from "./logging.server";

export type OtaLink = {
  id: string;
  url: string;
  label: string;
  position: number;
  enabled: boolean;
};

// --- Label derivation from URL host ---
const LABEL_OVERRIDES: Record<string, string> = {
  airbnb: "Airbnb",
  leboncoin: "Leboncoin",
  booking: "Booking",
  abritel: "Abritel",
  vrbo: "Vrbo",
  homeaway: "HomeAway",
  gensdeconfiance: "Gens de Confiance",
  expedia: "Expedia",
  tripadvisor: "Tripadvisor",
  hometogo: "HomeToGo",
  morningcroissant: "MorningCroissant",
  papvacances: "PAP Vacances",
  pap: "PAP",
};

export function deriveLabelFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, "");
    const first = host.split(".")[0] ?? host;
    const key = first.toLowerCase();
    if (LABEL_OVERRIDES[key]) return LABEL_OVERRIDES[key];
    return first.charAt(0).toUpperCase() + first.slice(1);
  } catch {
    return "Réserver";
  }
}

function toOtaLink(row: {
  id: string;
  url: string;
  label: string | null;
  position: number;
  enabled: boolean;
}): OtaLink {
  return {
    id: row.id,
    url: row.url,
    label: (row.label && row.label.trim()) || deriveLabelFromUrl(row.url),
    position: row.position,
    enabled: row.enabled,
  };
}

async function isAdminUnlocked() {
  try {
    const { session } = await getAdminSessionState();
    return Boolean(session.data.unlocked);
  } catch {
    return false;
  }
}

// --- Public: list enabled links (for the homepage) ---
export const listPublicOtaLinks = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("ota_links")
    .select("id, url, label, position, enabled")
    .eq("enabled", true)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("list public ota links failed", error);
    await logAppEvent({
      level: "warning",
      event: "list_ota_links_failed",
      area: "public",
      message: "Chargement des liens plateformes impossible.",
      details: errorDetails(error),
    });
    return { links: [] as OtaLink[] };
  }

  return { links: (data ?? []).map(toOtaLink) };
});

// --- Admin: list all links (including disabled) ---
export const listOtaLinksAdmin = createServerFn({ method: "GET" }).handler(async () => {
  if (!(await isAdminUnlocked())) {
    return { authenticated: false as const, links: [] as OtaLink[] };
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("ota_links")
    .select("id, url, label, position, enabled")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("list admin ota links failed", error);
    throw new Error("Impossible de charger les plateformes.");
  }
  return { authenticated: true as const, links: (data ?? []).map(toOtaLink) };
});

const urlSchema = z.string().url().max(2000);

export const createOtaLink = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        url: urlSchema,
        label: z.string().trim().max(60).optional().nullable(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    if (!(await isAdminUnlocked())) return { authenticated: false as const, ok: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Append at end.
    const { data: last } = await supabaseAdmin
      .from("ota_links")
      .select("position")
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextPosition = (last?.position ?? 0) + 10;

    const { error } = await supabaseAdmin.from("ota_links").insert({
      url: data.url,
      label: data.label?.trim() ? data.label.trim() : null,
      position: nextPosition,
    });
    if (error) {
      console.error("create ota link failed", error);
      throw new Error("Ajout impossible.");
    }
    return { authenticated: true as const, ok: true as const };
  });

export const updateOtaLink = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        url: urlSchema.optional(),
        label: z.string().trim().max(60).optional().nullable(),
        enabled: z.boolean().optional(),
        position: z.number().int().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    if (!(await isAdminUnlocked())) return { authenticated: false as const, ok: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: { url?: string; label?: string | null; enabled?: boolean; position?: number } = {};
    if (data.url !== undefined) patch.url = data.url;
    if (data.label !== undefined) patch.label = data.label && data.label.trim() ? data.label.trim() : null;
    if (data.enabled !== undefined) patch.enabled = data.enabled;
    if (data.position !== undefined) patch.position = data.position;

    const { error } = await supabaseAdmin.from("ota_links").update(patch).eq("id", data.id);
    if (error) {
      console.error("update ota link failed", error);
      throw new Error("Modification impossible.");
    }
    return { authenticated: true as const, ok: true as const };
  });

export const deleteOtaLink = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    if (!(await isAdminUnlocked())) return { authenticated: false as const, ok: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("ota_links").delete().eq("id", data.id);
    if (error) {
      console.error("delete ota link failed", error);
      throw new Error("Suppression impossible.");
    }
    return { authenticated: true as const, ok: true as const };
  });
