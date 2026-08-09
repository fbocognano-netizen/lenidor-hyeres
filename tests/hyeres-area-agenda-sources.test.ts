import test from "node:test";
import assert from "node:assert/strict";

import {
  cityFromText,
  extractFrenchDates,
  linksFromHtml,
  normalizeCategory,
  parseRssItems,
} from "../src/lib/hyeres-area-agenda-sources.server.ts";

test("extracts French date ranges", () => {
  assert.deepEqual(extractFrenchDates("Du 14 août au 16 août", 2026), [
    "2026-08-14",
    "2026-08-15",
    "2026-08-16",
  ]);
});

test("parses RSS agenda items", () => {
  const items = parseRssItems(`
    <rss><channel><item>
      <title>Concert &amp; marché</title>
      <link>https://example.test/agenda/concert</link>
      <guid>abc</guid>
      <category>Cinéma projection</category>
      <description>Du 14 août au 16 août</description>
      <pubDate>Sat, 08 Aug 2026 10:00:00 GMT</pubDate>
    </item></channel></rss>
  `);

  assert.equal(items.length, 1);
  assert.equal(items[0].title, "Concert & marché");
  assert.equal(items[0].category, "Cinéma projection");
});

test("normalizes source categories without mapping port to airport", () => {
  assert.equal(normalizeCategory("Cinéma projection"), "cinema");
  assert.equal(normalizeCategory("Marchés"), "marche");
  assert.equal(normalizeCategory("Port"), "port");
});

test("detects canonical city names from source text", () => {
  assert.equal(cityFromText("Grand bal au Lavandou", "Toulon"), "Le Lavandou");
});

test("extracts canonical links with source limits", () => {
  const links = linksFromHtml(
    `
      <a href="/agenda/un">Un</a>
      <a href="https://example.test/agenda/deux">Deux</a>
      <a href="/article/trois">Trois</a>
    `,
    "https://example.test/base/",
    /\/agenda\//,
    1,
  );

  assert.deepEqual(links, ["https://example.test/agenda/un"]);
});
