import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, ExternalLink, MapPin, Search, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { SiteNav } from "@/components/site-nav";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getPublicAgenda, type PublicAgendaEvent } from "@/lib/agenda-public.functions";

const PAGE_URL = "https://lenidor-hyeres.fr/agenda";
const PAGE_TITLE = "Agenda de Hyères : événements, sorties et activités à faire";
const PAGE_DESCRIPTION =
  "Concerts, cinéma en plein air, sorties, spectacles et événements à Hyères : découvrez les idées à faire dans les deux prochaines semaines autour du Nid d'Or.";

const CATEGORY_LABELS: Record<string, string> = {
  concert: "Concerts",
  musique: "Musique",
  cinema: "Cinéma",
  spectacle: "Spectacles",
  visites_sorties: "Visites et sorties",
  exposition: "Expositions",
  sport: "Sport",
};

function labelForCategory(value: string | null) {
  if (!value) return "Autres sorties";
  const normalized = value.toLowerCase().replaceAll("-", "_");
  return CATEGORY_LABELS[normalized] ?? value.replaceAll("_", " ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(new Date(`${value}T12:00:00`));
}

function shortSchedule(value: string | null) {
  if (!value) return null;
  const clean = value.replace(/\s+/g, " ").trim();
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
  const dates = event.dates.map(formatDate).join(" · ");
  return (
    <Card className="flex h-full flex-col border-border/60 p-5 shadow-none sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
          {labelForCategory(event.category)}
        </span>
        {event.editorialPriority === "high" ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> À ne pas manquer
          </span>
        ) : null}
      </div>
      <h2 className="mt-3 font-display text-2xl leading-tight">{event.title}</h2>
      <p className="mt-3 inline-flex items-start gap-2 text-sm font-medium text-foreground">
        <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>{dates}</span>
      </p>
      {event.locationLabel ? (
        <p className="mt-2 inline-flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{event.locationLabel}</span>
        </p>
      ) : null}
      {shortSchedule(event.scheduleText) ? (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {shortSchedule(event.scheduleText)}
        </p>
      ) : null}
      <a
        href={event.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-medium text-primary hover:underline"
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
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(
    () =>
      Array.from(
        new Set((agendaQuery.data ?? []).map((event) => labelForCategory(event.category))),
      ).sort(),
    [agendaQuery.data],
  );
  const visibleEvents = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (agendaQuery.data ?? []).filter((event) => {
      const haystack = [
        event.title,
        event.category,
        event.travelerCategory,
        event.locationLabel,
        ...event.editorialTags,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (
        (!query || haystack.includes(query)) &&
        (category === "all" || labelForCategory(event.category) === category)
      );
    });
  }, [agendaQuery.data, category, search]);

  return (
    <div className="min-h-screen bg-background text-foreground">
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
        <div className="mt-8 max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Sortir à Hyères
          </p>
          <h1 className="mt-4 font-display text-[2.2rem] leading-[1.08] sm:text-5xl">
            Que faire à Hyères dans les deux prochaines semaines ?
          </h1>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {PAGE_DESCRIPTION}
          </p>
        </div>

        <section
          aria-label="Rechercher dans l'agenda"
          className="mt-10 border-y border-border/60 py-5"
        >
          <div className="flex flex-col gap-3 lg:flex-row">
            <label className="relative block flex-1">
              <span className="sr-only">Rechercher un événement</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un concert, une sortie, un lieu..."
                className="h-12 rounded-full pl-11"
              />
            </label>
            <label className="block lg:w-64">
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
        {agendaQuery.isError ? (
          <p className="mt-8 text-destructive">
            L’agenda est momentanément indisponible. Revenez dans quelques instants.
          </p>
        ) : null}
        {!agendaQuery.isLoading && !agendaQuery.isError && visibleEvents.length === 0 ? (
          <p className="mt-8 text-muted-foreground">
            Aucun événement ne correspond à votre recherche.
          </p>
        ) : null}
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleEvents.map((event) => (
            <AgendaCard key={event.id} event={event} />
          ))}
        </div>
      </main>
    </div>
  );
}
