import test from "node:test";
import assert from "node:assert/strict";

import { agendaTextMatches, normalizeAgendaSearchText } from "../src/lib/agenda-search.ts";

test("normalizes French agenda searches", () => {
  assert.equal(normalizeAgendaSearchText("au Port d'Hyères"), "port hyeres");
  assert.equal(normalizeAgendaSearchText("  les concerts à la Capte  "), "concerts capte");
});

test("matches location queries with French stopwords", () => {
  assert.equal(agendaTextMatches("Port", "au port"), true);
  assert.equal(agendaTextMatches("Concert au Port d'Hyères", "port hyeres"), true);
  assert.equal(agendaTextMatches("Centre Ville", "au port"), false);
});
