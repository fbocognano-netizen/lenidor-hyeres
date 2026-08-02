import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getAdminSessionState } from "./admin-session.server";
import { getCityAgendaPreview } from "./hyeres-agenda.server";
import { errorDetails, logAppEvent } from "./logging.server";

const PREVIEW_DAYS = 30;

async function isAdminUnlocked(): Promise<boolean> {
  try {
    const { session } = await getAdminSessionState();
    return Boolean(session.data.unlocked);
  } catch {
    return false;
  }
}

function locationLabel(value: string | null): string | null {
  if (!value) return null;
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export const previewHyeresAgenda = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ days: z.literal(PREVIEW_DAYS) }).parse(data))
  .handler(async () => {
    if (!(await isAdminUnlocked())) return { authenticated: false as const, preview: null };

    const preview = await getCityAgendaPreview(PREVIEW_DAYS);
    const cards = preview.days.flatMap((day) =>
      day.cards.map((card) => ({
        date: day.date,
        title: card.title,
        sourceUrl: card.sourceUrl,
        event: preview.eventsByUrl.get(card.sourceUrl) ?? null,
      })),
    );
    const unmatched = cards.filter((card) => card.event === null).length;

    return {
      authenticated: true as const,
      preview: {
        rangeStart: preview.startDate,
        rangeEnd: preview.endDate,
        eventCards: cards.length,
        unmatched,
        cards: cards.slice(0, 80).map((card) => ({
          date: card.date,
          title: card.title,
          sourceUrl: card.sourceUrl,
          category: card.event?.category ?? null,
          location: locationLabel(card.event?.locationSlug ?? null),
          scheduleText: card.event?.scheduleText ?? null,
        })),
      },
    };
  });

export const importHyeresAgenda = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ days: z.literal(PREVIEW_DAYS) }).parse(data))
  .handler(async () => {
    if (!(await isAdminUnlocked())) return { authenticated: false as const, ok: false as const };

    const preview = await getCityAgendaPreview(PREVIEW_DAYS);
    const cards = preview.days.flatMap((day) =>
      day.cards.map((card) => ({ date: day.date, card })),
    );
    const matched = cards.flatMap(({ date, card }) => {
      const event = preview.eventsByUrl.get(card.sourceUrl);
      return event ? [{ date, event }] : [];
    });
    const unmatched = cards.length - matched.length;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: run, error: runError } = await supabaseAdmin
      .from("agenda_sync_runs")
      .insert({
        source: "hyeres",
        range_start: preview.startDate,
        range_end: preview.endDate,
        status: "running",
      })
      .select("id")
      .single();

    if (runError || !run) throw new Error("Impossible de démarrer la synchronisation.");

    try {
      const uniqueEvents = Array.from(
        new Map(matched.map(({ event }) => [event.sourceEventId, event])).values(),
      );
      const { data: savedEvents, error: eventsError } = await supabaseAdmin
        .from("agenda_events")
        .upsert(
          uniqueEvents.map((event) => ({
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
            last_synced_at: new Date().toISOString(),
          })),
          { onConflict: "source,source_event_id" },
        )
        .select("id, source_event_id");
      if (eventsError || !savedEvents) throw new Error("Impossible d’enregistrer les événements.");

      const eventIdBySourceId = new Map(
        savedEvents.map((event) => [event.source_event_id, event.id]),
      );
      const occurrences = matched.flatMap(({ date, event }) => {
        const eventId = eventIdBySourceId.get(event.sourceEventId);
        return eventId
          ? [
              {
                event_id: eventId,
                occurrence_date: date,
                source_checked_at: new Date().toISOString(),
              },
            ]
          : [];
      });
      const { error: occurrencesError } = await supabaseAdmin
        .from("agenda_occurrences")
        .upsert(occurrences, { onConflict: "event_id,occurrence_date" });
      if (occurrencesError) throw new Error("Impossible d’enregistrer les occurrences.");

      await supabaseAdmin
        .from("agenda_sync_runs")
        .update({
          status: "completed",
          events_seen: uniqueEvents.length,
          occurrences_seen: occurrences.length,
          unmatched_events: unmatched,
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id);

      await logAppEvent({
        level: "info",
        event: "hyeres_agenda_sync_completed",
        area: "agenda",
        message: "Synchronisation de l'agenda d'Hyères terminée.",
        details: { events: uniqueEvents.length, occurrences: occurrences.length, unmatched },
      });
      return {
        authenticated: true as const,
        ok: true as const,
        events: uniqueEvents.length,
        occurrences: occurrences.length,
        unmatched,
      };
    } catch (error) {
      await supabaseAdmin
        .from("agenda_sync_runs")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Erreur inconnue",
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id);
      await logAppEvent({
        level: "error",
        event: "hyeres_agenda_sync_failed",
        area: "agenda",
        message: "Synchronisation de l'agenda d'Hyères impossible.",
        details: errorDetails(error),
      });
      throw error;
    }
  });

export const listHyeresAgendaPreview = createServerFn({ method: "GET" }).handler(async () => {
  if (!(await isAdminUnlocked()))
    return { authenticated: false as const, events: [], latestRun: null };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: events, error: eventsError }, { data: latestRun, error: runError }] =
    await Promise.all([
      supabaseAdmin
        .from("agenda_occurrences")
        .select(
          "occurrence_date, agenda_events(title, category, location_label, schedule_text, source_url)",
        )
        .gte("occurrence_date", new Date().toISOString().slice(0, 10))
        .order("occurrence_date", { ascending: true })
        .limit(100),
      supabaseAdmin
        .from("agenda_sync_runs")
        .select(
          "status, events_seen, occurrences_seen, unmatched_events, completed_at, error_message",
        )
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
  if (eventsError || runError) throw new Error("Impossible de charger l’aperçu de l’agenda.");
  return {
    authenticated: true as const,
    events: (events ?? []).map((row) => ({
      date: row.occurrence_date,
      title: row.agenda_events?.title ?? "Événement sans titre",
      category: row.agenda_events?.category ?? null,
      location: row.agenda_events?.location_label ?? null,
      scheduleText: row.agenda_events?.schedule_text ?? null,
      sourceUrl: row.agenda_events?.source_url ?? "",
    })),
    latestRun,
  };
});
