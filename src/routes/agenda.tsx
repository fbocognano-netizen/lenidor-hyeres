import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, ExternalLink, MapPin, Search, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { SiteNav } from "@/components/site-nav";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buildAgendaLocationOptions } from "@/lib/agenda-location-filters";
import { agendaTextMatches } from "@/lib/agenda-search";
import { getPublicAgenda, type PublicAgendaEvent } from "@/lib/agenda-public.functions";
import agendaConcertImage from "@/assets/agenda-concert-hyeres.png";

const PAGE_URL = "https://lenidor-hyeres.fr/agenda";
const PAGE_TITLE = "Agenda de Hyères : événements, sorties et activités à faire";
const PAGE_DESCRIPTION =
  "Concerts, cinéma en plein air, sorties, spectacles et événements à Hyères : découvrez les idées à faire dans les deux prochaines semaines autour du Nid d'Or.";

const LOCAL_AGENDA_EVENT: PublicAgendaEvent = {
  id: "local-agenda-preview",
  title: 'Visite guidée botanique "Circuit fleuri du Village" à Bormes-les-Mimosas',
  category: "visites_sorties",
  travelerCategory: "visites_sorties",
  editorialPriority: "haute",
  editorialScore: 100,
  editorialTags: ["famille", "patrimoine"],
  locationLabel: "Village de Bormes-les-Mimosas",
  city: "Bormes-les-Mimosas",
  sourceName: "Office de Tourisme de Bormes les Mimosas",
  scheduleText:
    "Une promenade commentée à la découverte des fleurs, des ruelles et du patrimoine du village. Réservation conseillée.",
  sourceUrl: "https://www.bormeslesmimosas.com/",
  coteAzurSourceUrl: null,
  dates: ["2026-08-12", "2026-08-19", "2026-08-26"],
};

const CATEGORY_LABELS: Record<string, string> = {
  concert: "Musique / Concerts",
  musique: "Musique / Concerts",
  cinema: "Cinéma",
  cinéma: "Cinéma",
  cinema_projection: "Cinéma",
  spectacle: "Spectacles",
  visites_sorties: "Visites et sorties",
  exposition: "Expositions",
  sport: "Sport",
};

function labelForCategory(value: string | null) {
  if (!value) return "Autres sorties";
  const normalized = value.toLowerCase().replaceAll("-", "_");
  const label = CATEGORY_LABELS[normalized] ?? value.replaceAll("_", " ");
  return label.charAt(0).toLocaleUpperCase("fr-FR") + label.slice(1);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(new Date(`${value}T12:00:00`));
}

function formatDateSummary(values: string[]) {
  const formattedDates = values.map(formatDate);
  if (formattedDates.length <= 3) return formattedDates.join(" · ");
  return `${formattedDates.slice(0, 3).join(" · ")} · + ${formattedDates.length - 3} dates`;
}

function cleanAgendaText(value: string | null) {
  if (!value) return null;
  const clean = value
    .replace(/\s+/g, " ")
    .replace(/https:\/\/schema\.org[^\s]*/g, "")
    .replace(/\{?"?@(?:context|graph|type)"?:?[^.。!?]*[.。!?]?/g, "")
    .trim();
  return clean || null;
}

function shortSchedule(value: string | null) {
  const clean = cleanAgendaText(value);
  if (!clean) return null;
  return clean.length > 180 ? `${clean.slice(0, 177).trimEnd()}…` : clean;
}

export const Route = createFileRoute("/agenda")({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: PAGE_URL },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: PAGE_TITLE,
          description: PAGE_DESCRIPTION,
          url: PAGE_URL,
          about: { "@type": "City", name: "Hyères" },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Accueil",
              item: "https://lenidor-hyeres.fr/",
            },
            { "@type": "ListItem", position: 2, name: "Agenda de Hyères", item: PAGE_URL },
          ],
        }),
      },
    ],
  }),
  component: AgendaPage,
});

function AgendaCard({ event }: { event: PublicAgendaEvent }) {
  const dates = formatDateSummary(event.dates);
  const locationText = [event.locationLabel, event.city].filter(Boolean).join(" · ");
  return (
    <Card className="flex h-full min-w-0 flex-col overflow-hidden border-border/60 p-5 shadow-none sm:p-6">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <span className="min-w-0 break-words text-xs font-medium uppercase tracking-[0.14em] text-primary">
          {labelForCategory(event.category)}
        </span>
        {event.editorialPriority === "haute" ? (
          <span className="inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> À ne pas manquer
          </span>
        ) : null}
      </div>
      <h2 className="mt-3 min-w-0 break-words font-display text-2xl leading-tight">
        {event.title}
      </h2>
      <p className="mt-3 flex min-w-0 items-start gap-2 text-sm font-medium text-foreground">
        <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span className="min-w-0 break-words">{dates}</span>
      </p>
      {locationText ? (
        <p className="mt-2 flex min-w-0 items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="min-w-0 break-words">{locationText}</span>
        </p>
      ) : null}
      {event.sourceName ? (
        <p className="mt-2 min-w-0 break-words text-xs text-muted-foreground">
          Source : {event.sourceName}
        </p>
      ) : null}
      {shortSchedule(event.scheduleText) ? (
        <p className="mt-4 min-w-0 break-words text-sm leading-relaxed text-muted-foreground">
          {shortSchedule(event.scheduleText)}
        </p>
      ) : null}
      <a
        href={event.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-auto inline-flex min-w-0 items-center gap-2 pt-6 text-sm font-medium text-primary hover:underline"
      >
        Voir les détails officiels <ExternalLink className="h-4 w-4" />
      </a>
    </Card>
  );
}

function AgendaPage() {
  const fetchAgenda = useServerFn(getPublicAgenda);
  const agendaQuery = useQuery({
    queryKey: ["public-agenda"],
    queryFn: () => fetchAgenda(),
    staleTime: 5 * 60 * 1000,
  });
  const agendaEvents =
    import.meta.env.DEV && agendaQuery.isError ? [LOCAL_AGENDA_EVENT] : (agendaQuery.data ?? []);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [location, setLocation] = useState("all");
  const [sort, setSort] = useState("relevance");

  const categories = useMemo(
    () => Array.from(new Set(agendaEvents.map((event) => labelForCategory(event.category)))).sort(),
    [agendaEvents],
  );
  const locationOptions = useMemo(() => buildAgendaLocationOptions(agendaEvents), [agendaEvents]);
  const visibleEvents = useMemo(() => {
    const filtered = agendaEvents.filter((event) => {
      const locationFilter = locationOptions.find((item) => item.value === location);
      const haystack = [
        event.title,
        event.category,
        event.travelerCategory,
        event.locationLabel,
        event.city,
        event.sourceName,
        ...event.editorialTags,
      ]
        .filter(Boolean)
        .join(" ");
      return (
        agendaTextMatches(haystack, search) &&
        (category === "all" || labelForCategory(event.category) === category) &&
        (locationFilter?.matches(event) ?? true)
      );
    });
    return [...filtered].sort((left, right) => {
      if (sort === "relevance") {
        return (
          (right.editorialScore ?? 0) - (left.editorialScore ?? 0) ||
          left.title.localeCompare(right.title, "fr")
        );
      }
      const leftDate = left.dates[0] ?? "9999-12-31";
      const rightDate = right.dates[0] ?? "9999-12-31";
      return sort === "date-desc"
        ? rightDate.localeCompare(leftDate)
        : leftDate.localeCompare(rightDate);
    });
  }, [agendaEvents, category, location, locationOptions, search, sort]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-5 py-12 sm:py-20">
        <nav aria-label="Fil d'Ariane" className="text-xs text-muted-foreground sm:text-sm">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link to="/" className="hover:text-foreground">
                Accueil
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-foreground">Agenda de Hyères</li>
          </ol>
        </nav>
        <section className="relative mt-8 min-h-[24rem] overflow-hidden rounded-3xl bg-deep px-6 py-10 text-primary-foreground sm:px-10 sm:py-14">
          <img
            src={agendaConcertImage}
            alt="Concert en plein air au coucher du soleil à Hyères"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-deep/60" />
          <div className="relative max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary-foreground/80">
              Sortir à Hyères
            </p>
            <h1 className="mt-4 font-display text-[2.2rem] leading-[1.08] sm:text-5xl">
              Que faire à Hyères dans les deux prochaines semaines ?
            </h1>
            <p className="mt-5 text-base leading-relaxed text-primary-foreground/90 sm:text-lg">
              {PAGE_DESCRIPTION}
            </p>
          </div>
        </section>

        <section
          aria-label="Rechercher dans l'agenda"
          className="mt-10 border-y border-border/60 py-5"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_repeat(3,minmax(0,12rem))]">
            <label className="relative block min-w-0">
              <span className="sr-only">Rechercher un événement</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un concert, une sortie, un lieu..."
                className="h-12 rounded-full pl-11"
              />
            </label>
            <label className="block min-w-0">
              <span className="sr-only">Filtrer par catégorie</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-12 w-full rounded-full border border-input bg-background px-4 text-sm"
              >
                <option value="all">Toutes les catégories</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-0">
              <span className="sr-only">Filtrer par lieu</span>
              <select
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="h-12 w-full rounded-full border border-input bg-background px-4 text-sm"
              >
                {locationOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-0">
              <span className="sr-only">Trier les événements</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className="h-12 w-full rounded-full border border-input bg-background px-4 text-sm"
              >
                <option value="relevance">Pertinence</option>
                <option value="date-asc">Date la plus proche</option>
                <option value="date-desc">Date la plus éloignée</option>
              </select>
            </label>
          </div>
        </section>

        <div className="mt-8 flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl sm:text-3xl">Les sorties à venir</h2>
          {!agendaQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">
              {visibleEvents.length} événement{visibleEvents.length > 1 ? "s" : ""}
            </p>
          ) : null}
        </div>
        {agendaQuery.isLoading ? (
          <p className="mt-8 text-muted-foreground">Chargement des événements...</p>
        ) : null}
        {agendaQuery.isError && !import.meta.env.DEV ? (
          <p className="mt-8 text-destructive">
            L’agenda est momentanément indisponible. Revenez dans quelques instants.
          </p>
        ) : null}
        {agendaQuery.isError && import.meta.env.DEV ? (
          <p className="mt-8 text-sm text-muted-foreground">
            Aperçu local : données de démonstration utilisées pour tester l’affichage.
          </p>
        ) : null}
        {!agendaQuery.isLoading && visibleEvents.length === 0 ? (
          <p className="mt-8 text-muted-foreground">
            Aucun événement ne correspond à votre recherche.
          </p>
        ) : null}
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleEvents.map((event) => (
            <AgendaCard key={event.id} event={event} />
          ))}
        </div>
      </main>
    </div>
  );
}
