import { createHash } from "node:crypto";

import { type CityAgendaEvent, getCityAgendaPreview, locationLabel } from "./hyeres-agenda.server";

const REQUEST_TIMEOUT_MS = 25_000;
const MAX_RESPONSE_BYTES = 5_000_000;
const MAX_RANGE_DAYS = 120;

export const HYERES_AREA_CITIES = [
  "Hyères",
  "La Londe-les-Maures",
  "Le Lavandou",
  "Bormes-les-Mimosas",
  "Carqueiranne",
  "Le Pradet",
  "La Garde",
  "La Crau",
  "Toulon",
  "La Farlède",
  "Pierrefeu-du-Var",
  "Solliès-Ville",
  "Solliès-Pont",
  "Solliès-Toucas",
] as const;

type SupportedCity = (typeof HYERES_AREA_CITIES)[number];

export type AreaAgendaEvent = {
  source: string;
  sourceName: string;
  sourceEventId: string;
  sourceUrl: string;
  canonicalUrl: string | null;
  title: string;
  category: string | null;
  sourceCategory: string | null;
  city: SupportedCity;
  locationSlug: string | null;
  locationLabel: string | null;
  address: string | null;
  scheduleText: string | null;
  imageUrl: string | null;
  priceText: string | null;
  sourcePublishedAt: string | null;
  sourceUpdatedAt: string | null;
  occurrenceDates: string[];
  rawPayloadHash: string;
};

export type AreaAgendaSourceStats = {
  source: string;
  sourceName: string;
  status: "success" | "failed";
  eventsSeen: number;
  errorMessage?: string;
};

export type AreaAgendaCollectionResult = {
  events: AreaAgendaEvent[];
  stats: AreaAgendaSourceStats[];
};

type RssSource = {
  source: string;
  sourceName: string;
  feedUrl: string;
  defaultCity: SupportedCity;
  eventOnly: boolean;
  linkNeedle?: string;
};

type HtmlLinkSource = {
  source: string;
  sourceName: string;
  pageUrl: string;
  defaultCity: SupportedCity;
  linkPattern: RegExp;
  maxLinks: number;
};

type RssItem = {
  title: string;
  link: string;
  guid: string | null;
  description: string | null;
  content: string | null;
  category: string | null;
  pubDate: string | null;
  eventStart: string | null;
  eventEnd: string | null;
  raw: string;
};

const RSS_SOURCES: RssSource[] = [
  {
    source: "hyeres_rss",
    sourceName: "Ville d'Hyères - Flux agenda",
    feedUrl: "https://hyeres.fr/agenda-hyeres/feed/",
    defaultCity: "Hyères",
    eventOnly: true,
  },
  {
    source: "carqueiranne_rss",
    sourceName: "Ville de Carqueiranne - Flux agenda",
    feedUrl: "https://www.carqueiranne.fr/agenda-133/flux-rss.xml",
    defaultCity: "Carqueiranne",
    eventOnly: true,
  },
  {
    source: "la_londe_rss",
    sourceName: "Ville de La Londe-les-Maures - Flux agenda",
    feedUrl: "https://www.ville-lalondelesmaures.fr/culture-et-sport/agenda.feed?type=rss",
    defaultCity: "La Londe-les-Maures",
    eventOnly: true,
  },
  {
    source: "le_pradet_rss",
    sourceName: "Ville du Pradet - Flux général",
    feedUrl: "https://www.le-pradet.fr/feed/",
    defaultCity: "Le Pradet",
    eventOnly: false,
    linkNeedle: "/evenement/",
  },
  {
    source: "la_garde_rss",
    sourceName: "Ville de La Garde - Flux agenda",
    feedUrl: "https://www.ville-lagarde.fr/agenda/rss",
    defaultCity: "La Garde",
    eventOnly: true,
  },
  {
    source: "pierrefeu_rss",
    sourceName: "Ville de Pierrefeu-du-Var - Flux événements",
    feedUrl: "https://www.pierrefeu-du-var.fr/feed/rss-evenements",
    defaultCity: "Pierrefeu-du-Var",
    eventOnly: true,
  },
  {
    source: "bormes_rss",
    sourceName: "Office de tourisme de Bormes-les-Mimosas - Flux agenda",
    feedUrl: "https://www.bormeslesmimosas.com/agenda/feed/",
    defaultCity: "Bormes-les-Mimosas",
    eventOnly: true,
  },
];

const HTML_LINK_SOURCES: HtmlLinkSource[] = [
  {
    source: "lavandou_html",
    sourceName: "Office de tourisme du Lavandou - Agenda",
    pageUrl: "https://www.ot-lelavandou.fr/agenda-lavandou/tout-lagenda/",
    defaultCity: "Le Lavandou",
    linkPattern: /\/agenda-fetes-animations-lelavandou\//,
    maxLinks: 40,
  },
  {
    source: "la_farlede_html",
    sourceName: "Ville de La Farlède - Agenda",
    pageUrl: "https://www.lafarlede.fr/mes-loisirs/agenda/",
    defaultCity: "La Farlède",
    linkPattern: /\/agenda\//,
    maxLinks: 30,
  },
  {
    source: "bormes_html",
    sourceName: "Office de tourisme de Bormes-les-Mimosas - Agenda",
    pageUrl: "https://www.bormeslesmimosas.com/agenda/tout-lagenda/",
    defaultCity: "Bormes-les-Mimosas",
    linkPattern: /\/fetes-et-manifestations\//,
    maxLinks: 40,
  },
  {
    source: "toulon_html",
    sourceName: "Ville de Toulon - Agenda",
    pageUrl: "https://www.toulon.fr/agenda",
    defaultCity: "Toulon",
    linkPattern: /\/agenda\//,
    maxLinks: 40,
  },
];

const UNSUPPORTED_SOURCES: AreaAgendaSourceStats[] = [
  {
    source: "la_crau_pdf",
    sourceName: "Ville de La Crau - Agenda PDF",
    status: "failed",
    eventsSeen: 0,
    errorMessage:
      "Source officielle surtout PDF mensuel : extraction PDF non activée dans cette version.",
  },
  {
    source: "sollies_area",
    sourceName: "Solliès-Pont, Solliès-Toucas, Solliès-Ville",
    status: "failed",
    eventsSeen: 0,
    errorMessage: "Sources communales à confirmer avant automatisation.",
  },
];

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeCategory(value: string | null): string | null {
  if (!value) return null;
  const normalized = normalizeText(value)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!normalized) return null;
  if (["projection", "cinema", "film", "cinema_projection"].includes(normalized)) return "cinema";
  if (["concert", "musique", "live", "dj", "festival_musique"].includes(normalized))
    return "musique";
  if (["exposition", "expo", "culture"].includes(normalized)) return "exposition";
  if (["visite", "visites", "sortie", "sorties", "visites_sorties"].includes(normalized))
    return "visites_sorties";
  if (["spectacle", "theatre", "theatre_spectacle"].includes(normalized)) return "spectacle";
  if (normalized.includes("sport")) return "sport";
  if (normalized.includes("marche")) return "marche";
  return normalized;
}

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function decodeHtml(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:8217|039);/gi, "'")
    .replace(/&#038;/gi, "&")
    .replace(/&rsquo;/gi, "'")
    .replace(/&eacute;/gi, "é")
    .replace(/&egrave;/gi, "è")
    .replace(/&ecirc;/gi, "ê")
    .replace(/&agrave;/gi, "à")
    .replace(/&ocirc;/gi, "ô")
    .replace(/&uuml;/gi, "ü")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function stripHtml(value: string | null | undefined): string {
  return decodeHtml(
    (value ?? "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  );
}

function tagValue(xml: string, tag: string): string | null {
  const escaped = tag.replace(":", "\\:");
  const match = xml.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i"));
  return match?.[1]?.trim() ?? null;
}

function parseRssItems(xml: string): RssItem[] {
  return Array.from(xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)).map((match) => {
    const raw = match[0];
    return {
      title: decodeHtml(tagValue(raw, "title")),
      link: decodeHtml(tagValue(raw, "link")),
      guid: decodeHtml(tagValue(raw, "guid")) || null,
      description: tagValue(raw, "description"),
      content: tagValue(raw, "content:encoded"),
      category: decodeHtml(tagValue(raw, "category")) || null,
      pubDate: decodeHtml(tagValue(raw, "pubDate")) || null,
      eventStart: decodeHtml(tagValue(raw, "ev:startdate")) || null,
      eventEnd: decodeHtml(tagValue(raw, "ev:enddate")) || null,
      raw,
    };
  });
}

async function fetchText(url: string, accept = "text/html,application/xml,application/rss+xml") {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { Accept: accept, "User-Agent": "LeNidOrAgenda/1.0" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`${url} a répondu ${response.status}.`);
    const body = await response.text();
    if (body.length > MAX_RESPONSE_BYTES)
      throw new Error(`${url} a renvoyé une réponse trop volumineuse.`);
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

function isoDateFromAny(value: string | null): string | null {
  if (!value) return null;
  const direct = value.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (direct) return `${direct[1]}-${direct[2]}-${direct[3]}`;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

function datesBetween(start: string, end: string): string[] {
  const startDate = new Date(`${start}T12:00:00Z`);
  const endDate = new Date(`${end}T12:00:00Z`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate < startDate) {
    return [start];
  }
  const days = Math.min(
    MAX_RANGE_DAYS,
    Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1,
  );
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(startDate.getTime() + index * 86_400_000);
    return date.toISOString().slice(0, 10);
  });
}

function extractFrenchDates(text: string, yearHint: number): string[] {
  const monthByName: Record<string, string> = {
    janvier: "01",
    fevrier: "02",
    février: "02",
    mars: "03",
    avril: "04",
    mai: "05",
    juin: "06",
    juillet: "07",
    aout: "08",
    août: "08",
    septembre: "09",
    octobre: "10",
    novembre: "11",
    decembre: "12",
    décembre: "12",
  };
  const dates = new Set<string>();
  const normalized = text.replace(/\s+/g, " ");
  for (const match of normalized.matchAll(
    /\bdu\s+(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2})\s+au\s+(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2})\b/gi,
  )) {
    for (const date of datesBetween(
      `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`,
      `${match[6]}-${match[5].padStart(2, "0")}-${match[4].padStart(2, "0")}`,
    )) {
      dates.add(date);
    }
  }
  for (const match of normalized.matchAll(
    /\bdu\s+(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\s+au\s+(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)(?:\s+(20\d{2}))?\b/gi,
  )) {
    const year = match[5] ?? String(yearHint);
    for (const date of datesBetween(
      `${year}-${monthByName[match[2].toLowerCase()]}-${match[1].padStart(2, "0")}`,
      `${year}-${monthByName[match[4].toLowerCase()]}-${match[3].padStart(2, "0")}`,
    )) {
      dates.add(date);
    }
  }
  for (const match of normalized.matchAll(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](20\d{2}))?\b/g)) {
    const day = match[1].padStart(2, "0");
    const month = match[2].padStart(2, "0");
    const year = match[3] ?? String(yearHint);
    dates.add(`${year}-${month}-${day}`);
  }
  for (const match of normalized.matchAll(
    /\b(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)(?:\s+(20\d{2}))?\b/gi,
  )) {
    const day = match[1].padStart(2, "0");
    const month = monthByName[match[2].toLowerCase()];
    const year = match[3] ?? String(yearHint);
    dates.add(`${year}-${month}-${day}`);
  }
  return Array.from(dates).sort();
}

function inRange(dates: string[], rangeStart: string, rangeEnd: string): string[] {
  return dates.filter((date) => date >= rangeStart && date <= rangeEnd);
}

function cityFromText(text: string, fallback: SupportedCity): SupportedCity {
  const normalized = normalizeText(text);
  for (const city of HYERES_AREA_CITIES) {
    const cityNeedle = normalizeText(city).replace(/-/g, " ");
    if (normalized.includes(cityNeedle)) return city;
  }
  if (/\blavandou\b/.test(normalized)) return "Le Lavandou";
  if (/\blonde\b/.test(normalized)) return "La Londe-les-Maures";
  if (/\bpradet\b/.test(normalized)) return "Le Pradet";
  if (/\bcarqueiranne\b/.test(normalized)) return "Carqueiranne";
  if (/\bhyeres\b/.test(normalized)) return "Hyères";
  return fallback;
}

function shortText(value: string, maxLength = 700): string | null {
  const clean = value.replace(/\s+/g, " ").trim();
  if (!clean) return null;
  return clean.length > maxLength ? `${clean.slice(0, maxLength - 1).trimEnd()}…` : clean;
}

function firstImage(value: string): string | null {
  const match = value.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] ?? null;
}

function enclosureImage(value: string): string | null {
  const match = value.match(
    /<enclosure[^>]+url=["']([^"']+)["'][^>]*(?:type=["']image\/[^"']+["'])?[^>]*\/?>/i,
  );
  return match?.[1] ?? firstImage(value);
}

function canonicalLink(value: string, baseUrl: string): string | null {
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return null;
  }
}

function eventFingerprint(
  event: Pick<AreaAgendaEvent, "title" | "city" | "locationLabel" | "occurrenceDates">,
): string {
  return [
    normalizeText(event.title)
      .replace(/[^a-z0-9]+/g, " ")
      .trim(),
    event.occurrenceDates[0] ?? "",
    normalizeText(event.city),
    normalizeText(event.locationLabel ?? ""),
  ].join("|");
}

export function agendaEventFingerprint(event: AreaAgendaEvent): string {
  return eventFingerprint(event);
}

async function collectRssSource(
  source: RssSource,
  rangeStart: string,
  rangeEnd: string,
): Promise<AreaAgendaEvent[]> {
  const xml = await fetchText(source.feedUrl, "application/rss+xml,application/xml,text/xml");
  const yearHint = Number(rangeStart.slice(0, 4));
  return parseRssItems(xml).flatMap((item) => {
    if (!item.title || !item.link) return [];
    if (
      !source.eventOnly &&
      source.linkNeedle &&
      !new URL(item.link).pathname.includes(source.linkNeedle)
    )
      return [];

    const descriptionHtml = item.content ?? item.description ?? "";
    const descriptionText = stripHtml(descriptionHtml);
    const start = isoDateFromAny(item.eventStart);
    const end = isoDateFromAny(item.eventEnd) ?? start;
    const parsedDates = start
      ? datesBetween(start, end ?? start)
      : extractFrenchDates([item.title, descriptionText, item.pubDate ?? ""].join(" "), yearHint);
    const occurrenceDates = inRange(parsedDates, rangeStart, rangeEnd);
    if (occurrenceDates.length === 0) return [];

    const sourceUrl = canonicalLink(item.link, source.feedUrl);
    if (!sourceUrl) return [];
    const city = cityFromText(
      [item.title, descriptionText, source.defaultCity].join(" "),
      source.defaultCity,
    );
    const category = normalizeCategory(item.category);
    const event: AreaAgendaEvent = {
      source: source.source,
      sourceName: source.sourceName,
      sourceEventId: item.guid || sourceUrl,
      sourceUrl,
      canonicalUrl: sourceUrl,
      title: item.title,
      category,
      sourceCategory: item.category,
      city,
      locationSlug: null,
      locationLabel: city,
      address: null,
      scheduleText: shortText(descriptionText),
      imageUrl: enclosureImage(item.raw) ?? firstImage(descriptionHtml),
      priceText: null,
      sourcePublishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : null,
      sourceUpdatedAt: item.pubDate ? new Date(item.pubDate).toISOString() : null,
      occurrenceDates,
      rawPayloadHash: hash(item.raw),
    };
    return [event];
  });
}

function titleFromHtml(html: string): string {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const title = h1 ?? html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  return stripHtml(title)
    .replace(/\s+[-|].*$/, "")
    .trim();
}

function linksFromHtml(html: string, pageUrl: string, pattern: RegExp, maxLinks: number): string[] {
  const urls = new Set<string>();
  for (const match of html.matchAll(/<a\b[^>]+href=["']([^"']+)["'][^>]*>/gi)) {
    const href = decodeHtml(match[1]);
    const url = canonicalLink(href, pageUrl);
    if (url && pattern.test(new URL(url).pathname)) urls.add(url);
    if (urls.size >= maxLinks) break;
  }
  return Array.from(urls);
}

async function collectHtmlLinkSource(
  source: HtmlLinkSource,
  rangeStart: string,
  rangeEnd: string,
): Promise<AreaAgendaEvent[]> {
  const listHtml = await fetchText(source.pageUrl);
  const links = linksFromHtml(listHtml, source.pageUrl, source.linkPattern, source.maxLinks);
  const yearHint = Number(rangeStart.slice(0, 4));
  const events: AreaAgendaEvent[] = [];

  for (const sourceUrl of links) {
    try {
      const html = await fetchText(sourceUrl);
      const text = stripHtml(html);
      const occurrenceDates = inRange(extractFrenchDates(text, yearHint), rangeStart, rangeEnd);
      if (occurrenceDates.length === 0) continue;
      const title = titleFromHtml(html);
      if (!title) continue;
      const city = cityFromText(text, source.defaultCity);
      const category =
        html.match(/rel=["']category tag["'][^>]*>([\s\S]*?)<\/a>/i)?.[1] ??
        html.match(/class=["'][^"']*category[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/i)?.[1] ??
        null;
      events.push({
        source: source.source,
        sourceName: source.sourceName,
        sourceEventId: sourceUrl,
        sourceUrl,
        canonicalUrl: sourceUrl,
        title,
        category: normalizeCategory(stripHtml(category)),
        sourceCategory: stripHtml(category) || null,
        city,
        locationSlug: null,
        locationLabel: city,
        address: null,
        scheduleText: shortText(text),
        imageUrl: firstImage(html),
        priceText: null,
        sourcePublishedAt: null,
        sourceUpdatedAt: null,
        occurrenceDates,
        rawPayloadHash: hash(html),
      });
    } catch {
      continue;
    }
  }

  return events;
}

async function collectHyeresOfficial(days: number, start: Date): Promise<AreaAgendaEvent[]> {
  const preview = await getCityAgendaPreview(days, start);
  const bySourceId = new Map<
    string,
    {
      event: CityAgendaEvent;
      dates: Set<string>;
    }
  >();
  for (const day of preview.days) {
    for (const card of day.cards) {
      const event = preview.eventsByUrl.get(card.sourceUrl);
      if (!event) continue;
      const entry = bySourceId.get(event.sourceEventId) ?? { event, dates: new Set<string>() };
      entry.dates.add(day.date);
      bySourceId.set(event.sourceEventId, entry);
    }
  }
  return Array.from(bySourceId.values()).map(({ event, dates }) => ({
    source: "hyeres",
    sourceName: "Ville d'Hyères - Agenda officiel",
    sourceEventId: event.sourceEventId,
    sourceUrl: event.sourceUrl,
    canonicalUrl: event.sourceUrl,
    title: event.title,
    category: normalizeCategory(event.category),
    sourceCategory: event.category,
    city: "Hyères",
    locationSlug: event.locationSlug,
    locationLabel: locationLabel(event.locationSlug) ?? "Hyères",
    address: null,
    scheduleText: shortText(event.scheduleText ?? ""),
    imageUrl: null,
    priceText: null,
    sourcePublishedAt: event.sourcePublishedAt,
    sourceUpdatedAt: event.sourceUpdatedAt,
    occurrenceDates: Array.from(dates).sort(),
    rawPayloadHash: hash(JSON.stringify(event)),
  }));
}

export async function collectHyeresAreaAgendaEvents(options: {
  days: number;
  start: Date;
}): Promise<AreaAgendaCollectionResult> {
  const startDate = new Date(
    Date.UTC(
      options.start.getUTCFullYear(),
      options.start.getUTCMonth(),
      options.start.getUTCDate(),
    ),
  );
  const rangeStart = startDate.toISOString().slice(0, 10);
  const rangeEnd = new Date(startDate.getTime() + (options.days - 1) * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const collectors: Array<{
    source: string;
    sourceName: string;
    collect: () => Promise<AreaAgendaEvent[]>;
  }> = [
    {
      source: "hyeres",
      sourceName: "Ville d'Hyères - Agenda officiel",
      collect: () => collectHyeresOfficial(options.days, options.start),
    },
    ...RSS_SOURCES.filter((source) => source.source !== "hyeres_rss").map((source) => ({
      source: source.source,
      sourceName: source.sourceName,
      collect: () => collectRssSource(source, rangeStart, rangeEnd),
    })),
    ...HTML_LINK_SOURCES.map((source) => ({
      source: source.source,
      sourceName: source.sourceName,
      collect: () => collectHtmlLinkSource(source, rangeStart, rangeEnd),
    })),
    {
      source: "hyeres_rss",
      sourceName: "Ville d'Hyères - Flux agenda",
      collect: () => collectRssSource(RSS_SOURCES[0], rangeStart, rangeEnd),
    },
  ];

  const events: AreaAgendaEvent[] = [];
  const stats: AreaAgendaSourceStats[] = [];
  for (const collector of collectors) {
    try {
      const sourceEvents = await collector.collect();
      events.push(...sourceEvents);
      stats.push({
        source: collector.source,
        sourceName: collector.sourceName,
        status: "success",
        eventsSeen: sourceEvents.length,
      });
    } catch (error) {
      stats.push({
        source: collector.source,
        sourceName: collector.sourceName,
        status: "failed",
        eventsSeen: 0,
        errorMessage: error instanceof Error ? error.message.slice(0, 300) : "Erreur inconnue",
      });
    }
  }

  return {
    events: Array.from(
      new Map(events.map((event) => [`${event.source}:${event.sourceEventId}`, event])).values(),
    ),
    stats: [...stats, ...UNSUPPORTED_SOURCES],
  };
}
