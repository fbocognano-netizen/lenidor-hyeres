import { createFileRoute } from "@tanstack/react-router";

import { logAppEvent } from "@/lib/logging.server";

// Point d'entrée de la synchronisation quotidienne planifiée Lovable.
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

        await logAppEvent({
          level: "info",
          event: "agenda_sync_hook_triggered",
          area: "agenda",
          message: "Déclenchement du job Lovable agenda-sync-daily.",
          details: { trigger: "lovable-job:agenda-sync-daily", days: 45 },
          request,
        });

        const { runAgendaSync } = await import("@/lib/agenda-sync.server");
        const result = await runAgendaSync({
          days: 45,
          trigger: "lovable-job:agenda-sync-daily",
        });

        return new Response(JSON.stringify(result), {
          status: result.status === "success" ? 200 : 500,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
