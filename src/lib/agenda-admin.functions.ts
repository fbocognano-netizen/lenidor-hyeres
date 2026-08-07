import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getAdminSessionState } from "./admin-session.server";
import { errorDetails, logAppEvent } from "./logging.server";

async function requireAdmin() {
  try {
    const { session } = await getAdminSessionState();
    if (!session.data.unlocked) throw new Error("Accès admin requis.");
  } catch (error) {
    await logAppEvent({
      level: "warning",
      event: "agenda_admin_denied",
      area: "agenda",
      message: "Accès refusé à la synchronisation de l'agenda.",
      details: errorDetails(error),
    });
    throw new Error("Accès admin requis.");
  }
}

export const getAgendaStatus = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [runs, events, counts] = await Promise.all([
    supabaseAdmin
      .from("agenda_sync_runs")
      .select(
        "id, status, range_start, range_end, events_seen, occurrences_seen, unmatched_events, error_message, source_stats, started_at, completed_at",
      )
      .order("started_at", { ascending: false })
      .limit(10),
    supabaseAdmin
      .from("agenda_events")
      .select(
        "id, title, source_url, source_name, city, category, source_category, location_label, traveler_category, editorial_priority, editorial_score, editorial_tags, last_synced_at",
      )
      .order("editorial_score", { ascending: false })
      .limit(25),
    supabaseAdmin.from("agenda_events").select("id", { count: "exact", head: true }),
  ]);

  return {
    runs: runs.data ?? [],
    topEvents: events.data ?? [],
    totalEvents: counts.count ?? 0,
  };
});

export const triggerAgendaSync = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ days: z.number().int().min(1).max(120).optional() }).parse(data ?? {}),
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { runAgendaSync } = await import("./agenda-sync.server");
    return runAgendaSync({ days: data.days ?? 45 });
  });
