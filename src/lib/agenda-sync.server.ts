// Moteur de synchronisation de l'agenda (Lovable Cloud).
// Utilisé par la tâche planifiée quotidienne et par le déclenchement manuel admin.

import { annotateEvent } from "./agenda-editorial.server";
import {
  agendaEventFingerprint,
  collectHyeresAreaAgendaEvents,
  normalizeCategory,
} from "./hyeres-area-agenda-sources.server";
import { errorDetails, logAppEvent } from "./logging.server";

export type AgendaSyncResult = {
  runId: string | null;
  status: "success" | "error";
  rangeStart: string;
  rangeEnd: string;
  eventsSeen: number;
  occurrencesSeen: number;
  unmatchedEvents: number;
  crossCheckedEvents: number;
  errorMessage?: string;
};

const DEFAULT_DAYS = 45;

function normalizeMatchValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(le|la|les|un|une|de|du|des|au|aux|a|et)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export async function runAgendaSync(options: { days?: number } = {}): Promise<AgendaSyncResult> {
  const days = Math.min(Math.max(options.days ?? DEFAULT_DAYS, 1), 120);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const startedAt = new Date();
  const rangeStart = startedAt.toISOString().slice(0, 10);
  const rangeEnd = new Date(startedAt.getTime() + (days - 1) * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const { data: runRow } = await supabaseAdmin
    .from("agenda_sync_runs")
    .insert({
      source: "hyeres_area",
      range_start: rangeStart,
      range_end: rangeEnd,
      status: "running",
    })
    .select("id")
    .single();

  const runId = runRow?.id ?? null;

  try {
    const collected = await collectHyeresAreaAgendaEvents({ days, start: startedAt });
    const occurrencesSeen = collected.events.reduce(
      (total, event) => total + event.occurrenceDates.length,
      0,
    );
    const failedSources = collected.stats.filter((source) => source.status === "failed");
    const nowIso = new Date().toISOString();
    const rows = collected.events.map((event) => {
      const annotation = annotateEvent({
        title: event.title,
        category: event.category,
        locationSlug: event.locationSlug,
        scheduleText: [event.scheduleText, event.city, event.locationLabel]
          .filter(Boolean)
          .join(" "),
      });
      return {
        source: event.source,
        source_name: event.sourceName,
        source_event_id: event.sourceEventId,
        source_url: event.sourceUrl,
        canonical_url: event.canonicalUrl,
        title: event.title,
        category: normalizeCategory(event.category),
        source_category: event.sourceCategory,
        city: event.city,
        location_slug: event.locationSlug,
        location_label: event.locationLabel,
        address: event.address,
        schedule_text: event.scheduleText,
        image_url: event.imageUrl,
        price_text: event.priceText,
        timezone: "Europe/Paris",
        source_published_at: event.sourcePublishedAt,
        source_updated_at: event.sourceUpdatedAt,
        raw_payload_hash: event.rawPayloadHash,
        event_fingerprint: normalizeMatchValue(agendaEventFingerprint(event)),
        status: "active",
        last_seen_at: nowIso,
        last_synced_at: nowIso,
        traveler_category: annotation.travelerCategory,
        editorial_priority: annotation.editorialPriority,
        editorial_rhythm: annotation.editorialRhythm,
        editorial_score: annotation.editorialScore,
        editorial_tags: annotation.editorialTags,
        cote_azur_source_url: null,
        cote_azur_type: null,
      };
    });

    if (rows.length > 0) {
      const { data: upserted, error: upsertError } = await supabaseAdmin
        .from("agenda_events")
        .upsert(rows, { onConflict: "source,source_event_id" })
        .select("id, source, source_event_id");
      if (upsertError) throw upsertError;

      const idBySourceKey = new Map(
        (upserted ?? []).map((row) => [`${row.source}:${row.source_event_id}`, row.id]),
      );
      const occurrenceRows: Array<{
        event_id: string;
        occurrence_date: string;
        source_checked_at: string;
      }> = [];

      for (const event of collected.events) {
        const eventId = idBySourceKey.get(`${event.source}:${event.sourceEventId}`);
        if (!eventId) continue;
        for (const date of event.occurrenceDates) {
          occurrenceRows.push({
            event_id: eventId,
            occurrence_date: date,
            source_checked_at: nowIso,
          });
        }
      }

      const eventIds = Array.from(idBySourceKey.values());
      if (eventIds.length > 0) {
        await supabaseAdmin
          .from("agenda_occurrences")
          .delete()
          .in("event_id", eventIds)
          .gte("occurrence_date", rangeStart)
          .lte("occurrence_date", rangeEnd);
      }

      if (occurrenceRows.length > 0) {
        const { error: occError } = await supabaseAdmin
          .from("agenda_occurrences")
          .insert(occurrenceRows);
        if (occError) throw occError;
      }
    }

    const result: AgendaSyncResult = {
      runId,
      status: "success",
      rangeStart,
      rangeEnd,
      eventsSeen: rows.length,
      occurrencesSeen,
      unmatchedEvents: failedSources.length,
      crossCheckedEvents: 0,
      errorMessage:
        failedSources.length > 0
          ? `${failedSources.length} source(s) en erreur pendant la synchronisation.`
          : undefined,
    };

    if (runId) {
      const { error: completedRunError } = await supabaseAdmin
        .from("agenda_sync_runs")
        .update({
          status: "completed",
          events_seen: result.eventsSeen,
          occurrences_seen: result.occurrencesSeen,
          unmatched_events: result.unmatchedEvents,
          source_stats: collected.stats,
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId);
      if (completedRunError) throw completedRunError;
    }

    await logAppEvent({
      level: "info",
      event: "agenda_sync_success",
      area: "agenda",
      message: `Agenda multi-villes synchronisé : ${result.eventsSeen} événements, ${result.occurrencesSeen} occurrences.`,
      details: { ...result, sourceStats: collected.stats },
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";

    if (runId) {
      const { error: failedRunError } = await supabaseAdmin
        .from("agenda_sync_runs")
        .update({
          status: "failed",
          error_message: errorMessage.slice(0, 500),
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId);
      if (failedRunError) {
        await logAppEvent({
          level: "error",
          event: "agenda_sync_run_update_failed",
          area: "agenda",
          message: "Impossible de mettre à jour le journal de synchronisation.",
          details: errorDetails(failedRunError, { runId }),
        });
      }
    }

    await logAppEvent({
      level: "error",
      event: "agenda_sync_failed",
      area: "agenda",
      message: "La synchronisation de l'agenda a échoué.",
      details: errorDetails(error, { rangeStart, rangeEnd }),
    });

    return {
      runId,
      status: "error",
      rangeStart,
      rangeEnd,
      eventsSeen: 0,
      occurrencesSeen: 0,
      unmatchedEvents: 0,
      crossCheckedEvents: 0,
      errorMessage,
    };
  }
}
