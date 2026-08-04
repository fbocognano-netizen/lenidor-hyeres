import type { AgendaCategory } from "./agenda-categories";

export const AGENDA_RHYTHMS = [
  { id: "one_off", label: "Ponctuel" },
  { id: "date_range", label: "Sur plusieurs jours" },
  { id: "recurring", label: "Rendez-vous récurrent" },
] as const;

export const AGENDA_PRIORITIES = [
  { id: "must_see", label: "À ne pas manquer" },
  { id: "good_idea", label: "Bonne idée à deux" },
  { id: "secondary", label: "Secondaire" },
  { id: "exclude", label: "À écarter" },
] as const;

export type AgendaRhythm = (typeof AGENDA_RHYTHMS)[number];
export type AgendaPriority = (typeof AGENDA_PRIORITIES)[number];

function normalized(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function includesAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term));
}

function itemById<T extends readonly { id: string }[]>(items: T, id: T[number]["id"]): T[number] {
  return items.find((item) => item.id === id)!;
}

export function assessAgendaEvent(input: {
  title: string;
  sourceCategory: string | null;
  travelerCategory: AgendaCategory | null;
  scheduleText: string | null;
  occurrenceCount: number;
}) {
  const text = normalized([input.title, input.sourceCategory, input.scheduleText].filter(Boolean).join(" "));
  const recurringWords = ["tous les", "chaque ", "hebdomadaire", "quotidien", "tous les jours"];
  const recurring = includesAny(text, recurringWords);
  const rhythm = recurring
    ? itemById(AGENDA_RHYTHMS, "recurring")
    : input.occurrenceCount > 1
      ? itemById(AGENDA_RHYTHMS, "date_range")
      : itemById(AGENDA_RHYTHMS, "one_off");

  const tags: string[] = [];
  let score = 0;

  if (rhythm.id === "one_off") {
    score += 35;
    tags.push("ponctuel");
  } else if (rhythm.id === "date_range") {
    score += 12;
  } else {
    score -= 30;
    tags.push("récurrent");
  }

  const categoryScore: Record<AgendaCategory["id"], number> = {
    music_nightlife: 28,
    culture: 20,
    family: -55,
    markets_food: 12,
    outdoor_sport: 18,
    wellbeing: 10,
    local_life: -8,
    other: 0,
  };
  if (input.travelerCategory) score += categoryScore[input.travelerCategory.id];

  if (includesAny(text, ["concert", "dj", "musique live", "spectacle", "festival"])) {
    score += 18;
    tags.push("musique live");
  }
  if (includesAny(text, ["cinema", "projection", "film"])) {
    score += 18;
    tags.push("cinéma");
  }
  if (includesAny(text, ["plein air", "en exterieur", "plage", "terrasse", "coucher de soleil"])) {
    score += 14;
    tags.push("plein air");
  }
  if (includesAny(text, ["nocturne", "soiree", "19h", "20h", "21h", "22h"])) {
    score += 10;
    tags.push("soirée");
  }
  if (includesAny(text, ["degustation", "gastronomie", "diner", "vigneron", "saveur"])) {
    score += 10;
    tags.push("gourmand");
  }
  if (includesAny(text, ["marche", "braderie", "vide grenier"])) score -= 35;

  const familyOnly = includesAny(text, ["enfant", "jeunesse", "centre de loisirs", "atelier famille"]);
  if (familyOnly) score -= 55;

  const priority = familyOnly || score < -15
    ? itemById(AGENDA_PRIORITIES, "exclude")
    : score >= 55
      ? itemById(AGENDA_PRIORITIES, "must_see")
      : score >= 25
        ? itemById(AGENDA_PRIORITIES, "good_idea")
        : itemById(AGENDA_PRIORITIES, "secondary");

  return { rhythm, priority, score, tags: [...new Set(tags)] };
}
