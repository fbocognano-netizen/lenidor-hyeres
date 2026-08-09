import test from "node:test";
import assert from "node:assert/strict";

import {
  decodeHtml,
  locationLabel,
  normalizeLocationSlug,
} from "../src/lib/hyeres-agenda.server.ts";

test("keeps port as the canonical Hyeres port location", () => {
  assert.equal(normalizeLocationSlug("port"), "port");
  assert.equal(locationLabel("port"), "Port");
  assert.notEqual(normalizeLocationSlug("port"), "airport");
});

test("decodes official Hyeres agenda text", () => {
  assert.equal(decodeHtml("Concert &amp; Feu d&#8217;artifice"), "Concert & Feu d'artifice");
});
