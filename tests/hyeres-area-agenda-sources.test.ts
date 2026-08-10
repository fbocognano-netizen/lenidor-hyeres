import test from "node:test";
import assert from "node:assert/strict";

import {
  cityFromText,
  eventFromProvenceMedAgendaHtml,
  eventsFromWordPressApiItems,
  extractFrenchDates,
  linksFromHtml,
  normalizeAgendaCategory,
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
  assert.equal(normalizeCategory("Port"), "animation");
  assert.equal(normalizeCategory("Manifestations"), "animation");
});

test("normalizes agenda categories through source category then title fallback", () => {
  assert.equal(
    normalizeAgendaCategory({
      sourceCategory: "Manifestations",
      title: "En Septembre, au cinéma Francis Weber",
    }),
    "cinema",
  );
  assert.equal(
    normalizeAgendaCategory({
      sourceCategory: null,
      title: "Concert hommage aux Beatles",
    }),
    "musique",
  );
  assert.equal(
    normalizeAgendaCategory({
      sourceCategory: "Manifestations",
      title: "Grande animation d'été",
    }),
    "animation",
  );
  assert.equal(
    normalizeAgendaCategory({
      sourceCategory: "Port",
      title: "Rendez-vous au port",
    }),
    "animation",
  );
});

test("detects canonical city names from source text", () => {
  assert.equal(cityFromText("Grand bal au Lavandou", "Toulon"), "Le Lavandou");
  assert.equal(
    cityFromText("Festival Théâtre Poquelin à La Seyne-sur-Mer", "Toulon"),
    "La Seyne-sur-Mer",
  );
  assert.equal(
    cityFromText("Balades naturalistes à Six-Fours-les-Plages", "Hyères"),
    "Six-Fours-les-Plages",
  );
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
  assert.deepEqual(
    events.map((event) => event.category),
    ["cinema", "musique", "musique"],
  );
});

test("parses Provence Méditerranée agenda detail pages", () => {
  const event = eventFromProvenceMedAgendaHtml(
    {
      source: "provencemed_wp_api",
      sourceName: "Office de tourisme Provence Méditerranée - API agenda",
      endpointUrl: "https://www.provencemed.com/wp-json/wp/v2/agenda",
      defaultCity: "Hyères",
    },
    {
      id: 7428608,
      date: "2026-08-10T04:36:33",
      modified: "2026-08-10T07:31:41",
      link: "https://www.provencemed.com/agenda/cine-plein-air-terra-willy-planete-inconnue-7428608/",
      title: { rendered: "Fallback title" },
    },
    `
      <section class="hero agenda">
        <p class="hero__categories">Projection</p>
        <h1 class="hero__title" data-syndic-object-id="FMAPROV500OM7">
          Ciné plein air – “Terra Willy – Planète inconnue”
        </h1>
        <p class="hero__location">Six-Fours-les-Plages</p>
        <div class="hero__description">
          <p>Séance en plein air.</p>
        </div>
      </section>
      <section class="infos-agenda container">
        <div class="date-sticker type-1">
          <div class="start"><span class="day">10</span><span class="month">août</span><span class="year">2026</span></div>
        </div>
        Lundi 10 août 2026 à 21h.
      </section>
      <p class="contact-map__address">
        <span>Place des Poilus</span>
        <span>83140 Six-Fours-les-Plages</span>
      </p>
    `,
    "2026-08-09",
    "2026-09-22",
  );

  assert.ok(event);
  assert.equal(event.title, "Ciné plein air – “Terra Willy – Planète inconnue”");
  assert.equal(event.category, "cinema");
  assert.equal(event.sourceCategory, "Projection");
  assert.equal(event.city, "Six-Fours-les-Plages");
  assert.deepEqual(event.occurrenceDates, ["2026-08-10"]);
  assert.equal(event.address, "Place des Poilus 83140 Six-Fours-les-Plages");
});
