import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAgendaStatus, triggerAgendaSync } from "@/lib/agenda-admin.functions";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

function runBadgeVariant(status: string) {
  if (status === "completed") return "secondary" as const;
  if (status === "failed") return "destructive" as const;
  return "outline" as const;
}

export function AgendaPanel() {
  const queryClient = useQueryClient();
  const fetchStatus = useServerFn(getAgendaStatus);
  const runSync = useServerFn(triggerAgendaSync);

  const statusQuery = useQuery({
    queryKey: ["agenda-status"],
    queryFn: () => fetchStatus(),
  });

  const syncMutation = useMutation({
    mutationFn: () => runSync({ data: { days: 45 } }),
    onSuccess: (result) => {
      if (result.status === "success") {
        toast.success(
          `Agenda synchronisé : ${result.eventsSeen} événements, ${result.occurrencesSeen} occurrences.`,
        );
      } else {
        toast.error(result.errorMessage ?? "La synchronisation a échoué.");
      }
      void queryClient.invalidateQueries({ queryKey: ["agenda-status"] });
    },
    onError: () => toast.error("La synchronisation a échoué."),
  });

  const data = statusQuery.data;

  return (
    <div className="space-y-6">
      <Card className="flex flex-col gap-4 rounded-3xl border-border/60 p-6 shadow-none sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-xl">Agenda d'Hyères</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Synchronisation automatique quotidienne. {data?.totalEvents ?? 0} événements en base.
          </p>
        </div>
        <Button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="rounded-full"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
          Synchroniser maintenant
        </Button>
      </Card>

      <Card className="rounded-3xl border-border/60 p-6 shadow-none">
        <p className="font-display text-lg">Dernières exécutions</p>
        <div className="mt-4 space-y-3">
          {(data?.runs ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune synchronisation enregistrée.</p>
          ) : (
            data?.runs.map((run) => (
              <div
                key={run.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 p-3 text-sm"
              >
                <Badge variant={runBadgeVariant(run.status)}>
                  {run.status}
                </Badge>
                <span className="text-muted-foreground">
                  {run.range_start} → {run.range_end}
                </span>
                <span>{run.events_seen} événements</span>
                <span className="text-muted-foreground">{run.occurrences_seen} occurrences</span>
                <span className="text-muted-foreground">{formatDate(run.started_at)}</span>
                {run.error_message ? (
                  <span className="text-destructive">{run.error_message}</span>
                ) : null}
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="rounded-3xl border-border/60 p-6 shadow-none">
        <p className="font-display text-lg">Sélection éditoriale</p>
        <div className="mt-4 space-y-3">
          {(data?.topEvents ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Lancez une synchronisation pour alimenter l'agenda.
            </p>
          ) : (
            data?.topEvents.map((event) => (
              <div key={event.id} className="rounded-2xl border border-border/60 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={event.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {event.title}
                  </a>
                  <Badge variant="secondary">{event.editorial_priority ?? "—"}</Badge>
                  <span className="text-xs text-muted-foreground">
                    score {event.editorial_score}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[event.location_label, event.traveler_category, ...(event.editorial_tags ?? [])]
                    .filter(Boolean)
                    .join(" • ")}
                </p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
