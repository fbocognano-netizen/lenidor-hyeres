import { CalendarDays, MapPin } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { Card } from "@/components/ui/card";
import { getPublicAgenda, type PublicAgendaEvent } from "@/lib/agenda-public.functions";

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
  if (!value) return "Sortie";
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
  if (formattedDates.length <= 2) return formattedDates.join(" · ");
  return `${formattedDates.slice(0, 2).join(" · ")} · + ${formattedDates.length - 2} dates`;
}

function PreviewCard({ event }: { event: PublicAgendaEvent }) {
  const location = [event.locationLabel, event.city].filter(Boolean).join(" · ");

  return (
    <Card className="flex min-w-0 flex-col border-border/60 p-5 shadow-none">
      <p className="min-w-0 break-words text-xs font-medium uppercase tracking-[0.14em] text-primary">
        {labelForCategory(event.category)}
      </p>
      <h3 className="mt-3 min-w-0 break-words font-display text-xl leading-tight">{event.title}</h3>
      <p className="mt-4 flex min-w-0 items-start gap-2 text-sm font-medium text-foreground">
        <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span className="min-w-0 break-words">{formatDateSummary(event.dates)}</span>
      </p>
      {location ? (
        <p className="mt-2 flex min-w-0 items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="min-w-0 break-words">{location}</span>
        </p>
      ) : null}
    </Card>
  );
}

function PreviewSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Chargement des sorties">
      {Array.from({ length: 3 }, (_, index) => (
        <Card key={index} className="min-h-44 animate-pulse border-border/60 p-5 shadow-none">
          <div className="h-3 w-24 rounded bg-muted" />
          <div className="mt-5 h-7 w-4/5 rounded bg-muted" />
          <div className="mt-7 h-4 w-3/4 rounded bg-muted" />
          <div className="mt-3 h-4 w-2/3 rounded bg-muted" />
        </Card>
      ))}
    </div>
  );
}

/** Aperçu de l'agenda pour relier les guides aux sorties réellement à venir. */
export function AgendaPreview() {
  const fetchAgenda = useServerFn(getPublicAgenda);
  const agendaQuery = useQuery({
    queryKey: ["public-agenda"],
    queryFn: () => fetchAgenda(),
    staleTime: 5 * 60 * 1000,
  });
  const events = (agendaQuery.data ?? []).slice(0, 3);

  return (
    <section
      className="mt-10 border-y border-border/60 py-10 sm:mt-14 sm:py-12"
      aria-labelledby="agenda-preview-title"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Agenda des sorties
          </p>
          <h2
            id="agenda-preview-title"
            className="mt-2 font-display text-2xl leading-tight sm:text-3xl"
          >
            Que faire à Hyères cette semaine ?
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Concerts, expositions, visites et activités à Hyères et aux alentours, mis à jour
            régulièrement.
          </p>
        </div>
        <Link to="/agenda" className="shrink-0 text-sm font-medium text-primary hover:underline">
          Voir toutes les sorties →
        </Link>
      </div>

      <div className="mt-6">
        {agendaQuery.isLoading ? <PreviewSkeleton /> : null}
        {!agendaQuery.isLoading && events.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <PreviewCard key={event.id} event={event} />
            ))}
          </div>
        ) : null}
        {!agendaQuery.isLoading && !agendaQuery.isError && events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Consultez l’agenda pour découvrir les prochaines sorties à Hyères et autour.
          </p>
        ) : null}
        {agendaQuery.isError ? (
          <p className="text-sm text-muted-foreground">
            L’agenda est momentanément indisponible. Retrouvez les sorties à venir sur la page
            agenda.
          </p>
        ) : null}
      </div>
    </section>
  );
}
