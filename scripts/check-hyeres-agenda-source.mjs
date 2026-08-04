const CITY_ORIGIN = "https://hyeres.fr";
const DAYS_TO_CHECK = 7;

function formatCityDate(value) {
  const day = String(value.getUTCDate()).padStart(2, "0");
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  return `${day}${month}${value.getUTCFullYear()}`;
}

function eventUrls(html) {
  const urls = [];
  const pattern = /<h2><a class="post-link stretched-link" href="([^"]+)">/g;
  for (const match of html.matchAll(pattern)) {
    const url = new URL(match[1], CITY_ORIGIN);
    if (url.origin === CITY_ORIGIN && url.pathname.startsWith("/agenda/")) urls.push(url.href);
  }
  return [...new Set(urls)];
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { Accept: "text/html,application/json", "User-Agent": "LeNidOrAgenda/1.0" } });
  if (!response.ok) throw new Error(`${url} a répondu ${response.status}`);
  return response.text();
}

async function fetchAllRestEvents() {
  const events = [];
  for (let page = 1; page <= 20; page += 1) {
    const batch = JSON.parse(await fetchText(`${CITY_ORIGIN}/wp-json/wp/v2/evenement?per_page=100&page=${page}`));
    events.push(...batch);
    if (batch.length < 100) break;
  }
  return events;
}

const today = new Date();
const dates = Array.from({ length: DAYS_TO_CHECK }, (_, index) => {
  const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + index));
  return date;
});
const [days, restEvents] = await Promise.all([
  Promise.all(dates.map(async (date) => {
    const code = formatCityDate(date);
    const html = await fetchText(`${CITY_ORIGIN}/agenda-hyeres/?_sfm_event_date_deb=${code}+${code}`);
    return { date: date.toISOString().slice(0, 10), urls: eventUrls(html) };
  })),
  fetchAllRestEvents(),
]);

const sourceUrls = new Set(restEvents.map((event) => event.link));
const occurrences = days.flatMap((day) => day.urls.map((url) => ({ date: day.date, url })));
const unmatched = occurrences.filter((occurrence) => !sourceUrls.has(occurrence.url));

console.log(JSON.stringify({
  checkedDays: days.map((day) => ({ date: day.date, occurrences: day.urls.length })),
  occurrenceCount: occurrences.length,
  apiEvents: restEvents.length,
  unmatchedOccurrences: unmatched.length,
}, null, 2));

if (unmatched.length) process.exitCode = 1;
