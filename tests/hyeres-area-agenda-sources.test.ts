import test from "node:test";
import assert from "node:assert/strict";

import {
  cityFromText,
  eventsFromWordPressApiItems,
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

test("collects Le Pradet official WordPress agenda events", () => {
  const events = eventsFromWordPressApiItems(
    {
      source: "le_pradet_wp_api",
      sourceName: "Ville du Pradet - API agenda",
      endpointUrl: "https://www.le-pradet.fr/wp-json/wp/v2/evenement",
      defaultCity: "Le Pradet",
    },
    [
      {
        id: 28265,
        date: "2026-06-25T15:39:37",
        modified: "2026-06-25T15:39:37",
        link: "https://www.le-pradet.fr/evenement/cinema-plein-air-12-aout/",
        title: { rendered: "Cinéma plein air &#8211; 12 août" },
        content: {
          rendered:
            "La Ville du Pradet vous donne rendez-vous le mardi 12 août à 21h au Parc Cravéro.",
        },
      },
      {
        id: 28267,
        link: "https://www.le-pradet.fr/evenement/bal-du-15-aout-2/",
        title: { rendered: "Bal du 15 août" },
        content: {
          rendered:
            "Les commerçants vous invitent au traditionnel bal, le samedi 15 août 2026 à partir de 18h30.",
        },
      },
      {
        id: 28280,
        link: "https://www.le-pradet.fr/evenement/baleti-des-commercants-25-aout/",
        title: { rendered: "Balèti des commerçants – 25 août" },
        content: { rendered: "Musique, danse et convivialité." },
      },
    ],
    "2026-08-09",
    "2026-09-22",
  );

  assert.deepEqual(
    events.map((event) => [event.title, event.city, event.occurrenceDates]),
    [
      ["Cinéma plein air – 12 août", "Le Pradet", ["2026-08-12"]],
      ["Bal du 15 août", "Le Pradet", ["2026-08-15"]],
      ["Balèti des commerçants – 25 août", "Le Pradet", ["2026-08-25"]],
    ],
  );
});
