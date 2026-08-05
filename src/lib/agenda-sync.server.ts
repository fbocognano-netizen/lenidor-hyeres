import type { Json } from "@/integrations/supabase/types";

import { assessAgendaEvent } from "./agenda-editorial";
import { getCoteAzurAgendaEvents, type CoteAzurAgendaEvent } from "./cote-azur-agenda-source.server";
import { getCityAgendaPreview } from "./hyeres-agenda-source.server";

const SYNC_DAYS = 14;

type AgendaEventRow = {
  source: string;
  source_event_id: string;
  source_url: string;
  title: string;
  category: string | null;
  traveler_category: string | null;
  location_slug: string | null;
  location_label: string | null;
  schedule_text: string | null;
  source_published_at: string | null;
  source_updated_at: string | null;
  editorial_priority: string | null;
  editorial_rhythm: string | null;
  editorial_score: number;
  editorial_tags: string[];
  cote_azur_source_url: string | null;
  cote_azur_type: string | null;
  last_synced_at: string;
};

export type AgendaSyncResult = {
  runId: string;
  rangeStart: string;
  rangeEnd: string;
  eventsUpserted: number;
  occurrencesUpserted: number;
  unmatchedOccurrences: number;
  crossCheckedOccurrences: number;
};

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

function findCoteAzurMatch(title: string, date: string, events: CoteAzurAgendaEvent[]): CoteAzurAgendaEvent | null {
  const normalizedTitle = normalizeMatchValue(title);
  return events.find((event) => {
    const normalizedCandidate = normalizeMatchValue(event.title);
    const matchingTitle = normalizedCandidate === normalizedTitle
      || (normalizedCandidate.length > 8 && normalizedTitle.includes(normalizedCandidate))
      || (normalizedTitle.length > 8 && normalizedCandidate.includes(normalizedTitle));
    return matchingTitle && event.startsAt !== null && event.startsAt <= date && (event.endsAt ?? event.startsAt) >= date;
  }) ?? null;
}

export async function synchronizeAgenda(): Promise<AgendaSyncResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const preview = await getCityAgendaPreview(SYNC_DAYS);
  const runStart = new Date().toISOString();
  const { data: run, error: runError } = await supabaseAdmin
    .from("agenda_sync_runs")
    .insert({ source: "hyeres", range_start: preview.startDate, range_end: preview.endDate, status: "running" })
    .select("id")
    .single();

  if (runError || !run) throw new Error(`Impossible de créer le journal de synchronisation : ${runError?.message ?? "réponse vide"}.`);

  try {
    const coteAzurEvents = await getCoteAzurAgendaEvents(preview.startDate, preview.endDate);
    const occurrences = preview.days.flatMap((day) => day.cards.map((card) => ({
      date: day.date,
      title: card.title,
      sourceUrl: card.sourceUrl,
      event: preview.eventsByUrl.get(card.sourceUrl) ?? null,
    })));
    const occurrenceCountByUrl = new Map<string, number>();
    for (const occurrence of occurrences) {
      occurrenceCountByUrl.set(occurrence.sourceUrl, (occurrenceCountByUrl.get(occurrence.sourceUrl) ?? 0) + 1);
    }

    const eventRows = new Map<string, AgendaEventRow>();
    const occurrenceReferences: { sourceEventId: string; date: string }[] = [];
    let unmatchedOccurrences = 0;
    let crossCheckedOccurrences = 0;

    for (const occurrence of occurrences) {
      const cityEvent = occurrence.event;
      if (!cityEvent) unmatchedOccurrences += 1;
      const coteAzurEvent = findCoteAzurMatch(occurrence.title, occurrence.date, coteAzurEvents);
      if (coteAzurEvent) crossCheckedOccurrences += 1;
      const selection = assessAgendaEvent({
        title: occurrence.title,
        sourceCategory: cityEvent?.category ?? null,
        travelerCategory: cityEvent?.travelerCategory ?? null,
        scheduleText: [cityEvent?.scheduleText, coteAzurEvent?.description, coteAzurEvent?.type].filter(Boolean).join(" ") || null,
        occurrenceCount: occurrenceCountByUrl.get(occurrence.sourceUrl) ?? 1,
      });
      const sourceEventId = cityEvent?.sourceEventId ?? `url:${occurrence.sourceUrl}`;
      eventRows.set(sourceEventId, {
        source: "hyeres",
        source_event_id: sourceEventId,
        source_url: occurrence.sourceUrl,
        title: cityEvent?.title ?? occurrence.title,
        category: cityEvent?.category ?? null,
        traveler_category: cityEvent?.travelerCategory.id ?? null,
        location_slug: cityEvent?.locationSlug ?? null,
        location_label: cityEvent?.locationSlug?.replaceAll("_", " ") ?? null,
        schedule_text: cityEvent?.scheduleText ?? null,
        source_published_at: cityEvent?.sourcePublishedAt ?? null,
        source_updated_at: cityEvent?.sourceUpdatedAt ?? null,
        editorial_priority: selection.priority.id,
        editorial_rhythm: selection.rhythm.id,
        editorial_score: selection.score,
        editorial_tags: selection.tags,
        cote_azur_source_url: coteAzurEvent?.sourceUrl ?? null,
        cote_azur_type: coteAzurEvent?.type ?? null,
        last_synced_at: runStart,
      });
      occurrenceReferences.push({ sourceEventId, date: occurrence.date });
    }

    const rows = [...eventRows.values()];
    const { data: savedEvents, error: eventError } = await supabaseAdmin
      .from("agenda_events")
      .upsert(rows as never, { onConflict: "source,source_event_id" })
      .select("id,source_event_id");
    if (eventError || !savedEvents) throw new Error(`Impossible d'enregistrer les événements : ${eventError?.message ?? "réponse vide"}.`);

    const savedIdBySourceEventId = new Map(savedEvents.map((event) => [event.source_event_id, event.id]));
    const savedEventIds = [...savedIdBySourceEventId.values()];
    if (savedEventIds.length > 0) {
      const { error: deleteError } = await supabaseAdmin
        .from("agenda_occurrences")
        .delete()
        .in("event_id", savedEventIds)
        .gte("occurrence_date", preview.startDate)
        .lte("occurrence_date", preview.endDate);
      if (deleteError) throw new Error(`Impossible de remplacer les dates existantes : ${deleteError.message}.`);
    }

    const occurrenceRows = occurrenceReferences.flatMap((occurrence) => {
      const eventId = savedIdBySourceEventId.get(occurrence.sourceEventId);
      return eventId ? [{ event_id: eventId, occurrence_date: occurrence.date, source_checked_at: runStart }] : [];
    });
    if (occurrenceRows.length > 0) {
      const { error: occurrenceError } = await supabaseAdmin.from("agenda_occurrences").insert(occurrenceRows);
      if (occurrenceError) throw new Error(`Impossible d'enregistrer les dates : ${occurrenceError.message}.`);
    }

    const { error: completedError } = await supabaseAdmin.from("agenda_sync_runs").update({
      status: "completed",
      events_seen: rows.length,
      occurrences_seen: occurrenceRows.length,
      unmatched_events: unmatchedOccurrences,
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);
    if (completedError) throw new Error(`Impossible de finaliser le journal : ${completedError.message}.`);

    return {
      runId: run.id,
      rangeStart: preview.startDate,
      rangeEnd: preview.endDate,
      eventsUpserted: rows.length,
      occurrencesUpserted: occurrenceRows.length,
      unmatchedOccurrences,
      crossCheckedOccurrences,
    };
  } catch (error) {
    await supabaseAdmin.from("agenda_sync_runs").update({
      status: "failed",
      error_message: error instanceof Error ? error.message.slice(0, 2_000) : "Erreur inconnue.",
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);
    throw error;
  }
}

export function agendaSyncResultForLog(result: AgendaSyncResult): Json {
  return {
    runId: result.runId,
    rangeStart: result.rangeStart,
    rangeEnd: result.rangeEnd,
    eventsUpserted: result.eventsUpserted,
    occurrencesUpserted: result.occurrencesUpserted,
    unmatchedOccurrences: result.unmatchedOccurrences,
    crossCheckedOccurrences: result.crossCheckedOccurrences,
  };
}
