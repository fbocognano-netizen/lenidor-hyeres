import { Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

import { SiteNav } from "@/components/site-nav";
import { AgencyCredit } from "@/components/agency-credit";
import { SocialLinks } from "@/components/social-links";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ThankYouPageProps = {
  eyebrow: string;
  title: string;
  text: string;
  code?: string;
  codeLabel?: string;
  codeDescription?: string;
  primaryCtaLabel?: string;
};

export function ThankYouPage({
  eyebrow,
  title,
  text,
  code,
  codeLabel = "Votre code avantage",
  codeDescription,
  primaryCtaLabel = "Voir les disponibilités",
}: ThankYouPageProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="mx-auto flex max-w-3xl px-5 py-14 sm:py-24">
        <Card className="w-full border-border/70 p-6 text-center shadow-none sm:p-10">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-secondary text-primary">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <p className="mt-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
          <h1 className="mt-3 font-display text-[2rem] leading-tight sm:text-5xl">{title}</h1>
          <p className="mx-auto mt-5 max-w-xl text-muted-foreground leading-relaxed">{text}</p>
          {code ? (
            <div className="mx-auto mt-7 max-w-sm rounded-lg border border-dashed border-primary/50 bg-secondary/60 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {codeLabel}
              </p>
              <p className="mt-2 font-display text-3xl">{code}</p>
              {codeDescription ? (
                <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  {codeDescription}
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild className="rounded-full h-12 px-6">
              <Link to="/#reserver">{primaryCtaLabel}</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full h-12 px-6">
              <Link to="/">Retour au studio</Link>
            </Button>
          </div>
        </Card>
      </main>
      <footer className="border-t border-border/60 bg-background">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-muted-foreground sm:flex-row">
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
