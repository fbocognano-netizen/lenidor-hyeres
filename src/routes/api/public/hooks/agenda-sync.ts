import { createFileRoute } from "@tanstack/react-router";

import { errorDetails, logAppEvent } from "@/lib/logging.server";

const LOVABLE_AGENDA_TRIGGER = "lovable-job:agenda-sync-daily";
const AGENDA_SYNC_DAYS = 45;
const LOVABLE_JOB_MIN_INTERVAL_MS = 47 * 60 * 60 * 1000;

export function shouldSkipLovableAgendaSync(
  lastCompletedAt: string | null | undefined,
  now = new Date(),
) {
  if (!lastCompletedAt) return false;
  const lastCompletedTime = new Date(lastCompletedAt).getTime();
  if (!Number.isFinite(lastCompletedTime)) return false;
  return now.getTime() - lastCompletedTime < LOVABLE_JOB_MIN_INTERVAL_MS;
}

async function getRecentCompletedAgendaSync(now = new Date()) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const minCompletedAt = new Date(now.getTime() - LOVABLE_JOB_MIN_INTERVAL_MS).toISOString();

  const { data, error } = await supabaseAdmin
    .from("agenda_sync_runs")
    .select("id, completed_at")
    .eq("status", "completed")
    .gte("completed_at", minCompletedAt)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

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
          details: { trigger: LOVABLE_AGENDA_TRIGGER, days: AGENDA_SYNC_DAYS },
          request,
        });

        try {
          const recentRun = await getRecentCompletedAgendaSync();
          if (shouldSkipLovableAgendaSync(recentRun?.completed_at)) {
            const result = {
              status: "skipped",
              trigger: LOVABLE_AGENDA_TRIGGER,
              reason: "recent_completed_sync",
              lastRunId: recentRun?.id ?? null,
              lastCompletedAt: recentRun?.completed_at ?? null,
              minIntervalHours: Math.round(LOVABLE_JOB_MIN_INTERVAL_MS / 3_600_000),
            };

            await logAppEvent({
              level: "info",
              event: "agenda_sync_hook_skipped",
              area: "agenda",
              message: "Job Lovable ignoré : une synchronisation agenda récente existe déjà.",
              details: result,
              request,
            });

            return new Response(JSON.stringify(result), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
          }
        } catch (error) {
          await logAppEvent({
            level: "warning",
            event: "agenda_sync_hook_skip_check_failed",
            area: "agenda",
            message: "Impossible de vérifier la dernière synchronisation agenda, lancement par sécurité.",
            details: errorDetails(error, { trigger: LOVABLE_AGENDA_TRIGGER }),
            request,
          });
        }

        const { runAgendaSync } = await import("@/lib/agenda-sync.server");
        const result = await runAgendaSync({
          days: AGENDA_SYNC_DAYS,
          trigger: LOVABLE_AGENDA_TRIGGER,
        });

        return new Response(JSON.stringify(result), {
          status: result.status === "success" ? 200 : 500,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
