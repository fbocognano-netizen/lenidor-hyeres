// Récupération de l'agenda officiel de la Ville d'Hyères (WordPress).
// Serveur uniquement : appelé par la synchronisation planifiée et le déclenchement admin.

const CITY_ORIGIN = "https://hyeres.fr";
const CITY_AGENDA_PATH = "/agenda-hyeres/";
const CITY_EVENTS_PATH = "/wp-json/wp/v2/evenement";
const REQUEST_TIMEOUT_MS = 25_000;
const DAY_CONCURRENCY = 5;
const MAX_RESPONSE_BYTES = 4_000_000;

export type CityAgendaCard = {
  sourceUrl: string;
  title: string;
};

export type CityAgendaEvent = {
  sourceEventId: string;
  sourceUrl: string;
  title: string;
  category: string | null;
  locationSlug: string | null;
  scheduleText: string | null;
  sourcePublishedAt: string | null;
  sourceUpdatedAt: string | null;
};

type WordPressEvent = {
  id: number;
  date?: string;
  modified?: string;
  link?: string;
  title?: { rendered?: string };
  content?: { rendered?: string };
  class_list?: string[];
};

function formatCityDate(value: Date): string {
  const day = String(value.getUTCDate()).padStart(2, "0");
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  return `${day}${month}${value.getUTCFullYear()}`;
}

export function decodeHtml(value: string): string {
  return value
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
    .replace(/&#\d+;/g, (entity) => String.fromCodePoint(Number(entity.slice(2, -1))))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ensureCityEventUrl(value: string): string | null {
  try {
    const url = new URL(value, CITY_ORIGIN);
    if (url.origin !== CITY_ORIGIN || !url.pathname.startsWith("/agenda/")) return null;
    return url.href;
  } catch {
    return null;
  }
}

async function fetchCityText(path: string, searchParams: URLSearchParams): Promise<string> {
  const url = new URL(path, CITY_ORIGIN);
  url.search = searchParams.toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { Accept: "text/html,application/json", "User-Agent": "LeNidOrAgenda/1.0" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`La Ville a répondu ${response.status}.`);
    const body = await response.text();
    if (body.length > MAX_RESPONSE_BYTES)
      throw new Error("La réponse de la Ville est trop volumineuse.");
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getCityAgendaCardsForDay(day: Date): Promise<CityAgendaCard[]> {
  const cityDate = formatCityDate(day);
  const html = await fetchCityText(
    CITY_AGENDA_PATH,
    new URLSearchParams({ _sfm_event_date_deb: `${cityDate} ${cityDate}` }),
  );

  const cards: CityAgendaCard[] = [];
  const pattern = /<h2><a class="post-link stretched-link" href="([^"]+)">([\s\S]*?)<\/a><\/h2>/g;
  for (const match of html.matchAll(pattern)) {
    const sourceUrl = ensureCityEventUrl(decodeHtml(match[1] ?? ""));
    const title = decodeHtml(match[2] ?? "");
    if (sourceUrl && title) cards.push({ sourceUrl, title });
  }

  return Array.from(new Map(cards.map((card) => [card.sourceUrl, card])).values());
}

function classValue(values: string[] | undefined, prefix: string): string | null {
  const value = values?.find((item) => item.startsWith(prefix));
  return value ? value.slice(prefix.length) : null;
}

export async function getCityAgendaEvents(): Promise<CityAgendaEvent[]> {
  const events: WordPressEvent[] = [];
  for (let page = 1; page <= 20; page += 1) {
    const body = await fetchCityText(
      CITY_EVENTS_PATH,
      new URLSearchParams({ per_page: "100", page: String(page) }),
    );
    const pageEvents = JSON.parse(body) as WordPressEvent[];
    events.push(...pageEvents);
    if (pageEvents.length < 100) break;
  }

  return events.flatMap((event) => {
    const sourceUrl = event.link ? ensureCityEventUrl(event.link) : null;
    const title = decodeHtml(event.title?.rendered ?? "");
    if (!sourceUrl || !title || !Number.isInteger(event.id)) return [];
    return [
      {
        sourceEventId: String(event.id),
        sourceUrl,
        title,
        category: classValue(event.class_list, "type-evenement-"),
        locationSlug: classValue(event.class_list, "lieux-evenement-"),
        scheduleText: decodeHtml(event.content?.rendered ?? "") || null,
        sourcePublishedAt: event.date ? new Date(event.date).toISOString() : null,
        sourceUpdatedAt: event.modified ? new Date(event.modified).toISOString() : null,
      },
    ];
  });
}

export async function getCityAgendaPreview(
  days: number,
  start = new Date(),
): Promise<{
  startDate: string;
  endDate: string;
  days: Array<{ date: string; cards: CityAgendaCard[] }>;
  eventsByUrl: Map<string, CityAgendaEvent>;
}> {
  const startDate = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
  );
  const dates = Array.from(
    { length: days },
    (_, index) => new Date(startDate.getTime() + index * 86_400_000),
  );
  const cardsByDay: Array<{ date: string; cards: CityAgendaCard[] }> = [];
  for (let index = 0; index < dates.length; index += DAY_CONCURRENCY) {
    const batch = dates.slice(index, index + DAY_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (date) => ({
        date: date.toISOString().slice(0, 10),
        cards: await getCityAgendaCardsForDay(date).catch(() => [] as CityAgendaCard[]),
      })),
    );
    cardsByDay.push(...results);
  }
  const cityEvents = await getCityAgendaEvents();
  return {
    startDate: dates[0]?.toISOString().slice(0, 10) ?? "",
    endDate: dates.at(-1)?.toISOString().slice(0, 10) ?? "",
    days: cardsByDay,
    eventsByUrl: new Map(cityEvents.map((event) => [event.sourceUrl, event])),
  };
}

export function normalizeLocationSlug(value: string | null): string | null {
  if (value === "port") return "airport";
  return value;
}

export function locationLabel(value: string | null): string | null {
  const normalized = normalizeLocationSlug(value);
  if (!normalized) return null;
  return normalized
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
