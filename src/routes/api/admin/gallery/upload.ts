import { createFileRoute } from "@tanstack/react-router";

import { getAdminSessionState } from "@/lib/admin-session.server";

const MAX_SIZE = 15 * 1024 * 1024; // 15 MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

function slugify(s: string): string {
  return (
    s
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "photo"
  );
}

export const Route = createFileRoute("/api/admin/gallery/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { session } = await getAdminSessionState(request);
        if (!session.data.unlocked) {
          return new Response(JSON.stringify({ ok: false, reason: "unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return new Response(JSON.stringify({ ok: false, reason: "invalid_form" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }

        const files = form.getAll("files").filter((f): f is File => f instanceof File);
        if (files.length === 0) {
          return new Response(JSON.stringify({ ok: false, reason: "no_files" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const bucket = supabaseAdmin.storage.from("gallery");

        const { data: existing } = await bucket.list("", {
          limit: 500,
          sortBy: { column: "name", order: "asc" },
        });
        let maxIdx = 0;
        for (const f of existing ?? []) {
          const m = f.name.match(/^(\d+)/);
          if (m) maxIdx = Math.max(maxIdx, Number(m[1]));
        }

        const uploaded: string[] = [];
        const errors: string[] = [];

        for (const file of files) {
          if (file.size > MAX_SIZE) {
            errors.push(`${file.name}: fichier trop lourd (max 15 Mo)`);
            continue;
          }
          const mime = file.type || "image/jpeg";
          if (!ALLOWED.has(mime)) {
            errors.push(`${file.name}: format non supporté (${mime})`);
            continue;
          }
          maxIdx += 10;
          const rawExt = file.name.match(/\.[^.]+$/)?.[0]?.toLowerCase() ?? ".jpg";
          const ext = rawExt === ".jpeg" ? ".jpg" : rawExt;
          const stem = slugify(file.name.replace(/\.[^.]+$/, ""));
          const name = `${String(maxIdx).padStart(3, "0")}-${stem}${ext}`;
          const buf = new Uint8Array(await file.arrayBuffer());
          const { error } = await bucket.upload(name, buf, {
            contentType: mime,
            upsert: false,
            cacheControl: "3600",
          });
          if (error) {
            errors.push(`${file.name}: ${error.message}`);
            continue;
          }
          uploaded.push(name);
        }

        return new Response(JSON.stringify({ ok: true, uploaded, errors }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
