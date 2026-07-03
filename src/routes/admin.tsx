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
  getAdminBookings,
  getAdminConfigStatus,
  getAdminOtaRanges,
  resendBookingNotification,
  signInAdmin,
  signOutAdmin,
  updateBookingStatus,
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
      { title: "Espace hôte — Réservations Villa d'Or" },
      {
        name: "description",
        content: "Espace hôte privé pour suivre les demandes de réservation du studio à Hyères.",
      },
      { property: "og:title", content: "Espace hôte — Villa d'Or" },
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
  const loginAdmin = useServerFn(signInAdmin);
  const logoutAdmin = useServerFn(signOutAdmin);
  const changeStatus = useServerFn(updateBookingStatus);
  const resendNotification = useServerFn(resendBookingNotification);
  const queryClient = useQueryClient();
  const [accessCode, setAccessCode] = useState("");
  const [loginError, setLoginError] = useState<null | "invalid" | "not_configured">(null);

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

    try {
      const result = await loginAdmin({ data: { code: accessCode } });
      if (!result.ok) {
        setLoginError(result.reason ?? "invalid");
        return;
      }
      setAccessCode("");
      await queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    } catch {
      toast.error("Connexion impossible pour le moment");
    }
  }

  async function handleLogout() {
    try {
      await logoutAdmin();
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
    return (
      <main className="min-h-screen bg-background text-foreground">
        <Toaster position="top-center" richColors />
        <section className="mx-auto flex min-h-screen max-w-md items-center px-5 py-12">
          <Card className="w-full rounded-3xl border-border/60 bg-card p-7 shadow-sm">
            <a href="/" className="font-display text-2xl">
              Villa <span className="italic text-[var(--color-sea)]">d'Or</span>
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
                  disabled={notConfigured}
                />
                {loginError === "invalid" && (
                  <p className="mt-2 text-sm text-destructive">Code incorrect.</p>
                )}
                {loginError === "not_configured" && (
                  <p className="mt-2 text-sm text-destructive">
                    Code admin non configuré côté serveur.
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full rounded-full"
                disabled={!accessCode.trim() || notConfigured}
              >
                Ouvrir l'espace hôte
              </Button>
              <p className="pt-2 text-xs leading-relaxed text-muted-foreground">
                Pour changer le code d'accès : Paramètres du projet → Backend → Secrets → modifier <code className="font-mono">ADMIN_ACCESS_CODE</code>, puis rechargez cette page.
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
              Villa <span className="italic text-[var(--color-sea)]">d'Or</span>
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

        <Card className="mt-5 rounded-2xl border-border/60 p-4 text-sm text-muted-foreground shadow-none">
          Notifications admin envoyées à <span className="font-medium text-foreground">{configQuery.data?.notifyAdminEmail ?? "usertinder543@gmail.com"}</span>
          {!configQuery.data?.notifyAdminEmailConfigured && " (valeur par défaut, modifiable via NOTIFY_ADMIN_EMAIL)"}.
        </Card>

        <div className="mt-8 space-y-4">
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