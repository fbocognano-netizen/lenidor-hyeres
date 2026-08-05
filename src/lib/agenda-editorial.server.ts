// Catégorisation éditoriale des événements de l'agenda.
// Serveur uniquement. Aucune dépendance externe : règles lexicales déterministes.

export type EditorialAnnotation = {
  travelerCategory: string | null;
  editorialPriority: "haute" | "moyenne" | "basse";
  editorialRhythm: "temps_fort" | "rendez_vous_regulier" | "ponctuel";
  editorialScore: number;
  editorialTags: string[];
};

type Rule = { tag: string; category: string; score: number; keywords: string[] };

const RULES: Rule[] = [
  {
    tag: "mer_et_iles",
    category: "mer_et_iles",
    score: 26,
    keywords: ["port", "mer", "voile", "nautique", "plage", "porquerolles", "giens", "regate", "régate", "bateau", "ile", "île"],
  },
  {
    tag: "nature",
    category: "nature",
    score: 22,
    keywords: ["jardin", "randonnee", "randonnée", "sentier", "nature", "botanique", "salins", "oiseaux", "parc"],
  },
  {
    tag: "culture",
    category: "culture",
    score: 24,
    keywords: ["exposition", "musee", "musée", "villa noailles", "patrimoine", "conference", "conférence", "theatre", "théâtre", "cinema", "cinéma", "visite", "photographie", "design"],
  },
  {
    tag: "musique",
    category: "culture",
    score: 25,
    keywords: ["concert", "musique", "festival", "jazz", "opera", "opéra", "dj", "live"],
  },
  {
    tag: "gastronomie",
    category: "gastronomie",
    score: 23,
    keywords: ["marche", "marché", "degustation", "dégustation", "vin", "gastronomie", "food", "produits locaux", "brocante"],
  },
  {
    tag: "famille",
    category: "famille",
    score: 12,
    keywords: ["enfants", "jeune public", "famille", "atelier enfant", "conte", "scolaire"],
  },
  {
    tag: "sport",
    category: "sport",
    score: 10,
    keywords: ["match", "basket", "football", "rugby", "tournoi", "course", "trail", "championnat", "handball"],
  },
];

const ROMANTIC_KEYWORDS = [
  "coucher de soleil",
  "sunset",
  "nocturne",
  "guinguette",
  "apero",
  "apéro",
  "bal",
  "romantique",
  "duo",
  "acoustique",
  "chandelle",
];

const HIGHLIGHT_KEYWORDS = ["festival", "villa noailles", "feu d'artifice", "biennale", "salon", "grand prix"];
const RECURRING_KEYWORDS = ["chaque", "tous les", "hebdomadaire", "marché", "marche", "permanent", "du mardi", "du lundi"];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function includesAny(haystack: string, keywords: string[]): boolean {
  return keywords.some((keyword) => haystack.includes(normalize(keyword)));
}

export function annotateEvent(input: {
  title: string;
  category?: string | null;
  locationSlug?: string | null;
  scheduleText?: string | null;
}): EditorialAnnotation {
  const haystack = normalize(
    [input.title, input.category ?? "", input.locationSlug ?? "", input.scheduleText ?? ""].join(" "),
  );

  const tags: string[] = [];
  let category: string | null = null;
  let score = 0;

  for (const rule of RULES) {
    if (!includesAny(haystack, rule.keywords)) continue;
    tags.push(rule.tag);
    score += rule.score;
    if (!category || rule.score > (RULES.find((r) => r.category === category)?.score ?? 0)) {
      category = rule.category;
    }
  }

  const romantic = includesAny(haystack, ROMANTIC_KEYWORDS);
  if (romantic) {
    tags.push("couple");
    score += 18;
  }

  const highlight = includesAny(haystack, HIGHLIGHT_KEYWORDS);
  if (highlight) {
    tags.push("temps_fort");
    score += 15;
  }

  const recurring = includesAny(haystack, RECURRING_KEYWORDS);
  if (recurring) tags.push("rendez_vous_regulier");

  if (tags.includes("famille") && !romantic) score -= 8;
  if (tags.includes("sport") && !highlight) score -= 6;

  score = Math.max(0, Math.min(100, score));

  const editorialPriority: EditorialAnnotation["editorialPriority"] =
    score >= 40 ? "haute" : score >= 20 ? "moyenne" : "basse";

  const editorialRhythm: EditorialAnnotation["editorialRhythm"] = highlight
    ? "temps_fort"
    : recurring
      ? "rendez_vous_regulier"
      : "ponctuel";

  return {
    travelerCategory: category ?? (romantic ? "couple" : null),
    editorialPriority,
    editorialRhythm,
    editorialScore: score,
    editorialTags: Array.from(new Set(tags)),
  };
}
