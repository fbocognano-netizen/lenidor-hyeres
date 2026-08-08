import { createServerFn } from "@tanstack/react-start";

export type PublicAgendaEvent = {
  id: string;
  title: string;
  category: string | null;
  travelerCategory: string | null;
  editorialPriority: string | null;
  editorialScore: number;
  editorialTags: string[];
  locationLabel: string | null;
  city: string | null;
  sourceName: string | null;
  scheduleText: string | null;
  sourceUrl: string;
  coteAzurSourceUrl: string | null;
  dates: string[];
};

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export const getPublicAgenda = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const start = new Date();
  const end = new Date(start.getTime() + 13 * 86_400_000);
  const rangeStart = dateKey(start);
  const rangeEnd = dateKey(end);

  const { data, error } = await supabaseAdmin
    .from("agenda_events")
    .select(
      "id, title, category, traveler_category, editorial_priority, editorial_score, editorial_tags, location_label, city, source_name, schedule_text, source_url, cote_azur_source_url, agenda_occurrences!inner(occurrence_date)",
    )
    .gte("agenda_occurrences.occurrence_date", rangeStart)
    .lte("agenda_occurrences.occurrence_date", rangeEnd)
    .order("editorial_score", { ascending: false })
    .order("title", { ascending: true });

  if (error) throw new Error("Impossible de charger l'agenda pour le moment.");

  return (data ?? []).map(
    (event) =>
      ({
        id: event.id,
        title: event.title,
        category: event.category,
        travelerCategory: event.traveler_category,
        editorialPriority: event.editorial_priority,
        editorialScore: event.editorial_score,
        editorialTags: event.editorial_tags ?? [],
        locationLabel: event.location_label,
        city: event.city,
        sourceName: event.source_name,
        scheduleText: event.schedule_text,
        sourceUrl: event.source_url,
        coteAzurSourceUrl: event.cote_azur_source_url,
        dates: Array.from(
          new Set((event.agenda_occurrences ?? []).map((occurrence) => occurrence.occurrence_date)),
        ).sort(),
      }) satisfies PublicAgendaEvent,
  );
});
