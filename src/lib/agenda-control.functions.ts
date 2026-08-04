import { createServerFn } from "@tanstack/react-start";

import { assessAgendaEvent } from "./agenda-editorial";
import { getCoteAzurAgendaEvents, type CoteAzurAgendaEvent } from "./cote-azur-agenda-source.server";
import { getCityAgendaPreview } from "./hyeres-agenda-source.server";

const PREVIEW_DAYS = 14;

export const previewHyeresAgendaSource = createServerFn({ method: "GET" }).handler(async () => {
  const preview = await getCityAgendaPreview(PREVIEW_DAYS);
  const coteAzurEvents = await getCoteAzurAgendaEvents(preview.startDate, preview.endDate);
  const occurrences = preview.days.flatMap((day) =>
    day.cards.map((card) => ({
      date: day.date,
      title: card.title,
      sourceUrl: card.sourceUrl,
      event: preview.eventsByUrl.get(card.sourceUrl) ?? null,
    })),
  );
  const occurrenceCountByUrl = new Map<string, number>();
  for (const occurrence of occurrences) {
    occurrenceCountByUrl.set(
      occurrence.sourceUrl,
      (occurrenceCountByUrl.get(occurrence.sourceUrl) ?? 0) + 1,
    );
  }
  const enrichedOccurrences = occurrences.map((occurrence) => {
    const coteAzurEvent = findCoteAzurMatch(occurrence.title, occurrence.date, coteAzurEvents);
    const selection = assessAgendaEvent({
      title: occurrence.title,
      sourceCategory: occurrence.event?.category ?? null,
      travelerCategory: occurrence.event?.travelerCategory ?? null,
      scheduleText: [occurrence.event?.scheduleText, coteAzurEvent?.description, coteAzurEvent?.type].filter(Boolean).join(" ") || null,
      occurrenceCount: occurrenceCountByUrl.get(occurrence.sourceUrl) ?? 1,
    });
    return { ...occurrence, coteAzurEvent, selection };
  });

  return {
    rangeStart: preview.startDate,
    rangeEnd: preview.endDate,
    occurrenceCount: enrichedOccurrences.length,
    unmatchedOccurrences: enrichedOccurrences.filter((occurrence) => occurrence.event === null).length,
    coteAzurEventCount: coteAzurEvents.length,
    crossCheckedOccurrences: enrichedOccurrences.filter((occurrence) => occurrence.coteAzurEvent !== null).length,
    priorityCounts: Object.fromEntries(
      ["must_see", "good_idea", "secondary", "exclude"].map((priority) => [
        priority,
        enrichedOccurrences.filter((occurrence) => occurrence.selection.priority.id === priority).length,
      ]),
    ),
    occurrences: enrichedOccurrences.slice(0, 160).map((occurrence) => ({
      date: occurrence.date,
      title: occurrence.title,
      sourceUrl: occurrence.sourceUrl,
      category: occurrence.event?.category ?? null,
      travelerCategory: occurrence.event?.travelerCategory ?? null,
      location: occurrence.event?.locationSlug?.replaceAll("_", " ") ?? null,
      rhythm: occurrence.selection.rhythm,
      priority: occurrence.selection.priority,
      score: occurrence.selection.score,
      tags: occurrence.selection.tags,
      coteAzurSourceUrl: occurrence.coteAzurEvent?.sourceUrl ?? null,
      coteAzurType: occurrence.coteAzurEvent?.type ?? null,
    })),
  };
});

function normalizeMatchValue(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\b(le|la|les|un|une|de|du|des|au|aux|a|et)\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function findCoteAzurMatch(title: string, date: string, events: CoteAzurAgendaEvent[]): CoteAzurAgendaEvent | null {
  const normalizedTitle = normalizeMatchValue(title);
  return events.find((event) => {
    const normalizedCandidate = normalizeMatchValue(event.title);
    const matchingTitle = normalizedCandidate === normalizedTitle || (normalizedCandidate.length > 8 && normalizedTitle.includes(normalizedCandidate)) || (normalizedTitle.length > 8 && normalizedCandidate.includes(normalizedTitle));
    return matchingTitle && event.startsAt !== null && event.startsAt <= date && (event.endsAt ?? event.startsAt) >= date;
  }) ?? null;
}
