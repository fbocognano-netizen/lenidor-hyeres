// Seconde source de l'agenda : API JSON Côte d'Azur France (tourism-system).
// Serveur uniquement. Contrôles stricts de taille, de timeout et de domaine des URLs.

const API_URL =
  "https://api.tourism-system.com/api/render/website_v2/cotedazur-france/playlist/42840/fr_FR/json";
const ALLOWED_OFFER_ORIGIN = "https://cotedazurfrance.fr";
const ALLOWED_OFFER_PREFIX = "/offres/";
const REQUEST_TIMEOUT_MS = 25_000;
const MAX_RESPONSE_BYTES = 4_000_000;
const MAX_PAGES = 30;
const RANDOM_SEED = "42840";

export type CoteAzurEvent = {
  title: string;
  type: string | null;
  sourceUrl: string;
  town: string | null;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
};

type ApiItem = {
  title?: string;
  type?: string;
  link?: string;
  town?: string;
  dates?: Array<{
    start?: { startDate?: string | null } | null;
    end?: { endDate?: string | null } | null;
  }> | null;
};

type ApiPage = {
  items?: ApiItem[];
  currentPage?: number;
  lastPage?: number;
  hasNextPage?: boolean;
};

export function ensureCoteAzurOfferUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.origin !== ALLOWED_OFFER_ORIGIN) return null;
    if (!url.pathname.startsWith(ALLOWED_OFFER_PREFIX)) return null;
    return url.href;
  } catch {
    return null;
  }
}

function isoDay(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

async function fetchPage(page: number): Promise<ApiPage> {
  const url = new URL(API_URL);
  url.searchParams.set("page", String(page));
  url.searchParams.set("randomSeed", RANDOM_SEED);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "LeNidOrAgenda/1.0" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Côte d'Azur a répondu ${response.status}.`);
    const body = await response.text();
    if (body.length > MAX_RESPONSE_BYTES)
      throw new Error("La réponse Côte d'Azur est trop volumineuse.");
    return JSON.parse(body) as ApiPage;
  } finally {
    clearTimeout(timeout);
  }
}

/** Récupère les événements Côte d'Azur chevauchant la fenêtre [rangeStart, rangeEnd]. */
export async function getCoteAzurEvents(
  rangeStart: string,
  rangeEnd: string,
): Promise<CoteAzurEvent[]> {
  const events: CoteAzurEvent[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const data = await fetchPage(page);
    const items = data.items ?? [];

    for (const item of items) {
      const title = (item.title ?? "").trim();
      const sourceUrl = item.link ? ensureCoteAzurOfferUrl(item.link) : null;
      if (!title || !sourceUrl) continue;

      for (const period of item.dates ?? []) {
        const startDate = isoDay(period?.start?.startDate);
        const endDate = isoDay(period?.end?.endDate) ?? startDate;
        if (!startDate || !endDate) continue;
        // Filtre sur la fenêtre de synchronisation (chevauchement d'intervalles).
        if (endDate < rangeStart || startDate > rangeEnd) continue;
        events.push({
          title,
          type: item.type?.trim() || null,
          sourceUrl,
          town: item.town?.trim() || null,
          startDate,
          endDate,
        });
      }
    }

    const lastPage = data.lastPage ?? page;
    if (data.hasNextPage === false || page >= lastPage) break;
  }

  return events;
}

export function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Rapproche un événement de la Ville d'Hyères d'un événement Côte d'Azur
 * par titre (normalisé, exact ou inclusion) et chevauchement de dates.
 */
export function matchCoteAzurEvent(
  cityTitle: string,
  cityDates: Iterable<string>,
  candidates: CoteAzurEvent[],
): CoteAzurEvent | null {
  const target = normalizeTitle(cityTitle);
  if (target.length < 4) return null;
  const dates = Array.from(cityDates).sort();
  if (dates.length === 0) return null;
  const cityStart = dates[0]!;
  const cityEnd = dates.at(-1)!;

  let best: { event: CoteAzurEvent; score: number } | null = null;

  for (const candidate of candidates) {
    if (candidate.endDate < cityStart || candidate.startDate > cityEnd) continue;
    const other = normalizeTitle(candidate.title);
    if (other.length < 4) continue;

    let score = 0;
    if (other === target) score = 3;
    else if (other.includes(target) || target.includes(other)) score = 2;
    else continue;

    // Bonus si une date exacte de la ville tombe dans la période Côte d'Azur.
    if (dates.some((date) => date >= candidate.startDate && date <= candidate.endDate)) score += 1;

    if (!best || score > best.score) best = { event: candidate, score };
  }

  return best && best.score >= 3 ? best.event : null;
}
