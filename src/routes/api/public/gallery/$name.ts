import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/gallery/$name")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const name = params.name;
        if (!name || name.includes("/") || name.startsWith(".")) {
          return new Response("Not found", { status: 404 });
        }
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin.storage.from("gallery").download(name);
          if (error || !data) {
            return new Response("Not found", { status: 404 });
          }
          const buf = await data.arrayBuffer();
          const etag = `"${name}-${buf.byteLength}"`;
          return new Response(buf, {
            headers: {
              "content-type": data.type || "image/jpeg",
              "content-length": String(buf.byteLength),
              "cache-control": "public, max-age=31536000, immutable",
              etag,
            },
          });
        } catch {
          return new Response("Server error", { status: 500 });
        }
      },
    },
  },
});
