import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  CalendarDays,
  Check,
  LoaderCircle,
  Mail,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { FormEvent, useRef, useState } from "react";

import { SiteNav } from "@/components/site-nav";
import { AgencyCredit } from "@/components/agency-credit";
import { SocialLinks } from "@/components/social-links";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { captureCrmLead } from "@/lib/crm.functions";
import { cn } from "@/lib/utils";

export type LeadCaptureConfig = {
  source: "club_nid_or" | "direct_booking_offer";
  eyebrow: string;
  title: string;
  subtitle: string;
  benefits: string[];
  cta: string;
  thankYouPath: string;
  showStayPeriod?: boolean;
  showDesiredDates?: boolean;
  messageLabel?: string;
  messagePlaceholder?: string;
};

type FieldErrors = Partial<Record<"first_name" | "email" | "consent" | "form", string>>;

export function LeadCapturePage({ config }: { config: LeadCaptureConfig }) {
  const submitLead = useServerFn(captureCrmLead);
  const navigate = useNavigate();
  const alertRef = useRef<HTMLDivElement>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLButtonElement>(null);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  function clearError(field: keyof FieldErrors) {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      delete next.form;
      return next;
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const firstName = String(form.get("first_name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const nextErrors: FieldErrors = {};

    if (!firstName) {
      nextErrors.first_name = "Indiquez votre prénom pour continuer.";
    }

    if (!email) {
      nextErrors.email = "Indiquez votre email pour recevoir les offres.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = "Vérifiez le format de votre email.";
    }

    if (!consent) {
      nextErrors.consent =
        "Cochez cette case pour confirmer que vous souhaitez recevoir nos offres.";
    }

    if (Object.keys(nextErrors).length > 0) {
      nextErrors.form = "Il manque une information avant d'envoyer votre inscription.";
      setErrors(nextErrors);
      requestAnimationFrame(() => {
        alertRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        if (nextErrors.first_name) firstNameRef.current?.focus();
        else if (nextErrors.email) emailRef.current?.focus();
        else consentRef.current?.focus();
      });
      return;
    }

    setErrors({});
    setLoading(true);
    try {
      await submitLead({
        data: {
          first_name: firstName,
          email,
          phone: String(form.get("phone") || "") || null,
          stay_period: String(form.get("stay_period") || "") || null,
          desired_dates: String(form.get("desired_dates") || "") || null,
          message: String(form.get("message") || "") || null,
          source: config.source,
          source_url: typeof window !== "undefined" ? window.location.href : null,
          newsletter_consent: true,
        },
      });
      await navigate({ to: config.thankYouPath });
    } catch (error) {
      setErrors({
        form:
          error instanceof Error ? error.message : "Inscription impossible. Merci de réessayer.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />

      <main className="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:py-16 lg:grid-cols-12 lg:gap-12">
        <section className="lg:col-span-6">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition">
            Retour au Nid d'Or
          </Link>
          <p className="mt-8 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {config.eyebrow}
          </p>
          <h1 className="mt-4 font-display text-[2.35rem] leading-[1.05] sm:text-5xl md:text-6xl">
            {config.title}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {config.subtitle}
          </p>

          <div className="mt-8 grid gap-3">
            {config.benefits.map((benefit) => (
              <div key={benefit} className="flex items-start gap-3 text-sm sm:text-base">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span>{benefit}</span>
              </div>
            ))}
          </div>

          <div className="mt-10 grid grid-cols-3 gap-3 text-center">
            <Card className="p-4 shadow-none">
              <Mail className="mx-auto h-5 w-5 text-[var(--color-sea)]" />
              <p className="mt-2 text-xs text-muted-foreground">Offres utiles</p>
            </Card>
            <Card className="p-4 shadow-none">
              <CalendarDays className="mx-auto h-5 w-5 text-[var(--color-sea)]" />
              <p className="mt-2 text-xs text-muted-foreground">Disponibilités</p>
            </Card>
            <Card className="p-4 shadow-none">
              <Star className="mx-auto h-5 w-5 fill-current text-[var(--color-accent)]" />
              <p className="mt-2 text-xs text-muted-foreground">Avantages</p>
            </Card>
          </div>
        </section>

        <section className="lg:col-span-6">
          <Card className="border-border/70 p-5 shadow-none sm:p-7">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-secondary">
                <Sparkles className="h-5 w-5 text-primary" />
              </span>
              <div>
                <h2 className="font-display text-2xl">Votre inscription</h2>
                <p className="text-sm text-muted-foreground">Simple, rapide, sans plateforme.</p>
              </div>
            </div>

            {errors.form ? (
              <div
                ref={alertRef}
                role="alert"
                aria-live="assertive"
                className="mt-5 flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm font-medium text-destructive shadow-sm"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{errors.form}</p>
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
              <div className="grid gap-2">
                <Label htmlFor="first_name">Prénom</Label>
                <Input
                  ref={firstNameRef}
                  id="first_name"
                  name="first_name"
                  autoComplete="given-name"
                  aria-invalid={Boolean(errors.first_name)}
                  aria-describedby={errors.first_name ? "first_name-error" : undefined}
                  onInput={() => clearError("first_name")}
                  required
                />
                {errors.first_name ? (
                  <p id="first_name-error" className="text-sm text-destructive">
                    {errors.first_name}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  ref={emailRef}
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  onInput={() => clearError("email")}
                  required
                />
                {errors.email ? (
                  <p id="email-error" className="text-sm text-destructive">
                    {errors.email}
                  </p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Téléphone, optionnel</Label>
                <Input id="phone" name="phone" type="tel" autoComplete="tel" />
              </div>

              {config.showStayPeriod ? (
                <div className="grid gap-2">
                  <Label htmlFor="stay_period">Votre séjour, optionnel</Label>
                  <Input id="stay_period" name="stay_period" placeholder="Ex. juillet 2026" />
                </div>
              ) : null}

              {config.showDesiredDates ? (
                <div className="grid gap-2">
                  <Label htmlFor="desired_dates">Dates souhaitées, optionnel</Label>
                  <Input
                    id="desired_dates"
                    name="desired_dates"
                    placeholder="Ex. un week-end en septembre"
                  />
                </div>
              ) : null}

              <div className="grid gap-2">
                <Label htmlFor="message">{config.messageLabel ?? "Message, optionnel"}</Label>
                <Textarea
                  id="message"
                  name="message"
                  rows={4}
                  placeholder={
                    config.messagePlaceholder ??
                    "Une préférence, une question, une période idéale..."
                  }
                />
              </div>

              <label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm leading-relaxed transition-colors",
                  errors.consent
                    ? "border-destructive bg-destructive/10 text-destructive ring-1 ring-destructive/30"
                    : "border-border/70 hover:border-primary/40",
                )}
              >
                <Checkbox
                  ref={consentRef}
                  checked={consent}
                  aria-invalid={Boolean(errors.consent)}
                  aria-describedby={errors.consent ? "consent-error" : undefined}
                  onCheckedChange={(value) => {
                    setConsent(value === true);
                    clearError("consent");
                  }}
                />
                <span>
                  J'accepte de recevoir les offres, actualités et disponibilités du Nid d'Or par
                  email. Je pourrai me désinscrire à tout moment.
                </span>
              </label>
              {errors.consent ? (
                <p
                  id="consent-error"
                  className="-mt-2 flex items-start gap-2 text-sm text-destructive"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {errors.consent}
                </p>
              ) : null}

              <Button
                type="submit"
                className="h-12 w-full rounded-full transition-transform active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Inscription en cours...
                  </span>
                ) : (
                  config.cta
                )}
              </Button>

              <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                Vos informations servent uniquement à gérer la relation avec Le Nid d'Or et ses
                offres directes.
              </p>
            </form>
          </Card>
        </section>
      </main>
      <footer className="border-t border-border/60 bg-background">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-muted-foreground sm:flex-row">
          <div className="text-center sm:text-left">
            <p>© {new Date().getFullYear()} Le Nid d'Or à Hyères. Tous droits réservés.</p>
            <AgencyCredit className="mt-1" />
          </div>
          <SocialLinks />
        </div>
      </footer>
    </div>
  );
}
