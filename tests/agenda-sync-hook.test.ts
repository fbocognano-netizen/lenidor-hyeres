import test from "node:test";
import assert from "node:assert/strict";

import { shouldSkipLovableAgendaSync } from "../src/routes/api/public/hooks/agenda-sync.ts";

test("skips Lovable agenda sync when a completed run is recent", () => {
  const now = new Date("2026-08-10T02:15:00.000Z");

  assert.equal(
    shouldSkipLovableAgendaSync("2026-08-09T02:15:00.000Z", now),
    true,
  );
});

test("allows Lovable agenda sync after roughly two days", () => {
  const now = new Date("2026-08-10T02:15:00.000Z");

  assert.equal(
    shouldSkipLovableAgendaSync("2026-08-08T02:15:00.000Z", now),
    false,
  );
});

test("allows Lovable agenda sync when previous completion date is missing or invalid", () => {
  const now = new Date("2026-08-10T02:15:00.000Z");

  assert.equal(shouldSkipLovableAgendaSync(null, now), false);
  assert.equal(shouldSkipLovableAgendaSync("not-a-date", now), false);
});
