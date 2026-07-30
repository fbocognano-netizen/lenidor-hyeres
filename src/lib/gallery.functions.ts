import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getAdminSessionState } from "./admin-session.server";

const BUCKET = "gallery";

export type GalleryPhoto = { name: string; url: string; alt: string };

function slugToAlt(name: string): string {
  const stem = name.replace(/\.[^.]+$/, "").replace(/^\d+[-_]/, "");
  const s = stem.replace(/[-_]+/g, " ").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "Le Nid d'Or à Hyères";
}

async function assertAdmin() {
  const { session } = await getAdminSessionState();
  if (!session.data.unlocked) {
    throw new Error("Non autorisé");
  }
}

export const listGalleryPhotos = createServerFn({ method: "GET" }).handler(async () => {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { photos: [] as GalleryPhoto[] };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).list("", {
    limit: 500,
    sortBy: { column: "name", order: "asc" },
  });
  if (error || !data) {
    return { photos: [] as GalleryPhoto[] };
  }
  const photos: GalleryPhoto[] = data
    .filter((f) => f.name && !f.name.startsWith(".") && !f.name.startsWith("__tmp_") && f.id !== null)
    .map((f) => ({
      name: f.name,
      url: `/api/public/gallery/${encodeURIComponent(f.name)}`,
      alt: slugToAlt(f.name),
    }));
  return { photos };
});

export const deleteGalleryPhoto = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string }) => z.object({ name: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage.from(BUCKET).remove([data.name]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderGalleryPhotos = createServerFn({ method: "POST" })
  .inputValidator((d: { names: string[] }) =>
    z.object({ names: z.array(z.string().min(1)).min(1) }).parse(d),
  )
  .handler(async ({ data }) => {
    await assertAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bucket = supabaseAdmin.storage.from(BUCKET);
    const stamp = Date.now();

    type Pending = { tmp: string; stem: string; ext: string };
    const pending: Pending[] = [];

    // Phase 1: move all to temp names to avoid collisions
    for (let i = 0; i < data.names.length; i++) {
      const from = data.names[i];
      const ext = (from.match(/\.[^.]+$/)?.[0] ?? ".jpg").toLowerCase();
      const stem = from.replace(/\.[^.]+$/, "").replace(/^\d+[-_]/, "");
      const tmp = `__tmp_${stamp}_${i}${ext}`;
      const { error } = await bucket.move(from, tmp);
      if (error) throw new Error(`Renommage impossible pour ${from}: ${error.message}`);
      pending.push({ tmp, stem, ext });
    }

    // Phase 2: rename to final ordered names
    for (let i = 0; i < pending.length; i++) {
      const { tmp, stem, ext } = pending[i];
      const finalName = `${String((i + 1) * 10).padStart(3, "0")}-${stem}${ext}`;
      const { error } = await bucket.move(tmp, finalName);
      if (error) throw new Error(`Renommage final impossible pour ${tmp}: ${error.message}`);
    }
    return { ok: true };
  });
