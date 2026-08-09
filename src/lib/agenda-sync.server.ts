// Moteur de synchronisation de l'agenda (Lovable Cloud).
// Utilisé par la tâche planifiée quotidienne et par le déclenchement manuel admin.

import { annotateEvent } from "./agenda-editorial.server";
import {
  getCoteAzurAgendaEvents,
  type CoteAzurAgendaEvent,
} from "./cote-azur-agenda-source.server";
import {
  agendaEventFingerprint,
  collectNearbyAgendaEvents,
  normalizeCategory,
  type AreaAgendaEvent,
} from "./hyeres-area-agenda-sources.server";
import {
  getCityAgendaPreview,
  locationLabel,
  normalizeLocationSlug,
  type CityAgendaEvent,
} from "./hyeres-agenda.server";
import { errorDetails, logAppEvent } from "./logging.server";

export type AgendaSyncResult = {
  runId: string | null;
  status: "success" | "error";
  trigger: string;
  rangeStart: string;
  rangeEnd: string;
  eventsSeen: number;
  occurrencesSeen: number;
  unmatchedEvents: number;
  crossCheckedEvents: number;
  errorMessage?: string;
};

const DEFAULT_DAYS = 45;
const DEFAULT_TRIGGER = "unknown";

async function logAgendaSyncStep(input: {
  step: string;
  message: string;
  runId: string | null;
  trigger: string;
  rangeStart: string;
  rangeEnd: string;
  startedAt: Date;
  details?: Record<string, unknown>;
}) {
  await logAppEvent({
    level: "info",
    event: "agenda_sync_step",
    area: "agenda",
    message: input.message,
    details: {
      step: input.step,
      runId: input.runId,
      trigger: input.trigger,
      rangeStart: input.rangeStart,
      rangeEnd: input.rangeEnd,
      elapsedMs: Date.now() - input.startedAt.getTime(),
      ...(input.details ?? {}),
    },
  });
}

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

function normalizeSourceCategory(value: string | null): string | null {
  if (!value) return null;
  const normalized = normalizeMatchValue(value).replace(/\s+/g, "_");
  if (["projection", "cinema", "film", "cinema_projection"].includes(normalized)) return "cinema";
  if (["concert", "musique", "live", "dj"].includes(normalized)) return "musique";
  if (["exposition", "expo"].includes(normalized)) return "exposition";
  if (["visite", "visites", "sortie", "visites_sorties"].includes(normalized))
    return "visites_sorties";
  if (["spectacle", "theatre", "theatre_spectacle"].includes(normalized)) return "spectacle";
  if (normalized === "sport") return "sport";
  return normalized || null;
}

function findCoteAzurMatch(
  title: string,
  date: string,
  events: CoteAzurAgendaEvent[],
): CoteAzurAgendaEvent | null {
  const normalizedTitle = normalizeMatchValue(title);
  return (
    events.find((event) => {
      const normalizedCandidate = normalizeMatchValue(event.title);
      const matchingTitle =
        normalizedCandidate === normalizedTitle ||
        (normalizedCandidate.length > 8 && normalizedTitle.includes(normalizedCandidate)) ||
        (normalizedTitle.length > 8 && normalizedCandidate.includes(normalizedTitle));
      return (
        matchingTitle &&
        event.startsAt !== null &&
        event.startsAt <= date &&
        (event.endsAt ?? event.startsAt) >= date
      );
    }) ?? null
  );
}

function rowForNearbyEvent(event: AreaAgendaEvent, nowIso: string) {
  const annotation = annotateEvent({
    title: event.title,
    category: event.category,
    locationSlug: event.locationSlug,
    scheduleText: [event.scheduleText, event.city, event.locationLabel].filter(Boolean).join(" "),
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
}

export async function runAgendaSync(
  options: { days?: number; trigger?: string } = {},
): Promise<AgendaSyncResult> {
  const days = Math.min(Math.max(options.days ?? DEFAULT_DAYS, 1), 120);
  const trigger = options.trigger ?? DEFAULT_TRIGGER;
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
    await logAgendaSyncStep({
      step: "started",
      message: "Synchronisation agenda démarrée.",
      runId,
      trigger,
      rangeStart,
      rangeEnd,
      startedAt,
      details: { days },
    });

    const preview = await getCityAgendaPreview(days, startedAt);
    await logAgendaSyncStep({
      step: "hyeres_preview_collected",
      message: "Agenda Hyères collecté.",
      runId,
      trigger,
      rangeStart,
      rangeEnd,
      startedAt,
      details: {
        daysCollected: preview.days.length,
        eventsByUrl: preview.eventsByUrl.size,
        cardsSeen: preview.days.reduce((total, day) => total + day.cards.length, 0),
      },
    });

    const coteAzurEvents = await getCoteAzurAgendaEvents(preview.startDate, preview.endDate);
    await logAgendaSyncStep({
      step: "cote_azur_collected",
      message: "Contrôle Côte d'Azur collecté.",
      runId,
      trigger,
      rangeStart,
      rangeEnd,
      startedAt,
      details: { eventsSeen: coteAzurEvents.length },
    });

    const nearby = await collectNearbyAgendaEvents({
      days,
      start: startedAt,
      onSourceCollected: (stat) =>
        logAgendaSyncStep({
          step: "nearby_source_collected",
          message: `${stat.sourceName} : ${stat.status === "success" ? "collectée" : "en erreur"}.`,
          runId,
          trigger,
          rangeStart,
          rangeEnd,
          startedAt,
          details: stat,
        }),
    });
    await logAgendaSyncStep({
      step: "nearby_collected",
      message: "Sources des communes voisines collectées.",
      runId,
      trigger,
      rangeStart,
      rangeEnd,
      startedAt,
      details: {
        eventsSeen: nearby.events.length,
        occurrencesSeen: nearby.events.reduce(
          (total, event) => total + event.occurrenceDates.length,
          0,
        ),
        sourceStats: nearby.stats,
      },
    });

    const matched = new Map<
      string,
      {
        event: CityAgendaEvent;
        dates: Set<string>;
        coteAzurEvent: CoteAzurAgendaEvent | null;
      }
    >();
    let unmatchedEvents = 0;
    let occurrencesSeen = 0;
    let crossCheckedEvents = 0;

    for (const day of preview.days) {
      for (const card of day.cards) {
        occurrencesSeen += 1;
        const event = preview.eventsByUrl.get(card.sourceUrl);
        if (!event) {
          unmatchedEvents += 1;
          continue;
        }
        const coteAzurEvent = findCoteAzurMatch(event.title, day.date, coteAzurEvents);
        if (coteAzurEvent) crossCheckedEvents += 1;
        const entry = matched.get(event.sourceEventId) ?? {
          event,
          dates: new Set<string>(),
          coteAzurEvent,
        };
        if (!entry.coteAzurEvent && coteAzurEvent) entry.coteAzurEvent = coteAzurEvent;
        entry.dates.add(day.date);
        matched.set(event.sourceEventId, entry);
      }
    }
    await logAgendaSyncStep({
      step: "hyeres_matched",
      message: "Événements Hyères préparés et croisés.",
      runId,
      trigger,
      rangeStart,
      rangeEnd,
      startedAt,
      details: {
        matchedEvents: matched.size,
        occurrencesSeen,
        unmatchedEvents,
        crossCheckedEvents,
      },
    });

    const failedSources = nearby.stats.filter((source) => source.status === "failed");
    const nearbyOccurrencesSeen = nearby.events.reduce(
      (total, event) => total + event.occurrenceDates.length,
      0,
    );
    const nowIso = new Date().toISOString();
    const hyeresRows = Array.from(matched.values()).map(({ event, coteAzurEvent }) => {
      const normalizedLocationSlug = normalizeLocationSlug(event.locationSlug);
      const annotation = annotateEvent({
        title: event.title,
        category: event.category,
        locationSlug: normalizedLocationSlug,
        scheduleText:
          [event.scheduleText, coteAzurEvent?.description, coteAzurEvent?.type]
            .filter(Boolean)
            .join(" ") || null,
      });
      return {
        source: "hyeres",
        source_event_id: event.sourceEventId,
        source_url: event.sourceUrl,
        title: event.title,
        category: normalizeSourceCategory(event.category),
        source_category: event.category,
        location_slug: normalizedLocationSlug,
        location_label: locationLabel(normalizedLocationSlug),
        schedule_text: event.scheduleText,
        source_published_at: event.sourcePublishedAt,
        source_updated_at: event.sourceUpdatedAt,
        last_synced_at: nowIso,
        traveler_category: annotation.travelerCategory,
        editorial_priority: annotation.editorialPriority,
        editorial_rhythm: annotation.editorialRhythm,
        editorial_score: annotation.editorialScore,
        editorial_tags: annotation.editorialTags,
        cote_azur_source_url: coteAzurEvent?.sourceUrl ?? null,
        cote_azur_type: coteAzurEvent?.type ?? null,
      };
    });
    const nearbyRows = nearby.events.map((event) => rowForNearbyEvent(event, nowIso));
    const rows = [...hyeresRows, ...nearbyRows];
    await logAgendaSyncStep({
      step: "rows_prepared",
      message: "Lignes agenda préparées avant écriture.",
      runId,
      trigger,
      rangeStart,
      rangeEnd,
      startedAt,
      details: {
        rows: rows.length,
        hyeresRows: hyeresRows.length,
        nearbyRows: nearbyRows.length,
        failedNearbySources: failedSources.length,
      },
    });

    if (rows.length > 0) {
      await logAgendaSyncStep({
        step: "events_upsert_started",
        message: "Écriture des événements agenda démarrée.",
        runId,
        trigger,
        rangeStart,
        rangeEnd,
        startedAt,
        details: { rows: rows.length },
      });
      const { data: upserted, error: upsertError } = await supabaseAdmin
        .from("agenda_events")
        .upsert(rows, { onConflict: "source,source_event_id" })
        .select("id, source, source_event_id");
      if (upsertError) throw upsertError;
      await logAgendaSyncStep({
        step: "events_upsert_completed",
        message: "Écriture des événements agenda terminée.",
        runId,
        trigger,
        rangeStart,
        rangeEnd,
        startedAt,
        details: { upsertedRows: upserted?.length ?? 0 },
      });

      const idBySourceKey = new Map(
        (upserted ?? []).map((row) => [`${row.source}:${row.source_event_id}`, row.id]),
      );
      const occurrenceRows: Array<{
        event_id: string;
        occurrence_date: string;
        source_checked_at: string;
      }> = [];

      for (const [sourceEventId, entry] of matched) {
        const eventId = idBySourceKey.get(`hyeres:${sourceEventId}`);
        if (!eventId) continue;
        for (const date of entry.dates) {
          occurrenceRows.push({
            event_id: eventId,
            occurrence_date: date,
            source_checked_at: nowIso,
          });
        }
      }
      for (const event of nearby.events) {
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
        await logAgendaSyncStep({
          step: "occurrences_delete_started",
          message: "Nettoyage des anciennes occurrences démarré.",
          runId,
          trigger,
          rangeStart,
          rangeEnd,
          startedAt,
          details: { eventIds: eventIds.length },
        });
        const { error: deleteOccurrencesError } = await supabaseAdmin
          .from("agenda_occurrences")
          .delete()
          .in("event_id", eventIds)
          .gte("occurrence_date", rangeStart)
          .lte("occurrence_date", rangeEnd);
        if (deleteOccurrencesError) throw deleteOccurrencesError;
        await logAgendaSyncStep({
          step: "occurrences_delete_completed",
          message: "Nettoyage des anciennes occurrences terminé.",
          runId,
          trigger,
          rangeStart,
          rangeEnd,
          startedAt,
          details: { eventIds: eventIds.length },
        });
      }

      if (occurrenceRows.length > 0) {
        await logAgendaSyncStep({
          step: "occurrences_insert_started",
          message: "Écriture des occurrences démarrée.",
          runId,
          trigger,
          rangeStart,
          rangeEnd,
          startedAt,
          details: { occurrenceRows: occurrenceRows.length },
        });
        const { error: occError } = await supabaseAdmin
          .from("agenda_occurrences")
          .insert(occurrenceRows);
        if (occError) throw occError;
        await logAgendaSyncStep({
          step: "occurrences_insert_completed",
          message: "Écriture des occurrences terminée.",
          runId,
          trigger,
          rangeStart,
          rangeEnd,
          startedAt,
          details: { occurrenceRows: occurrenceRows.length },
        });
      }
    }

    const result: AgendaSyncResult = {
      runId,
      status: "success",
      trigger,
      rangeStart,
      rangeEnd,
      eventsSeen: rows.length,
      occurrencesSeen: occurrencesSeen + nearbyOccurrencesSeen,
      unmatchedEvents: unmatchedEvents + failedSources.length,
      crossCheckedEvents,
      errorMessage:
        failedSources.length > 0
          ? `${failedSources.length} source(s) voisine(s) en erreur pendant la synchronisation.`
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
          source_stats: nearby.stats,
          completed_at: new Date().toISOString(),
        })
        .eq("id", runId);
      if (completedRunError) throw completedRunError;
    }

    await logAgendaSyncStep({
      step: "completed",
      message: "Synchronisation agenda terminée.",
      runId,
      trigger,
      rangeStart,
      rangeEnd,
      startedAt,
      details: result,
    });

    await logAppEvent({
      level: "info",
      event: "agenda_sync_success",
      area: "agenda",
      message: `Agenda synchronisé : ${result.eventsSeen} événements, ${result.occurrencesSeen} occurrences.`,
      details: { ...result, nearbySourceStats: nearby.stats },
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
      details: errorDetails(error, {
        runId,
        trigger,
        rangeStart,
        rangeEnd,
        elapsedMs: Date.now() - startedAt.getTime(),
      }),
    });

    return {
      runId,
      status: "error",
      trigger,
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
