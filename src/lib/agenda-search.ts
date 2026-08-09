const SEARCH_STOPWORDS = new Set([
  "a",
  "au",
  "aux",
  "d",
  "de",
  "des",
  "du",
  "en",
  "et",
  "la",
  "le",
  "les",
  "l",
  "un",
  "une",
]);

export function normalizeAgendaSearchText(value: string | null | undefined) {
  return (value ?? "")
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((word) => word && !SEARCH_STOPWORDS.has(word))
    .join(" ");
}

export function agendaTextMatches(value: string, query: string) {
  const normalizedQuery = normalizeAgendaSearchText(query);
  if (!normalizedQuery) return true;
  const normalizedValue = normalizeAgendaSearchText(value);
  return normalizedQuery
    .split(/\s+/)
    .every((word) => normalizedValue.split(/\s+/).some((candidate) => candidate.includes(word)));
}
