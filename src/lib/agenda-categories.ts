export const AGENDA_CATEGORIES = [
  { id: "music_nightlife", label: "Musique et soirées" },
  { id: "culture", label: "Culture et patrimoine" },
  { id: "family", label: "En famille" },
  { id: "markets_food", label: "Marchés et gourmandises" },
  { id: "outdoor_sport", label: "Nature et sport" },
  { id: "wellbeing", label: "Bien-être" },
  { id: "local_life", label: "Vie locale" },
  { id: "other", label: "Autres sorties" },
] as const;

export type AgendaCategory = (typeof AGENDA_CATEGORIES)[number];

function normalized(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function includesAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term));
}

export function classifyAgendaEvent(input: {
  title: string;
  sourceCategory: string | null;
  scheduleText: string | null;
}): AgendaCategory {
  const text = normalized([input.sourceCategory, input.title, input.scheduleText].filter(Boolean).join(" "));
  const category = (id: AgendaCategory["id"]) => AGENDA_CATEGORIES.find((item) => item.id === id)!;

  if (includesAny(text, ["concert", "musique", "dj", "soiree", "nocturne", "festival", "danse", "karaoke"])) {
    return category("music_nightlife");
  }
  if (includesAny(text, ["exposition", "musee", "theatre", "cinema", "conference", "patrimoine", "visite guidee", "lecture"])) {
    return category("culture");
  }
  if (includesAny(text, ["enfant", "famille", "jeunesse", "atelier", "ludique", "conte", "spectacle jeune"])) {
    return category("family");
  }
  if (includesAny(text, ["marche", "gastronomie", "degustation", "vigneron", "saveur", "repas", "moule", "producteur"])) {
    return category("markets_food");
  }
  if (includesAny(text, ["randonnee", "sport", "velo", "nautique", "plage", "nature", "marche active", "yoga", "kayak"])) {
    return category("outdoor_sport");
  }
  if (includesAny(text, ["bien etre", "meditation", "relaxation", "massage", "sophrologie"])) {
    return category("wellbeing");
  }
  if (includesAny(text, ["association", "solidarite", "citoyen", "commemoration", "forum", "collecte"])) {
    return category("local_life");
  }
  return category("other");
}
