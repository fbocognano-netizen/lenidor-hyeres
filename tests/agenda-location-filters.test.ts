import test from "node:test";
import assert from "node:assert/strict";

import {
  LOCATION_FILTERS,
  buildAgendaLocationOptions,
  normalizeAgendaLocationText,
} from "../src/lib/agenda-location-filters.ts";

const portFilter = LOCATION_FILTERS.find((item) => item.value === "hyeres-port");
const portCrosFilter = LOCATION_FILTERS.find((item) => item.value === "port-cros");

test("matches Hyeres port labels only with the Hyeres port filter", () => {
  assert.ok(portFilter);
  assert.equal(portFilter.matches(normalizeAgendaLocationText("Port")), true);
  assert.equal(portFilter.matches(normalizeAgendaLocationText("Port d'Hyères")), true);
  assert.equal(portFilter.matches(normalizeAgendaLocationText("Port-Cros")), false);
  assert.equal(portFilter.matches(normalizeAgendaLocationText("Port Cros")), false);
});

test("keeps Port-Cros as a separate location filter", () => {
  assert.ok(portCrosFilter);
  assert.equal(portCrosFilter.matches(normalizeAgendaLocationText("Port-Cros")), true);
  assert.equal(portCrosFilter.matches(normalizeAgendaLocationText("Port Cros")), true);
  assert.equal(portCrosFilter.matches(normalizeAgendaLocationText("Port")), false);
});

test("builds sorted filters from all event cities and neighborhoods", () => {
  const options = buildAgendaLocationOptions([
    { city: "Toulon", locationLabel: "Centre-ville" },
    { city: "Hyères", locationLabel: "Port" },
    { city: "Bormes-les-Mimosas", locationLabel: "Bormes-les-Mimosas" },
    { city: "Hyères", locationLabel: "Port-Cros" },
  ]);

  assert.deepEqual(
    options.map((item) => item.label),
    [
      "Tous les lieux",
      "Bormes-les-Mimosas",
      "Hyères",
      "Toulon",
      "Hyères - Port",
      "Hyères - Port-Cros",
      "Toulon - Centre-ville",
    ],
  );
});

test("dynamic city and neighborhood filters match their own events only", () => {
  const options = buildAgendaLocationOptions([
    { city: "Hyères", locationLabel: "Port" },
    { city: "Toulon", locationLabel: "Port" },
  ]);
  const hyeres = options.find((item) => item.label === "Hyères");
  const hyeresPort = options.find((item) => item.label === "Hyères - Port");

  assert.ok(hyeres);
  assert.ok(hyeresPort);
  assert.equal(hyeres.matches({ city: "Hyères", locationLabel: "Centre Ville" }), true);
  assert.equal(hyeres.matches({ city: "Toulon", locationLabel: "Port" }), false);
  assert.equal(hyeresPort.matches({ city: "Hyères", locationLabel: "Port" }), true);
  assert.equal(hyeresPort.matches({ city: "Toulon", locationLabel: "Port" }), false);
});
