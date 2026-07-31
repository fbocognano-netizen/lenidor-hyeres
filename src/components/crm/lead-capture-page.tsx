import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Check, Mail, ShieldCheck, Sparkles, Star } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { captureCrmLead } from "@/lib/crm.functions";

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

export function LeadCapturePage({ config }: { config: LeadCaptureConfig }) {
  const submitLead = useServerFn(captureCrmLead);
  const navigate = useNavigate();
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    if (!consent) {
      toast.error("Merci de cocher le consentement pour recevoir les offres.");
      return;
    }

    setLoading(true);
    try {
      await submitLead({
        data: {
          first_name: String(form.get("first_name") || ""),
          email: String(form.get("email") || ""),
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
      toast.error(error instanceof Error ? error.message : "Inscription impossible.");
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

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="first_name">Prénom</Label>
                <Input id="first_name" name="first_name" autoComplete="given-name" required />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
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

              <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border/70 p-3 text-sm leading-relaxed">
                <Checkbox
                  checked={consent}
                  onCheckedChange={(value) => setConsent(value === true)}
                />
                <span>
                  J'accepte de recevoir les offres, actualités et disponibilités du Nid d'Or par
                  email. Je pourrai me désinscrire à tout moment.
                </span>
              </label>

              <Button type="submit" className="h-12 w-full rounded-full" disabled={loading}>
                {loading ? "Inscription en cours..." : config.cta}
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
    </div>
  );
}
