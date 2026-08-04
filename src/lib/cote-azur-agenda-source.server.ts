const API_ORIGIN = "https://api.tourism-system.com";
const PLAYLIST_PATH = "/api/render/website_v2/cotedazur-france/playlist/42840/fr_FR/json";
const RANDOM_SEED = "15f75ea3-6c27-4187-8c48-3b439b467403";
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 2_000_000;
const MAX_PAGES = 4;

type CoteAzurApiDate = { start?: { startDate?: string }; end?: { endDate?: string } };
type CoteAzurApiItem = { sheetId?: string; title?: string; type?: string; link?: string; town?: string; address?: string; description?: string; dates?: CoteAzurApiDate[] };
type CoteAzurApiResponse = { items?: CoteAzurApiItem[]; lastPage?: number };

export type CoteAzurAgendaEvent = {
  sourceEventId: string;
  sourceUrl: string;
  title: string;
  type: string | null;
  town: string | null;
  address: string | null;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
};

function ensureCoteAzurUrl(value: string): string | null {
  try {
    const url = new URL(value, API_ORIGIN);
    if (url.protocol !== "https:" || url.hostname !== "cotedazurfrance.fr" || !url.pathname.startsWith("/offres/")) return null;
    return url.href;
  } catch { return null; }
}

function parseDate(value: string | undefined): string | null {
  const match = value?.match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? null;
}

function overlapsRange(item: CoteAzurAgendaEvent, startDate: string, endDate: string): boolean {
  return Boolean(item.startsAt && item.startsAt <= endDate && (item.endsAt ?? item.startsAt) >= startDate);
}

async function getPlaylistPage(page: number): Promise<CoteAzurApiResponse> {
  const url = new URL(PLAYLIST_PATH, API_ORIGIN);
  url.search = new URLSearchParams({ page: String(page), randomSeed: RANDOM_SEED }).toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "LeNidOrAgenda/1.0" }, signal: controller.signal });
    if (!response.ok) throw new Error(`Côte d'Azur France a répondu ${response.status}.`);
    const body = await response.text();
    if (body.length > MAX_RESPONSE_BYTES) throw new Error("La réponse de Côte d'Azur France est trop volumineuse.");
    return JSON.parse(body) as CoteAzurApiResponse;
  } finally { clearTimeout(timeout); }
}

export async function getCoteAzurAgendaEvents(startDate: string, endDate: string): Promise<CoteAzurAgendaEvent[]> {
  const firstPage = await getPlaylistPage(1);
  const pages = Math.min(firstPage.lastPage ?? 1, MAX_PAGES);
  const responses = await Promise.all([Promise.resolve(firstPage), ...Array.from({ length: Math.max(0, pages - 1) }, (_, index) => getPlaylistPage(index + 2))]);
  const events = responses.flatMap((response) => response.items ?? []).flatMap((item) => {
    const sourceUrl = item.link ? ensureCoteAzurUrl(item.link) : null;
    const title = item.title?.trim();
    if (!sourceUrl || !title || !item.sheetId) return [];
    const dates = item.dates ?? [];
    const startsAt = dates.map((date) => parseDate(date.start?.startDate)).filter((date): date is string => date !== null).sort().at(0) ?? null;
    const endsAt = dates.map((date) => parseDate(date.end?.endDate) ?? parseDate(date.start?.startDate)).filter((date): date is string => date !== null).sort().at(-1) ?? null;
    return [{ sourceEventId: item.sheetId, sourceUrl, title, type: item.type?.trim() || null, town: item.town?.trim() || null, address: item.address?.replace(/\s+/g, " ").trim() || null, description: item.description?.replace(/\s+/g, " ").trim() || null, startsAt, endsAt }];
  });
  return Array.from(new Map(events.map((event) => [event.sourceUrl, event])).values()).filter((event) => overlapsRange(event, startDate, endDate));
}
