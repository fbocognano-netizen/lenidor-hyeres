import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, MapPin, Sailboat, Sun, Umbrella, Waves } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import photo2 from "@/assets/listing/photo-2.jpg";
import photo4 from "@/assets/listing/photo-4.jpg";

export const Route = createFileRoute("/guide-plages-hyeres")({
  head: () => ({
    meta: [
      {
        title:
          "Les plus belles plages de Hyères : Almanarre, Notre-Dame et plus | Le Nid d'Or",
      },
      {
        name: "description",
        content:
          "Guide des plus belles plages de Hyères et des Îles d'Or. Plage de l'Almanarre à 10 min du studio, Porquerolles, Notre-Dame, Giens... Tout pour des vacances réussies au soleil du Var.",
      },
      {
        property: "og:title",
        content:
          "Les plus belles plages de Hyères : Almanarre, Notre-Dame et plus | Le Nid d'Or",
      },
      {
        property: "og:description",
        content:
          "Plage de l'Almanarre à 10 min du studio, Porquerolles, Notre-Dame, Giens... Le guide complet pour des vacances réussies à Hyères.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://lenidor-hyeres.fr/guide-plages-hyeres" },
      { property: "og:image", content: photo2 },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: photo2 },
    ],
    links: [
      { rel: "canonical", href: "https://lenidor-hyeres.fr/guide-plages-hyeres" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500&family=Inter:wght@300;400;500;600&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Les plus belles plages de Hyères : Almanarre, Notre-Dame et plus",
          description:
            "Guide des plus belles plages de Hyères et des Îles d'Or, à proximité du studio Le Nid d'Or.",
          image: "https://lenidor-hyeres.fr" + photo2,
          url: "https://lenidor-hyeres.fr/guide-plages-hyeres",
          author: { "@type": "Organization", name: "Le Nid d'Or" },
          publisher: {
            "@type": "Organization",
            name: "Le Nid d'Or",
            logo: {
              "@type": "ImageObject",
              url: "https://lenidor-hyeres.fr" + photo4,
            },
          },
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": "https://lenidor-hyeres.fr/guide-plages-hyeres",
          },
        }),
      },
    ],
  }),
  component: GuidePlages,
});

const BEACHES = [
  {
    name: "Plage de l'Almanarre",
    distance: "10 min en voiture du studio",
    icon: Waves,
    description:
      "La plage de l'Almanarre est l'une des plus célèbres de Hyères. Longue bande de sable bordée de pins et de sel, elle offre une vue magnifique sur les Salins et les Îles d'Or. C'est aussi le spot incontournable pour le kitesurf et la planche à voile quand le mistral souffle.",
    keywords: ["plage de l'almanarre", "hyeres vacances"],
  },
  {
    name: "Plage Notre-Dame",
    distance: "15 min en voiture",
    icon: Sun,
    description:
      "Située sur la presqu'île de Giens, la plage Notre-Dame est une plage familiale au sable fin et aux eaux turquoise. Elle est idéale pour une journée détente, loin de l'agitation, avec une vue imprenable sur Porquerolles.",
    keywords: ["plage notre dame hyeres", "presqu'ile de giens"],
  },
  {
    name: "Plage de la Bergerie",
    distance: "20 min en voiture + traversée",
    icon: Umbrella,
    description:
      "Sur l'île de Porquerolles, la plage de la Bergerie est un véritable écrin de nature. Eaux cristallines, sable blanc et pinède ombragée : c'est l'excursion parfaite pour une journée de rêve aux Îles d'Or.",
    keywords: ["plage de la bergerie", "porquerolles plage"],
  },
  {
    name: "Plage d'Argent",
    distance: "25 min en voiture + traversée",
    icon: Sailboat,
    description:
      "La plage d'Argent, à Porquerolles, est souvent citée parmi les plus belles de France. Son eau transparente et son sable fin en font un lieu magique, accessible en navette depuis le port de Hyères.",
    keywords: ["plage d'argent porquerolles", "plus belles plages france"],
  },
];

function GuidePlages() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/75 border-b border-border/60">
        <div className="mx-auto max-w-6xl px-5 h-14 sm:h-16 flex items-center justify-between gap-3">
          <Link to="/" className="font-display text-base sm:text-xl tracking-tight truncate">
            Le Nid d'Or à Hyères
          </Link>
          <Button asChild variant="cta" className="rounded-full h-10 px-4 text-sm sm:h-11 sm:px-5">
            <Link to="/" hash="reserver">
              Réserver
            </Link>
          </Button>
        </div>
      </header>

      <section className="relative">
        <div className="relative h-[55vh] min-h-[360px] sm:h-[50vh] sm:min-h-[420px] w-full overflow-hidden">
          <img
            src={photo2}
            alt="Coucher de soleil sur les Îles d'Or depuis la terrasse du studio à Hyères"
            className="absolute inset-0 h-full w-full object-cover"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-deep/30 via-deep/10 to-deep/80" />
          <div className="absolute inset-0 flex items-end">
            <div className="mx-auto max-w-4xl w-full px-5 pb-8 sm:pb-14 text-primary-foreground">
              <div className="inline-flex items-center gap-2 rounded-full bg-background/15 backdrop-blur px-3 py-1 text-[10px] sm:text-xs uppercase tracking-[0.18em]">
                <MapPin className="h-3 w-3" /> GUIDE HYÈRES
              </div>
              <h1 className="mt-4 sm:mt-5 font-display text-[2rem] sm:text-5xl md:text-6xl leading-[1.1] sm:leading-[1.05]">
                Les plus belles plages de Hyères
              </h1>
              <p className="mt-3 sm:mt-5 max-w-2xl text-sm sm:text-lg text-primary-foreground/90">
                Almanarre, Notre-Dame, Porquerolles… Découvrez les spots de rêve accessibles depuis le studio en quelques minutes.
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-4xl px-5 py-14 sm:py-20 md:py-24">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" /> Retour au studio
        </Link>

        <div className="mt-8 space-y-4 text-muted-foreground text-[15px] leading-relaxed">
          <p>
            Vous préparez vos <strong>vacances à Hyères</strong> et cherchez les meilleures plages ? Vous êtes au bon endroit. Depuis le studio <strong>Le Nid d'Or</strong>, chaque spot de baignade est à portée de main — de la célèbre <strong>plage de l'Almanarre</strong> aux criques sauvages de <strong>Porquerolles</strong>.
          </p>
          <p>
            Que vous soyez amateur de kitesurf, de farniente ou d'excursions en bateau, ce guide vous aide à choisir la plage qui correspond à votre envie du moment.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:gap-8">
          {BEACHES.map((beach) => (
            <Card
              key={beach.name}
              className="overflow-hidden border border-border/60 bg-card p-6 sm:p-8"
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 rounded-full bg-secondary p-3 text-primary">
                  <beach.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-display text-xl sm:text-2xl md:text-3xl">{beach.name}</h2>
                  <p className="mt-1 text-xs sm:text-sm uppercase tracking-[0.12em] text-muted-foreground">
                    {beach.distance}
                  </p>
                  <p className="mt-4 text-muted-foreground text-[15px] leading-relaxed">
                    {beach.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {beach.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <section className="mt-16 sm:mt-20 rounded-2xl bg-deep p-6 sm:p-10 text-primary-foreground">
          <h2 className="font-display text-2xl sm:text-3xl">Envie de rejoindre les Îles d'Or ?</h2>
          <p className="mt-4 max-w-2xl text-primary-foreground/90 text-[15px] leading-relaxed">
            Depuis le port de Hyères, les bateaux pour Porquerolles partent régulièrement. En 15 minutes de traversée, vous débarquez dans un monde de calme, de sentiers de pinède et de plages aux eaux turquoise. C'est l'excursion incontournable de vos <strong>hyères vacances</strong>.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Button
              asChild
              variant="cta"
              className="rounded-full h-14 px-6 text-base w-full sm:w-auto sm:h-16 sm:px-8 sm:text-lg"
            >
              <Link to="/" hash="reserver">
                Vérifier les disponibilités
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-full bg-background/10 border-background/50 text-primary-foreground hover:bg-background/25 hover:text-primary-foreground hover:border-background/70 h-14 px-6 text-base w-full sm:w-auto sm:h-16 sm:px-8 sm:text-lg"
            >
              <a
                href="https://www.google.com/maps/search/?api=1&query=plage+de+l'almanarre+hyeres"
                target="_blank"
                rel="noopener noreferrer"
              >
                Voir la plage de l'Almanarre sur Maps
              </a>
            </Button>
          </div>
        </section>

        <section className="mt-14 sm:mt-20">
          <h2 className="font-display text-2xl sm:text-3xl">Pourquoi choisir Le Nid d'Or pour vos vacances à Hyères ?</h2>
          <ul className="mt-6 space-y-3 text-muted-foreground text-[15px] leading-relaxed">
            <li className="flex gap-3">
              <span className="text-primary">✓</span>
              <span>Studio vue mer avec terrasse plein sud, face aux Îles d'Or.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary">✓</span>
              <span>Piscine de 18 mètres à quelques pas, pour des moments de détente après la plage.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary">✓</span>
              <span>À 10 minutes de la plage de l'Almanarre et à proximité immédiate des départs pour Porquerolles.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary">✓</span>
              <span>Réservation en direct, sans intermédiaire : le meilleur prix garanti.</span>
            </li>
          </ul>
        </section>
      </main>

      <footer className="border-t border-border/60 bg-background">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:py-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Le Nid d'Or à Hyères. Tous droits réservés.</p>
          <div className="flex items-center gap-6">
            <Link to="/" className="hover:text-foreground transition">
              Accueil
            </Link>
            <Link to="/" hash="reserver" className="hover:text-foreground transition">
              Réserver
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
