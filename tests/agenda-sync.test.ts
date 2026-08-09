import test from "node:test";
import assert from "node:assert/strict";

import {
  dedupeAgendaRowsBySourceUrl,
  findCoteAzurMatch,
  normalizeMatchValue,
  normalizeSourceCategory,
  rowForHyeresEvent,
  rowForNearbyEvent,
} from "../src/lib/agenda-sync.server.ts";

test("normalizes source categories without treating port as airport", () => {
  assert.equal(normalizeSourceCategory("Cinéma projection"), "cinema");
  assert.equal(normalizeSourceCategory("Port"), "port");
});

test("normalizes values for matching", () => {
  assert.equal(
    normalizeMatchValue("Concert & Feu d'artifice au Port d'Hyères"),
    "concert feu artifice port hyeres",
  );
});

test("matches Cote d'Azur events by title and date overlap", () => {
  const match = findCoteAzurMatch("Concert & Feu d'artifice", "2026-08-16", [
    {
      title: "Concert et feu d'artifice",
      sourceUrl: "https://example.test/event",
      type: "Concert",
      description: "Port d'Hyères",
      startsAt: "2026-08-16",
      endsAt: "2026-08-16",
    },
  ]);

  assert.equal(match?.sourceUrl, "https://example.test/event");
});

test("builds normalized Hyeres rows before Supabase write", () => {
  const row = rowForHyeresEvent({
    event: {
      sourceEventId: "123",
      sourceUrl: "https://hyeres.fr/agenda/concert-feu-artifice/",
      title: "Concert & Feu d'artifice",
      category: "Manifestations",
      locationSlug: "port",
      scheduleText: "Port d'Hyères à 21h30",
      sourcePublishedAt: "2026-08-01T10:00:00+02:00",
      sourceUpdatedAt: "2026-08-08T10:00:00+02:00",
    },
    dates: new Set(["2026-08-16"]),
    coteAzurEvent: null,
    nowIso: "2026-08-09T08:00:00.000Z",
  });

  assert.equal(row.source_name, "Ville d'Hyères - Agenda");
  assert.equal(row.city, "Hyères");
  assert.equal(row.location_slug, "port");
  assert.equal(row.location_label, "Port");
  assert.equal(row.timezone, "Europe/Paris");
  assert.equal(row.status, "active");
});

test("keeps nearby source city and location labels explicit", () => {
  const row = rowForNearbyEvent(
    {
      source: "lavandou_html",
      sourceName: "Office de tourisme du Lavandou - Agenda",
      sourceEventId: "lavandou-1",
      sourceUrl: "https://example.test/agenda/1",
      canonicalUrl: "https://example.test/agenda/1",
      title: "Fete locale",
      category: "Marchés",
      sourceCategory: "Marchés",
      city: "Le Lavandou",
      locationSlug: "le_lavandou",
      locationLabel: "Le Lavandou",
      address: null,
      scheduleText: "Place du village",
      imageUrl: null,
      priceText: null,
      sourcePublishedAt: null,
      sourceUpdatedAt: null,
      occurrenceDates: ["2026-08-15"],
      rawPayloadHash: "abc",
    },
    "2026-08-09T08:00:00.000Z",
  );

  assert.equal(row.source_name, "Office de tourisme du Lavandou - Agenda");
  assert.equal(row.city, "Le Lavandou");
  assert.equal(row.location_label, "Le Lavandou");
  assert.equal(row.category, "marche");
});

test("deduplicates agenda rows by source URL before Supabase upsert", () => {
  const oldPradetRow = {
    source: "le_pradet_rss",
    source_event_id: "old-feed-id",
    source_url: "https://www.le-pradet.fr/evenement/en-septembre-au-cinema-francis-weber/",
  };
  const officialPradetRow = {
    source: "le_pradet_wp_api",
    source_event_id: "1234",
    source_url: "https://www.le-pradet.fr/evenement/en-septembre-au-cinema-francis-weber/",
  };

  const result = dedupeAgendaRowsBySourceUrl([oldPradetRow, officialPradetRow]);

  assert.equal(result.duplicateSourceUrls, 1);
  assert.deepEqual(result.rows, [officialPradetRow]);
});
