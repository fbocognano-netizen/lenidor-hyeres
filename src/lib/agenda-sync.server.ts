// Moteur de synchronisation de l'agenda (Lovable Cloud).
// Utilisé par la tâche planifiée quotidienne et par le déclenchement manuel admin.

import { annotateEvent } from "./agenda-editorial.server";
import {
  getCoteAzurEvents,
  matchCoteAzurEvent,
  type CoteAzurEvent,
} from "./cote-azur-agenda.server";
import {
  getCityAgendaPreview,
  locationLabel,
  type CityAgendaEvent,
} from "./hyeres-agenda.server";
import { errorDetails, logAppEvent } from "./logging.server";


export type AgendaSyncResult = {
  runId: string | null;
  status: "success" | "error";
  rangeStart: string;
  rangeEnd: string;
  eventsSeen: number;
  occurrencesSeen: number;
  unmatchedEvents: number;
  coteAzurEvents: number;
  coteAzurMatched: number;
  errorMessage?: string;

};

const DEFAULT_DAYS = 45;

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
      source: "hyeres",
      range_start: rangeStart,
      range_end: rangeEnd,
      status: "running",
    })
    .select("id")
    .single();

  const runId = runRow?.id ?? null;

  try {
    const preview = await getCityAgendaPreview(days, startedAt);

    const matched = new Map<string, { event: CityAgendaEvent; dates: Set<string> }>();
    let unmatchedEvents = 0;
    let occurrencesSeen = 0;

    for (const day of preview.days) {
      for (const card of day.cards) {
        occurrencesSeen += 1;
        const event = preview.eventsByUrl.get(card.sourceUrl);
        if (!event) {
          unmatchedEvents += 1;
          continue;
        }
        const entry = matched.get(event.sourceEventId) ?? { event, dates: new Set<string>() };
        entry.dates.add(day.date);
        matched.set(event.sourceEventId, entry);
      }
    }

    const nowIso = new Date().toISOString();
    const rows = Array.from(matched.values()).map(({ event }) => {
      const annotation = annotateEvent({
        title: event.title,
        category: event.category,
        locationSlug: event.locationSlug,
        scheduleText: event.scheduleText,
      });
      return {
        source: "hyeres",
        source_event_id: event.sourceEventId,
        source_url: event.sourceUrl,
        title: event.title,
        category: event.category,
        location_slug: event.locationSlug,
        location_label: locationLabel(event.locationSlug),
        schedule_text: event.scheduleText,
        source_published_at: event.sourcePublishedAt,
        source_updated_at: event.sourceUpdatedAt,
        last_synced_at: nowIso,
        traveler_category: annotation.travelerCategory,
        editorial_priority: annotation.editorialPriority,
        editorial_rhythm: annotation.editorialRhythm,
        editorial_score: annotation.editorialScore,
        editorial_tags: annotation.editorialTags,
      };
    });

    if (rows.length > 0) {
      const { data: upserted, error: upsertError } = await supabaseAdmin
        .from("agenda_events")
        .upsert(rows, { onConflict: "source,source_event_id" })
        .select("id, source_event_id");
      if (upsertError) throw upsertError;

      const idBySourceId = new Map((upserted ?? []).map((row) => [row.source_event_id, row.id]));
      const occurrenceRows: Array<{
        event_id: string;
        occurrence_date: string;
        source_checked_at: string;
      }> = [];

      for (const [sourceEventId, entry] of matched) {
        const eventId = idBySourceId.get(sourceEventId);
        if (!eventId) continue;
        for (const date of entry.dates) {
          occurrenceRows.push({
            event_id: eventId,
            occurrence_date: date,
            source_checked_at: nowIso,
          });
        }
      }

      const eventIds = Array.from(idBySourceId.values());
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
      unmatchedEvents,
    };

    if (runId) {
      await supabaseAdmin
        .from("agenda_sync_runs")
        .update({
          status: "success",
          events_seen: result.eventsSeen,
          occurrences_seen: result.occurrencesSeen,
          unmatched_events: result.unmatchedEvents,
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId);
    }

    await logAppEvent({
      level: "info",
      event: "agenda_sync_success",
      area: "agenda",
      message: `Agenda synchronisé : ${result.eventsSeen} événements, ${result.occurrencesSeen} occurrences.`,
      details: { ...result },
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";

    if (runId) {
      await supabaseAdmin
        .from("agenda_sync_runs")
        .update({
          status: "error",
          error_message: errorMessage.slice(0, 500),
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId);
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
      errorMessage,
    };
  }
}
