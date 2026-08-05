import { createFileRoute } from "@tanstack/react-router";

// Point d'entrée de la synchronisation quotidienne planifiée (pg_cron / Lovable Cloud).
// Sécurisé par la clé publique du backend transmise dans l'en-tête `apikey`.
export const Route = createFileRoute("/api/public/hooks/agenda-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected =
          process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
        const provided =
          request.headers.get("apikey") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";

        if (!expected || provided !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        const { runAgendaSync } = await import("@/lib/agenda-sync.server");
        const result = await runAgendaSync({ days: 45 });

        return new Response(JSON.stringify(result), {
          status: result.status === "success" ? 200 : 500,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
