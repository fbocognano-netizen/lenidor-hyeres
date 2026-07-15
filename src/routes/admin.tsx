import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { addMonths, differenceInCalendarDays, format, isSameDay, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  LogOut,
  Mail,
  Phone,
  RefreshCw,
  Users,
  XCircle,
} from "lucide-react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { toast, Toaster } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  createIcalSource,
  deleteIcalSource,
  getAdminBookings,
  getAdminConfigStatus,
  getAdminOtaRanges,
  listIcalSources,
  resendBookingNotification,
  updateBookingStatus,
  updateIcalSource,
} from "@/lib/admin-bookings.functions";
import { cn } from "@/lib/utils";



type BookingStatus = "pending" | "confirmed" | "cancelled";
type Booking = {
  id: string;
  guest_name: string;
  email: string;
  phone: string | null;
  check_in: string;
  check_out: string;
  guests: number;
  message: string | null;
  total_price: number | null;
  status: string;
  created_at: string;
  notification: null | {
    status: string;
    recipient_email: string;
    provider_status: number | null;
    error_message: string | null;
    sent_at: string | null;
    created_at: string;
  };
};

type NotificationStatus = "pending" | "sent" | "failed";
type LoginError = "invalid" | "not_configured" | "session_not_configured" | "session_error" | "server_error";

const statusLabels: Record<BookingStatus, string> = {
  pending: "À traiter",
  confirmed: "Confirmée",
  cancelled: "Annulée",
};

const statusClasses: Record<BookingStatus, string> = {
  pending: "border-accent bg-accent/40 text-accent-foreground",
  confirmed: "border-primary/20 bg-primary/10 text-primary",
  cancelled: "border-destructive/20 bg-destructive/10 text-destructive",
};

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Espace hôte — Réservations Le Nid d'Or" },
      {
        name: "description",
        content: "Espace hôte privé pour suivre les demandes de réservation du studio à Hyères.",
      },
      { property: "og:title", content: "Espace hôte — Le Nid d'Or" },
      { property: "og:description", content: "Suivi privé des demandes de réservation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const loadBookings = useServerFn(getAdminBookings);
  const loadConfigStatus = useServerFn(getAdminConfigStatus);
  const changeStatus = useServerFn(updateBookingStatus);
  const resendNotification = useServerFn(resendBookingNotification);
  const loadOtaRanges = useServerFn(getAdminOtaRanges);
  const queryClient = useQueryClient();
  const [accessCode, setAccessCode] = useState("");
  const [loginError, setLoginError] = useState<null | LoginError>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const configQuery = useQuery({
    queryKey: ["admin-config"],
    queryFn: () => loadConfigStatus(),
    retry: false,
  });

  const bookingsQuery = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: () => loadBookings(),
    retry: false,
  });

  const otaQuery = useQuery({
    queryKey: ["admin-ota-ranges"],
    queryFn: () => loadOtaRanges(),
    retry: false,
    enabled: bookingsQuery.data?.authenticated === true,
  });


  const statusMutation = useMutation({
    mutationFn: (input: { id: string; status: BookingStatus }) => changeStatus({ data: input }),
    onSuccess: (result) => {
      if (!result.authenticated) {
        toast.error("Session expirée. Entrez à nouveau le code admin.");
        queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
        return;
      }
      toast.success("Statut mis à jour");
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: () => toast.error("Impossible de modifier le statut"),
  });

  const resendMutation = useMutation({
    mutationFn: (input: { id: string }) => resendNotification({ data: input }),
    onSuccess: (result) => {
      if (!result.authenticated) {
        toast.error("Session expirée. Entrez à nouveau le code admin.");
        queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
        return;
      }
      toast.success("Notification renvoyée");
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: () => toast.error("Impossible de renvoyer la notification"),
  });

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: accessCode }),
      });
      const result = (await res.json()) as { ok: boolean; reason?: LoginError };
      if (!result.ok) {
        setLoginError(result.reason ?? "server_error");
        return;
      }
      setAccessCode("");
      await queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      await bookingsQuery.refetch();
    } catch {
      setLoginError("server_error");
      toast.error("Connexion impossible pour le moment");
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/admin/logout", { method: "POST", credentials: "same-origin" });
    } finally {
      queryClient.removeQueries({ queryKey: ["admin-bookings"] });
      window.location.reload();
    }
  }

  const data = bookingsQuery.data;

  if (bookingsQuery.isLoading) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <section className="mx-auto flex min-h-screen max-w-md items-center justify-center px-5 py-12">
          <p className="text-sm text-muted-foreground">Chargement de l'espace hôte…</p>
        </section>
      </main>
    );
  }

  if (!data?.authenticated) {
    const notConfigured = configQuery.data?.configured === false;
    const sessionNotConfigured = configQuery.data?.sessionConfigured === false;
    const adminUnavailable = notConfigured || sessionNotConfigured;
    return (
      <main className="min-h-screen bg-background text-foreground">
        <Toaster position="top-center" richColors />
        <section className="mx-auto flex min-h-screen max-w-md items-center px-5 py-12">
          <Card className="w-full rounded-3xl border-border/60 bg-card p-7 shadow-sm">
            <a href="/" className="font-display text-2xl">
              Le Nid&nbsp;d'Or
            </a>
            <p className="mt-8 text-xs uppercase tracking-[0.2em] text-muted-foreground">Espace hôte</p>
            <h1 className="mt-3 font-display text-4xl leading-tight">Demandes de réservation</h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Entrez le code admin pour consulter les demandes reçues et répondre aux clients depuis votre messagerie.
            </p>

            {notConfigured && (
              <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                Aucun code admin défini. Ajoutez le secret <code className="font-mono">ADMIN_ACCESS_CODE</code> dans les paramètres du projet (Backend → Secrets) pour activer l'espace hôte.
              </div>
            )}

            {sessionNotConfigured && (
              <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                Session admin non configurée. Le secret <code className="font-mono">ADMIN_SESSION_SECRET</code> doit exister pour ouvrir l'espace hôte.
              </div>
            )}

            <form onSubmit={handleLogin} className="mt-8 space-y-4">
              <div>
                <Label htmlFor="admin-code" className="text-xs uppercase tracking-wider text-muted-foreground">
                  Code admin
                </Label>
                <Input
                  id="admin-code"
                  type="password"
                  value={accessCode}
                  onChange={(event) => setAccessCode(event.target.value)}
                  autoComplete="current-password"
                  className="mt-2 h-11 rounded-xl"
                  required
                  disabled={adminUnavailable || isLoggingIn}
                />
                {loginError === "invalid" && (
                  <div className="mt-2 space-y-1 text-sm text-destructive">
                    <p>Le code ne correspond pas au secret ADMIN_ACCESS_CODE actuellement enregistré.</p>
                    <p className="text-xs text-muted-foreground">
                      Remplacez le secret <span className="font-mono">ADMIN_ACCESS_CODE</span> par un nouveau code simple, rechargez la page, puis retapez exactement ce nouveau code.
                    </p>
                  </div>
                )}
                {loginError === "not_configured" && (
                  <p className="mt-2 text-sm text-destructive">
                    Code admin non configuré côté serveur.
                  </p>
                )}
                {loginError === "session_not_configured" && (
                  <p className="mt-2 text-sm text-destructive">
                    Session admin non configurée côté serveur.
                  </p>
                )}
                {loginError === "session_error" && (
                  <p className="mt-2 text-sm text-destructive">
                    Le code est bon, mais la session admin n'a pas pu être ouverte.
                  </p>
                )}
                {loginError === "server_error" && (
                  <p className="mt-2 text-sm text-destructive">
                    Erreur serveur pendant la connexion admin.
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full rounded-full"
                disabled={!accessCode.trim() || adminUnavailable || isLoggingIn}
              >
                {isLoggingIn ? "Connexion en cours…" : "Ouvrir l'espace hôte"}
              </Button>
              <p className="pt-2 text-xs leading-relaxed text-muted-foreground">
                Si l'accès bloque encore, remplacez <code className="font-mono">ADMIN_ACCESS_CODE</code> par un code neuf dans les secrets, puis rechargez cette page.
              </p>
            </form>
          </Card>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Toaster position="top-center" richColors />
      <section className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
        <header className="flex flex-col gap-6 border-b border-border/60 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <a href="/" className="font-display text-2xl">
              Le Nid&nbsp;d'Or
            </a>
            <p className="mt-8 text-xs uppercase tracking-[0.2em] text-muted-foreground">Espace hôte</p>
            <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">Demandes de réservation</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => bookingsQuery.refetch()}
              disabled={bookingsQuery.isFetching}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", bookingsQuery.isFetching && "animate-spin")} />
              Actualiser
            </Button>
            <Button type="button" variant="ghost" className="rounded-full" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Verrouiller
            </Button>
          </div>
        </header>

        <div className="mt-8 grid gap-3 sm:grid-cols-4">
          <Counter label="Nouvelles" value={data.counts.pending} tone="accent" />
          <Counter label="Confirmées" value={data.counts.confirmed} tone="primary" />
          <Counter label="Annulées" value={data.counts.cancelled} tone="muted" />
          <Counter label="Total" value={data.counts.total} tone="default" />
        </div>

        <Card className="mt-5 rounded-2xl border border-accent/60 bg-accent/20 p-4 text-sm">
          <p className="font-medium text-foreground">⚠️ Sync OTA manuelle</p>
          <p className="mt-1 text-muted-foreground">
            Après avoir confirmé une réservation directe, pense à bloquer les dates sur chaque plateforme (les OTA ne permettent pas de sync automatique sortante) :
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href="https://www.airbnb.fr/multicalendar" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-3 py-1 text-xs font-medium hover:bg-secondary">
              Airbnb <ExternalLink className="h-3 w-3" />
            </a>
            <a href="https://www.abritel.fr/hote/calendar" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-3 py-1 text-xs font-medium hover:bg-secondary">
              Abritel <ExternalLink className="h-3 w-3" />
            </a>
            <a href="https://www.leboncoin.fr/account/my_bookings" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-3 py-1 text-xs font-medium hover:bg-secondary">
              Leboncoin <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </Card>

        <Card className="mt-4 rounded-2xl border-border/60 p-4 text-sm text-muted-foreground shadow-none">
          Notifications admin envoyées à <span className="font-medium text-foreground">{configQuery.data?.notifyAdminEmail ?? "usertinder543@gmail.com"}</span>
          {!configQuery.data?.notifyAdminEmailConfigured && " (valeur par défaut, modifiable via NOTIFY_ADMIN_EMAIL)"}.
        </Card>

        <Tabs defaultValue="calendar" className="mt-8">
          <TabsList className="rounded-full">
            <TabsTrigger value="calendar" className="rounded-full">Calendrier</TabsTrigger>
            <TabsTrigger value="list" className="rounded-full">Liste ({data.counts.total})</TabsTrigger>
            <TabsTrigger value="ical" className="rounded-full">Calendriers iCal</TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-6">
            <CalendarView
              bookings={data.bookings}
              otaRanges={otaQuery.data?.ranges ?? []}
              otaLoading={otaQuery.isLoading}
              onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
              statusPending={statusMutation.isPending}
            />
          </TabsContent>

          <TabsContent value="list" className="mt-6">
            <div className="space-y-4">
              {data.bookings.length === 0 ? (
                <Card className="rounded-3xl border-border/60 p-8 text-center shadow-none">
                  <p className="font-display text-2xl">Aucune demande pour le moment.</p>
                  <p className="mt-2 text-sm text-muted-foreground">Les futures demandes apparaîtront ici.</p>
                </Card>
              ) : (
                data.bookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onStatusChange={(status) => statusMutation.mutate({ id: booking.id, status })}
                    onResendNotification={() => resendMutation.mutate({ id: booking.id })}
                    statusPending={statusMutation.isPending}
                    resendPending={resendMutation.isPending}
                  />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="ical" className="mt-6">
            <IcalSourcesPanel />
          </TabsContent>
        </Tabs>


      </section>
    </main>
  );
}

function Counter({ label, value, tone }: { label: string; value: number; tone: "accent" | "primary" | "muted" | "default" }) {
  return (
    <Card className="rounded-2xl border-border/60 p-4 shadow-none">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-2 font-display text-4xl",
          tone === "accent" && "text-[var(--color-sea)]",
          tone === "primary" && "text-primary",
          tone === "muted" && "text-muted-foreground",
        )}
      >
        {value}
      </div>
    </Card>
  );
}

type OtaRange = { source: string; start: string; end: string };

function CalendarView({
  bookings,
  otaRanges,
  otaLoading,
  onStatusChange,
  statusPending,
}: {
  bookings: Booking[];
  otaRanges: OtaRange[];
  otaLoading: boolean;
  onStatusChange: (id: string, status: BookingStatus) => void;
  statusPending: boolean;
}) {
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(monthCursor);
  const monthEnd = addMonths(monthStart, 1);
  // Build 6-week grid starting Monday
  const gridStart = new Date(monthStart);
  const dow = (gridStart.getDay() + 6) % 7; // 0 = Monday
  gridStart.setDate(gridStart.getDate() - dow);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }

  type Entry = { kind: "direct"; booking: Booking } | { kind: "ota"; source: string; range: OtaRange };
  const entriesForDay = (day: Date): Entry[] => {
    const out: Entry[] = [];
    for (const b of bookings) {
      if (b.status === "cancelled") continue;
      const ci = new Date(`${b.check_in}T00:00:00`);
      const co = new Date(`${b.check_out}T00:00:00`);
      if (day >= ci && day < co) out.push({ kind: "direct", booking: b });
    }
    for (const r of otaRanges) {
      const s = new Date(r.start);
      const e = new Date(r.end);
      if (day >= new Date(s.getFullYear(), s.getMonth(), s.getDate()) && day < new Date(e.getFullYear(), e.getMonth(), e.getDate())) {
        out.push({ kind: "ota", source: r.source, range: r });
      }
    }
    return out;
  };

  const sourceColor = (src: string) => {
    const s = src.toLowerCase();
    if (s.includes("airbnb")) return "bg-rose-400/80 text-white";
    if (s.includes("abritel")) return "bg-blue-400/80 text-white";
    if (s.includes("gens")) return "bg-emerald-500/80 text-white";
    return "bg-slate-400/80 text-white";
  };


  const selectedEntries = selectedDay ? entriesForDay(selectedDay) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="rounded-full" onClick={() => setMonthCursor(addMonths(monthCursor, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-display text-2xl capitalize min-w-[180px] text-center">
            {format(monthStart, "MMMM yyyy", { locale: fr })}
          </h3>
          <Button variant="outline" size="icon" className="rounded-full" onClick={() => setMonthCursor(addMonths(monthCursor, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full ml-2" onClick={() => setMonthCursor(startOfMonth(new Date()))}>
            Aujourd'hui
          </Button>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <LegendDot className="bg-primary" label="Direct" />
          <LegendDot className="bg-rose-400" label="Airbnb" />
          <LegendDot className="bg-blue-400" label="Abritel" />
          {otaLoading && <span className="italic">Chargement OTA…</span>}
        </div>
      </div>

      <Card className="overflow-hidden rounded-3xl border-border/60 p-0 shadow-none">
        <div className="grid grid-cols-7 border-b border-border/60 bg-muted/30 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
            <div key={d} className="px-2 py-2 text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const inMonth = day >= monthStart && day < monthEnd;
            const entries = entriesForDay(day);
            const isToday = isSameDay(day, new Date());
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={cn(
                  "min-h-[86px] border-b border-r border-border/40 p-1.5 text-left transition hover:bg-secondary/40",
                  !inMonth && "bg-muted/20 text-muted-foreground/60",
                  isSelected && "ring-2 ring-primary ring-inset",
                )}
              >
                <div className={cn("mb-1 flex items-center justify-between text-xs", isToday && "font-bold text-primary")}>
                  <span>{day.getDate()}</span>
                </div>
                <div className="space-y-0.5">
                  {entries.slice(0, 3).map((e, i) => (
                    <div
                      key={i}
                      className={cn(
                        "truncate rounded px-1 py-0.5 text-[10px] leading-tight",
                        e.kind === "direct"
                          ? e.booking.status === "confirmed"
                            ? "bg-primary/80 text-primary-foreground"
                            : "bg-accent/70 text-foreground"
                          : sourceColor(e.source),
                      )}
                    >
                      {e.kind === "direct" ? e.booking.guest_name : e.source}
                    </div>
                  ))}
                  {entries.length > 3 && (
                    <div className="text-[10px] text-muted-foreground">+{entries.length - 3}</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {selectedDay && (
        <Card className="rounded-3xl border-border/60 p-5 shadow-none">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-xl">
              {format(selectedDay, "EEEE d MMMM yyyy", { locale: fr })}
            </h4>
            <Button variant="ghost" size="sm" onClick={() => setSelectedDay(null)}>Fermer</Button>
          </div>
          {selectedEntries.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Aucune réservation ce jour — dates disponibles.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {selectedEntries.map((e, i) => (
                <li key={i} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/50 p-3">
                  {e.kind === "direct" ? (
                    <>
                      <div>
                        <div className="font-medium">{e.booking.guest_name} <Badge variant="outline" className="ml-2 rounded-full">{statusLabels[e.booking.status as BookingStatus] ?? e.booking.status}</Badge></div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(e.booking.check_in)} → {formatDate(e.booking.check_out)} · {e.booking.guests} voy. · {e.booking.email}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        disabled={statusPending || e.booking.status === "cancelled"}
                        onClick={() => onStatusChange(e.booking.id, "cancelled")}
                      >
                        <XCircle className="mr-1 h-4 w-4" /> Libérer / Annuler
                      </Button>
                    </>
                  ) : (
                    <>
                      <div>
                        <div className="font-medium capitalize">Réservation {e.source}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(e.range.start), "d MMM", { locale: fr })} → {format(new Date(e.range.end), "d MMM yyyy", { locale: fr })}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground italic">À gérer sur la plateforme OTA</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("h-2.5 w-2.5 rounded-full", className)} />
      {label}
    </span>
  );
}


function BookingCard({
  booking,
  onStatusChange,
  onResendNotification,
  statusPending,
  resendPending,
}: {
  booking: Booking;
  onStatusChange: (status: BookingStatus) => void;
  onResendNotification: () => void;
  statusPending: boolean;
  resendPending: boolean;
}) {
  const nights = useMemo(
    () => differenceInCalendarDays(new Date(`${booking.check_out}T00:00:00`), new Date(`${booking.check_in}T00:00:00`)),
    [booking.check_in, booking.check_out],
  );
  const mailtoHref = buildMailto(booking, nights);

  async function copyEmail() {
    await navigator.clipboard.writeText(booking.email);
    toast.success("Email copié");
  }

  return (
    <Card className="rounded-3xl border-border/60 p-5 shadow-none sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-3xl leading-tight">{booking.guest_name}</h2>
            <Badge variant="outline" className={cn("rounded-full", statusClasses[booking.status as BookingStatus])}>
              {statusLabels[booking.status as BookingStatus] ?? booking.status}
            </Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Mail className="h-4 w-4" /> {booking.email}
            </span>
            {booking.phone && (
              <span className="inline-flex items-center gap-2">
                <Phone className="h-4 w-4" /> {booking.phone}
              </span>
            )}
          </div>
        </div>
        <div className="text-sm text-muted-foreground lg:text-right">
          Reçue le {format(new Date(booking.created_at), "d MMMM yyyy à HH:mm", { locale: fr })}
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <Info icon={<CalendarDays className="h-4 w-4" />} label="Dates" value={`${formatDate(booking.check_in)} → ${formatDate(booking.check_out)}`} />
        <Info icon={<Clock className="h-4 w-4" />} label="Durée" value={`${nights} nuit${nights > 1 ? "s" : ""}`} />
        <Info icon={<Users className="h-4 w-4" />} label="Voyageurs" value={`${booking.guests}`} />
        <Info label="Total estimé" value={booking.total_price === null ? "—" : `${booking.total_price} €`} />
      </div>

      {booking.message && (
        <div className="mt-5 rounded-2xl bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground">
          {booking.message}
        </div>
      )}

      <NotificationPanel booking={booking} onResend={onResendNotification} pending={resendPending} />

      <div className="mt-6 flex flex-col gap-3 border-t border-border/60 pt-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button asChild className="rounded-full">
            <a href={mailtoHref}>
              <Mail className="mr-2 h-4 w-4" />
              Répondre par email
            </a>
          </Button>
          <Button type="button" variant="outline" className="rounded-full" onClick={copyEmail}>
            <Copy className="mr-2 h-4 w-4" />
            Copier l'email
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusButton
            icon={<Clock className="h-4 w-4" />}
            label="À traiter"
            active={booking.status === "pending"}
            disabled={statusPending}
            onClick={() => onStatusChange("pending")}
          />
          <StatusButton
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Confirmer"
            active={booking.status === "confirmed"}
            disabled={statusPending}
            onClick={() => onStatusChange("confirmed")}
          />
          <StatusButton
            icon={<XCircle className="h-4 w-4" />}
            label="Annuler"
            active={booking.status === "cancelled"}
            disabled={statusPending}
            onClick={() => onStatusChange("cancelled")}
          />
        </div>
      </div>
    </Card>
  );
}

function NotificationPanel({ booking, onResend, pending }: { booking: Booking; onResend: () => void; pending: boolean }) {
  const notification = booking.notification;
  const status = (notification?.status ?? "missing") as NotificationStatus | "missing";
  const label =
    status === "sent" ? "Email admin accepté par Pingram" :
    status === "failed" ? "Email admin en erreur" :
    status === "pending" ? "Email admin en attente" :
    "Aucun suivi email";
  const details = notification
    ? [
        `Destinataire : ${notification.recipient_email}`,
        notification.provider_status ? `Réponse Pingram : ${notification.provider_status}` : null,
        notification.sent_at ? `Envoyé le ${format(new Date(notification.sent_at), "d MMM yyyy à HH:mm", { locale: fr })}` : null,
        notification.error_message ? `Erreur : ${notification.error_message}` : null,
      ].filter(Boolean).join(" · ")
    : "Cette demande date peut-être d'avant le suivi automatique.";

  return (
    <div className="mt-5 rounded-2xl border border-border/60 bg-secondary/30 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Badge
            variant="outline"
            className={cn(
              "rounded-full",
              status === "sent" && "border-primary/20 bg-primary/10 text-primary",
              status === "failed" && "border-destructive/20 bg-destructive/10 text-destructive",
              (status === "pending" || status === "missing") && "border-accent bg-accent/40 text-accent-foreground",
            )}
          >
            {label}
          </Badge>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{details}</p>
        </div>
        <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={onResend} disabled={pending}>
          <RefreshCw className={cn("mr-2 h-4 w-4", pending && "animate-spin")} />
          Renvoyer la notif
        </Button>
      </div>
    </div>
  );
}

function Info({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-secondary/60 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-2 text-sm font-medium">{value}</div>
    </div>
  );
}

function StatusButton({
  icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="sm"
      className="rounded-full"
      disabled={disabled || active}
      onClick={onClick}
    >
      <span className="mr-2">{icon}</span>
      {label}
    </Button>
  );
}

function formatDate(value: string) {
  return format(new Date(`${value}T00:00:00`), "d MMM yyyy", { locale: fr });
}

function buildMailto(booking: Booking, nights: number) {
  const subject = "Votre demande de réservation — Studio vue mer à Hyères";
  const body = [
    `Bonjour ${booking.guest_name},`,
    "",
    "Merci pour votre demande de réservation pour le studio vue mer à Hyères.",
    "",
    "Récapitulatif :",
    `- Dates : du ${formatDate(booking.check_in)} au ${formatDate(booking.check_out)}`,
    `- Durée : ${nights} nuit${nights > 1 ? "s" : ""}`,
    `- Voyageurs : ${booking.guests}`,
    booking.total_price === null ? "" : `- Total estimé : ${booking.total_price} €`,
    "- Caution : 500 € en espèces à l'arrivée, restituée au départ",
    "",
    "Je reviens vers vous pour confirmer la disponibilité et les modalités.",
    "",
    "Bien à vous,",
    "Joëlle",
  ].filter(Boolean).join("\n");

  return `mailto:${encodeURIComponent(booking.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

type IcalSourceRow = { id: string; label: string; url: string; enabled: boolean };

function IcalSourcesPanel() {
  const load = useServerFn(listIcalSources);
  const create = useServerFn(createIcalSource);
  const update = useServerFn(updateIcalSource);
  const remove = useServerFn(deleteIcalSource);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["admin-ical-sources"],
    queryFn: () => load(),
    retry: false,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-ical-sources"] });
    queryClient.invalidateQueries({ queryKey: ["admin-ota-ranges"] });
  };

  const createMutation = useMutation({
    mutationFn: (input: { label: string; url: string }) => create({ data: input }),
    onSuccess: () => { toast.success("Calendrier ajouté"); invalidate(); },
    onError: (e: Error) => toast.error(e.message ?? "Ajout impossible"),
  });
  const updateMutation = useMutation({
    mutationFn: (input: { id: string; label?: string; url?: string; enabled?: boolean }) => update({ data: input }),
    onSuccess: () => { toast.success("Mis à jour"); invalidate(); },
    onError: (e: Error) => toast.error(e.message ?? "Modification impossible"),
  });
  const deleteMutation = useMutation({
    mutationFn: (input: { id: string }) => remove({ data: input }),
    onSuccess: () => { toast.success("Supprimé"); invalidate(); },
    onError: (e: Error) => toast.error(e.message ?? "Suppression impossible"),
  });

  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const sources = (query.data?.authenticated ? query.data.sources : []) as IcalSourceRow[];

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-border/60 p-5 shadow-none sm:p-6">
        <h3 className="font-display text-2xl">Calendriers synchronisés (iCal)</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Chaque calendrier actif bloque automatiquement les dates réservées sur la plateforme correspondante. Ajoute ici les liens iCal (.ics) fournis par tes plateformes de location (Airbnb, Abritel, Gens de Confiance, etc.).
        </p>

        <form
          className="mt-5 grid gap-3 sm:grid-cols-[1fr,2fr,auto]"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newLabel.trim() || !newUrl.trim()) return;
            createMutation.mutate({ label: newLabel.trim(), url: newUrl.trim() }, {
              onSuccess: () => { setNewLabel(""); setNewUrl(""); },
            });
          }}
        >
          <Input placeholder="Nom (ex: Airbnb)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
          <Input placeholder="https://.../calendar.ics" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
          <Button type="submit" disabled={createMutation.isPending} className="rounded-full">
            {createMutation.isPending ? "Ajout…" : "Ajouter"}
          </Button>
        </form>
      </Card>

      <div className="space-y-3">
        {query.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
        {sources.length === 0 && !query.isLoading && (
          <Card className="rounded-2xl border-border/60 p-6 text-center text-sm text-muted-foreground shadow-none">
            Aucun calendrier configuré. Ajoute-en un ci-dessus.
          </Card>
        )}
        {sources.map((s) => (
          <IcalSourceRowItem
            key={s.id}
            source={s}
            onSave={(patch) => updateMutation.mutate({ id: s.id, ...patch })}
            onDelete={() => {
              if (confirm(`Supprimer le calendrier "${s.label}" ?`)) deleteMutation.mutate({ id: s.id });
            }}
            savePending={updateMutation.isPending}
            deletePending={deleteMutation.isPending}
          />
        ))}
      </div>
    </div>
  );
}

function IcalSourceRowItem({
  source,
  onSave,
  onDelete,
  savePending,
  deletePending,
}: {
  source: IcalSourceRow;
  onSave: (patch: { label?: string; url?: string; enabled?: boolean }) => void;
  onDelete: () => void;
  savePending: boolean;
  deletePending: boolean;
}) {
  const [label, setLabel] = useState(source.label);
  const [url, setUrl] = useState(source.url);
  const dirty = label !== source.label || url !== source.url;

  return (
    <Card className="rounded-2xl border-border/60 p-4 shadow-none">
      <div className="grid gap-3 sm:grid-cols-[1fr,2fr,auto,auto,auto] sm:items-center">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nom" />
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL .ics" className="font-mono text-xs" />
        <Button
          type="button"
          variant={source.enabled ? "default" : "outline"}
          size="sm"
          className="rounded-full"
          disabled={savePending}
          onClick={() => onSave({ enabled: !source.enabled })}
        >
          {source.enabled ? "Actif" : "Désactivé"}
        </Button>
        <Button
          type="button"
          size="sm"
          className="rounded-full"
          disabled={!dirty || savePending || !label.trim() || !url.trim()}
          onClick={() => onSave({ label: label.trim(), url: url.trim() })}
        >
          Enregistrer
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="rounded-full text-destructive hover:text-destructive"
          disabled={deletePending}
          onClick={onDelete}
        >
          Supprimer
        </Button>
      </div>
    </Card>
  );
}
