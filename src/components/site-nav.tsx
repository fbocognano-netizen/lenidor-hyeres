import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";

export const SITE_NAV_ITEMS = [
  { hash: "sejour", label: "Le studio" },
  { hash: "galerie", label: "Photos" },
  { hash: "equipements", label: "Équipements" },
  { hash: "avis", label: "Avis" },
  { hash: "lieu", label: "Localisation" },
] as const;

/**
 * Barre de navigation partagée par toutes les pages du site.
 * `home` : sur la page d'accueil les liens sont des ancres locales,
 * ailleurs ils pointent vers l'accueil suivi de l'ancre.
 */
export function SiteNav({ home = false }: { home?: boolean }) {
  const [open, setOpen] = useState(false);
  const href = (hash: string) => (home ? `#${hash}` : `/#${hash}`);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/75 border-b border-border/60">
      <div className="mx-auto max-w-6xl px-5 h-14 sm:h-16 flex items-center justify-between gap-3">
        {home ? (
          <a href="#top" className="font-display text-base sm:text-xl tracking-tight truncate">
            Le Nid d'Or à Hyères
          </a>
        ) : (
          <Link to="/" className="font-display text-base sm:text-xl tracking-tight truncate">
            Le Nid d'Or à Hyères
          </Link>
        )}

        <nav
          aria-label="Navigation principale"
          className="hidden lg:flex items-center gap-6 text-sm text-muted-foreground"
        >
          {SITE_NAV_ITEMS.map((item) => (
            <a key={item.hash} href={href(item.hash)} className="hover:text-foreground transition">
              {item.label}
            </a>
          ))}
          <Link
            to="/guides-hyeres"
            className="hover:text-foreground transition"
            activeProps={{ className: "text-foreground font-medium" }}
          >
            Découvrir Hyères
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="cta"
            className="rounded-full h-11 px-5 text-sm sm:h-12 sm:px-6 sm:text-base shadow-lg"
          >
            {home ? <a href="#reserver">Réserver</a> : <a href="/#reserver">Réserver</a>}
          </Button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            className="lg:hidden inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/70 text-foreground"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <nav
          aria-label="Navigation principale mobile"
          className="lg:hidden border-t border-border/60 bg-background/95 backdrop-blur-md"
        >
          <ul className="mx-auto max-w-6xl px-5 py-3 flex flex-col">
            {SITE_NAV_ITEMS.map((item) => (
              <li key={item.hash}>
                <a
                  href={href(item.hash)}
                  onClick={() => setOpen(false)}
                  className="block py-3 text-[15px] border-b border-border/40"
                >
                  {item.label}
                </a>
              </li>
            ))}
            <li>
              <Link
                to="/guides-hyeres"
                onClick={() => setOpen(false)}
                className="block py-3 text-[15px] border-b border-border/40"
              >
                Découvrir Hyères
              </Link>
            </li>
            <li>
              <a
                href={home ? "#reserver" : "/#reserver"}
                onClick={() => setOpen(false)}
                className="block py-3 text-[15px] font-medium text-primary"
              >
                Réserver
              </a>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
