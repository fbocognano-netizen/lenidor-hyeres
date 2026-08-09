import test from "node:test";
import assert from "node:assert/strict";

import {
  collectNearbyAgendaEvents,
  HYERES_AREA_CITIES,
  HYERES_AREA_COLLECTIBLE_SOURCE_IDS,
  HYERES_AREA_SKIPPED_SOURCE_IDS,
  type AreaAgendaEvent,
  type AreaAgendaSourceStats,
} from "../src/lib/hyeres-area-agenda-sources.server.ts";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_OR_NULL_RE = /^\d{4}-\d{2}-\d{2}T/;
const HASH_RE = /^[a-f0-9]{64}$/;

function assertUrl(value: string, label: string) {
  assert.doesNotThrow(() => new URL(value), `${label} doit être une URL valide: ${value}`);
}

function assertOptionalUrl(value: string | null, label: string) {
  if (value !== null) assertUrl(value, label);
}

function assertOptionalIsoDate(value: string | null, label: string) {
  if (value !== null) assert.match(value, ISO_OR_NULL_RE, `${label} doit être une date ISO`);
}

function assertSourceStatsContract(stat: AreaAgendaSourceStats) {
  assert.equal(typeof stat.source, "string");
  assert.ok(stat.source.length > 0, "source manquante");
  assert.equal(typeof stat.sourceName, "string");
  assert.ok(stat.sourceName.length > 0, `sourceName manquant pour ${stat.source}`);
  assert.ok(
    ["success", "failed", "skipped"].includes(stat.status),
    `${stat.source}: statut invalide`,
  );
  assert.equal(typeof stat.eventsSeen, "number", `${stat.source}: eventsSeen doit être un nombre`);
  assert.ok(stat.eventsSeen >= 0, `${stat.source}: eventsSeen négatif`);

  if (stat.status === "success") {
    assert.ok(Array.isArray(stat.requestUrls), `${stat.source}: requestUrls absent`);
    assert.ok(stat.requestUrls.length > 0, `${stat.source}: aucune URL appelée`);
    for (const requestUrl of stat.requestUrls) assertUrl(requestUrl, `${stat.source}.requestUrls`);
    assert.equal(typeof stat.rawItemsSeen, "number", `${stat.source}: rawItemsSeen absent`);
    assert.ok(stat.rawItemsSeen >= 0, `${stat.source}: rawItemsSeen négatif`);
    assert.equal(typeof stat.eventsRejected, "number", `${stat.source}: eventsRejected absent`);
    assert.ok(stat.eventsRejected >= 0, `${stat.source}: eventsRejected négatif`);
  }

  if (stat.status === "failed") {
    assert.equal(typeof stat.errorMessage, "string", `${stat.source}: errorMessage absent`);
    assert.ok(stat.errorMessage.length > 0, `${stat.source}: errorMessage vide`);
  }
}

function assertEventContract(event: AreaAgendaEvent) {
  assert.equal(typeof event.source, "string");
  assert.ok(event.source.length > 0, "event.source manquant");
  assert.equal(typeof event.sourceName, "string");
  assert.ok(event.sourceName.length > 0, `${event.source}: event.sourceName manquant`);
  assert.equal(typeof event.sourceEventId, "string");
  assert.ok(event.sourceEventId.length > 0, `${event.source}: sourceEventId manquant`);
  assertUrl(event.sourceUrl, `${event.source}: sourceUrl`);
  assertOptionalUrl(event.canonicalUrl, `${event.source}: canonicalUrl`);
  assert.equal(typeof event.title, "string");
  assert.ok(event.title.length > 0, `${event.source}: title manquant`);
  assert.ok(HYERES_AREA_CITIES.includes(event.city), `${event.source}: ville non canonique`);
  assert.ok(
    Array.isArray(event.occurrenceDates),
    `${event.source}: occurrenceDates doit être un tableau`,
  );
  assert.ok(event.occurrenceDates.length > 0, `${event.source}: aucune date d'occurrence`);
  for (const date of event.occurrenceDates) {
    assert.match(date, DATE_RE, `${event.source}: date d'occurrence invalide`);
  }
  assert.equal(typeof event.rawPayloadHash, "string");
  assert.match(event.rawPayloadHash, HASH_RE, `${event.source}: hash payload invalide`);
  assertOptionalUrl(event.imageUrl, `${event.source}: imageUrl`);
  assertOptionalIsoDate(event.sourcePublishedAt, `${event.source}: sourcePublishedAt`);
  assertOptionalIsoDate(event.sourceUpdatedAt, `${event.source}: sourceUpdatedAt`);
}

test(
  "real nearby agenda sources satisfy the collection contract",
  { timeout: 120_000 },
  async () => {
    const result = await collectNearbyAgendaEvents({ days: 45, start: new Date() });
    const statsBySource = new Map(result.stats.map((stat) => [stat.source, stat]));

    for (const source of HYERES_AREA_COLLECTIBLE_SOURCE_IDS) {
      assert.ok(statsBySource.has(source), `source collectable absente du résultat: ${source}`);
    }
    for (const source of HYERES_AREA_SKIPPED_SOURCE_IDS) {
      assert.ok(statsBySource.has(source), `source ignorée absente du résultat: ${source}`);
    }

    for (const stat of result.stats) assertSourceStatsContract(stat);

    const failedCollectibleSources = HYERES_AREA_COLLECTIBLE_SOURCE_IDS.filter(
      (source) => statsBySource.get(source)?.status !== "success",
    );
    assert.deepEqual(
      failedCollectibleSources,
      [],
      `source(s) collectable(s) en échec: ${failedCollectibleSources.join(", ")}`,
    );

    for (const source of HYERES_AREA_SKIPPED_SOURCE_IDS) {
      assert.equal(statsBySource.get(source)?.status, "skipped", `${source} doit rester skipped`);
    }

    for (const event of result.events) assertEventContract(event);

    const sourceSummary = result.stats.map((stat) => ({
      source: stat.source,
      status: stat.status,
      rawItemsSeen: stat.rawItemsSeen ?? null,
      eventsSeen: stat.eventsSeen,
      eventsRejected: stat.eventsRejected ?? null,
      requestUrls: stat.requestUrls?.length ?? 0,
      errorMessage: stat.errorMessage ?? null,
    }));
    console.log(JSON.stringify({ events: result.events.length, sourceSummary }, null, 2));
  },
);
