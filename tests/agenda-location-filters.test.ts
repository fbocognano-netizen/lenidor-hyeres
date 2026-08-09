import test from "node:test";
import assert from "node:assert/strict";

import {
  LOCATION_FILTERS,
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
