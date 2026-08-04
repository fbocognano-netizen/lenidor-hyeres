import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, ExternalLink, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { previewHyeresAgendaSource } from "@/lib/agenda-control.functions";

export const Route = createFileRoute("/agenda-controle-local")({
  head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }),
  component: AgendaControlPage,
});

function AgendaControlPage() {
  const previewSource = useServerFn(previewHyeresAgendaSource);
  const preview = useMutation({ mutationFn: () => previewSource() });
  const data = preview.data;
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [rhythmFilter, setRhythmFilter] = useState("all");
  const visibleOccurrences = useMemo(() => {
    if (!data) return [];
    return data.occurrences.filter((occurrence) =>
      (priorityFilter === "all" || occurrence.priority.id === priorityFilter)
      && (categoryFilter === "all" || occurrence.travelerCategory?.id === categoryFilter)
      && (rhythmFilter === "all" || occurrence.rhythm.id === rhythmFilter),
    );
  }, [categoryFilter, data, priorityFilter, rhythmFilter]);

  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground sm:py-16">
      <section className="mx-auto max-w-4xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Contrôle privé</p>
        <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-4xl leading-tight sm:text-5xl">Agenda de Hyères</h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
              Lecture seule des sources officielles. Aucune donnée n&apos;est enregistrée.
            </p>
          </div>
          <Button type="button" onClick={() => preview.mutate()} disabled={preview.isPending}>
            <RefreshCw className={preview.isPending ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
            {preview.isPending ? "Vérification…" : "Vérifier les 2 sources"}
          </Button>
        </div>

        {preview.isError ? (
          <Card className="mt-8 border-destructive/30 p-5 text-sm text-destructive">
            Une des sources officielles ne répond pas pour le moment. Réessaie dans quelques instants.
          </Card>
        ) : null}

        {data ? (
          <>
            <div className="mt-8 grid gap-3 sm:grid-cols-4">
              <Metric label="Période" value={`${data.rangeStart} au ${data.rangeEnd}`} />
              <Metric label="À ne pas manquer" value={String(data.priorityCounts.must_see)} />
              <Metric label="Bonnes idées à deux" value={String(data.priorityCounts.good_idea)} />
              <Metric label="Recoupés" value={`${data.crossCheckedOccurrences} / ${data.occurrenceCount}`} />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Ville de Hyères : {data.occurrenceCount} dates. Côte d&apos;Azur France : {data.coteAzurEventCount} fiches sur la période. Les fiches recoupées sont rapprochées par titre et dates.</p>
            <Card className="mt-6 border-border/60 p-4 shadow-none">
              <div className="grid gap-3 sm:grid-cols-3">
                <Filter label="Priorité" value={priorityFilter} onChange={setPriorityFilter} options={[["all", "Toutes"], ["must_see", "À ne pas manquer"], ["good_idea", "Bonnes idées à deux"], ["secondary", "Secondaires"], ["exclude", "À écarter"]]} />
                <Filter label="Catégorie" value={categoryFilter} onChange={setCategoryFilter} options={[["all", "Toutes"], ["music_nightlife", "Musique et soirées"], ["culture", "Culture"], ["markets_food", "Gourmandises"], ["outdoor_sport", "Nature et sport"], ["wellbeing", "Bien-être"], ["family", "Famille"], ["local_life", "Vie locale"], ["other", "Autres"]]} />
                <Filter label="Rythme" value={rhythmFilter} onChange={setRhythmFilter} options={[["all", "Tous"], ["one_off", "Ponctuels"], ["date_range", "Plusieurs jours"], ["recurring", "Récurrents"]]} />
              </div>
            </Card>
            <div className="mt-6 space-y-3">
              {visibleOccurrences.map((occurrence) => (
                <Card key={`${occurrence.date}-${occurrence.sourceUrl}`} className="border-border/60 p-4 shadow-none">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {occurrence.date}
                        {` · ${occurrence.priority.label}`}
                        {occurrence.travelerCategory ? ` · ${occurrence.travelerCategory.label}` : ""}
                        {occurrence.category ? ` · ${occurrence.category.replaceAll("_", " ")}` : ""}
                        {occurrence.location ? ` · ${occurrence.location}` : ""}
                      </p>
                      <h2 className="mt-1 text-base font-medium">{occurrence.title}</h2>
                      <p className="mt-2 text-xs text-muted-foreground">Ville de Hyères{occurrence.coteAzurSourceUrl ? ` · Recoupé avec Côte d'Azur France${occurrence.coteAzurType ? ` (${occurrence.coteAzurType})` : ""}` : ""}</p>
                      {occurrence.tags.length ? <p className="mt-2 text-xs text-muted-foreground">{occurrence.tags.join(" · ")}</p> : null}
                    </div>
                    <div className="flex gap-3 text-sm font-medium text-primary">
                      <a className="inline-flex items-center gap-1 hover:underline" href={occurrence.sourceUrl} target="_blank" rel="noreferrer">Ville <ExternalLink className="h-3.5 w-3.5" /></a>
                      {occurrence.coteAzurSourceUrl ? <a className="inline-flex items-center gap-1 hover:underline" href={occurrence.coteAzurSourceUrl} target="_blank" rel="noreferrer">Côte d&apos;Azur <ExternalLink className="h-3.5 w-3.5" /></a> : null}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <Card className="mt-8 border-border/60 p-8 text-center text-sm text-muted-foreground shadow-none">
            <CalendarDays className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-3">La vérification affichera ici les événements des deux prochaines semaines.</p>
          </Card>
        )}
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-border/60 p-4 shadow-none">
      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-medium">{value}</p>
    </Card>
  );
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal">
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}
