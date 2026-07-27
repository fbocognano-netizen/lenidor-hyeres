import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format, differenceInCalendarDays } from "date-fns";
import { fr } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { CalendarIcon, Waves, Sun, Bed, Bath, Users, MapPin, Wifi, Wind, ChefHat, Car, Star, Expand } from "lucide-react";
import { toast, Toaster } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getBlockedDates, createBooking } from "@/lib/bookings.functions";
import { listGalleryPhotos, type GalleryPhoto } from "@/lib/gallery.functions";
import { listPublicOtaLinks, type OtaLink } from "@/lib/ota-links.functions";
import { sendContactMessage, getContactInfo } from "@/lib/contact.functions";
import { Lightbox, useLightbox } from "@/components/lightbox";

import photo1 from "@/assets/listing/photo-1.jpg";
import photo2 from "@/assets/listing/photo-2.jpg";
import photo3 from "@/assets/listing/photo-3.jpg";
import photo4 from "@/assets/listing/photo-4.jpg";
import photo5 from "@/assets/listing/photo-5.jpg";

const CLEANING_FEE = 40;
const DEPOSIT_CASH = 500;
// Taxe de séjour TPM (meublé non classé) : 5 % du prix HT par personne et par nuit,
// plafonné à 3,09 € (2026), majoré de 44 % (10 % département + 34 % région).
const TOURIST_TAX_RATE = 0.05;
const TOURIST_TAX_CAP = 3.09;
const TOURIST_TAX_SURCHARGE = 1.44;
function touristTaxPerPersonNight(nightsTotal: number, nights: number, occupants: number): number {
  if (nights <= 0 || occupants <= 0) return 0;
  // Les frais de ménage ne sont pas inclus dans le prix de l'hébergement.
  const perPersonNight = nightsTotal / nights / occupants;
  return Math.min(perPersonNight * TOURIST_TAX_RATE, TOURIST_TAX_CAP) * TOURIST_TAX_SURCHARGE;
}
function computeTouristTax(nightsTotal: number, nights: number, occupants: number): number {
  const perPn = touristTaxPerPersonNight(nightsTotal, nights, occupants);
  return Math.round(perPn * nights * occupants * 100) / 100;
}
const TOURIST_TAX_CAP_WITH_SURCHARGE = Math.round(TOURIST_TAX_CAP * TOURIST_TAX_SURCHARGE * 100) / 100;
function nightlyRate(d: Date): number {
  const m = d.getMonth() + 1;
  if (m === 7 || m === 8) return 130;
  if (m === 4 || m === 5 || m === 6 || m === 9) return 95;
  return 75;
}
function computeStay(from: Date, to: Date): { nights: number; nightsTotal: number } {
  let nights = 0,
    nightsTotal = 0;
  for (let d = new Date(from); d < to; d = new Date(d.getTime() + 86400000)) {
    nights++;
    nightsTotal += nightlyRate(d);
  }
  return { nights, nightsTotal };
}
const PHOTOS = [photo1, photo2, photo3, photo4, photo5];

const FALLBACK_GALLERY: GalleryPhoto[] = [
  { name: "fallback-1", url: photo1, alt: "Vue mer depuis le studio" },
  { name: "fallback-2", url: photo2, alt: "Piscine de 18 mètres" },
  { name: "fallback-3", url: photo3, alt: "Terrasse plein sud" },
  { name: "fallback-4", url: photo4, alt: "Intérieur du studio" },
  { name: "fallback-5", url: photo5, alt: "Détail du studio" },
];

const galleryQueryOptions = queryOptions({
  queryKey: ["gallery-photos"],
  queryFn: () => listGalleryPhotos(),
  staleTime: 5 * 60 * 1000,
});

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Le Nid d'Or à Hyères • Studio vue mer & piscine • Site officiel" },
      {
        name: "description",
        content:
          "Réservez en direct au Nid d'Or à Hyères : studio vue mer & piscine, terrasse plein sud, calme assuré. Site officiel, sans intermédiaire. Meilleur Prix assuré",
      },
      { property: "og:title", content: "Le Nid d'Or à Hyères • Studio vue mer & piscine • Site officiel" },
      {
        property: "og:description",
        content:
          "Réservez en direct au Nid d'Or à Hyères : studio vue mer & piscine, terrasse plein sud, calme assuré. Site officiel, sans intermédiaire. Meilleur Prix assuré",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://lenidor-hyeres.fr/" },
      { property: "og:image", content: photo1 },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: photo1 },
    ],
    links: [
      { rel: "canonical", href: "https://lenidor-hyeres.fr/" },
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
          "@type": "LodgingBusiness",
          name: "Le Nid d'Or",
          description:
            "Studio vue mer avec piscine et terrasse plein sud à Hyères, face aux Îles d'Or. Location de vacances en direct.",
          image: "https://lenidor-hyeres.fr" + photo1,
          url: "https://lenidor-hyeres.fr/",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Hyères",
            addressRegion: "Var",
            postalCode: "83400",
            addressCountry: "FR",
          },
          geo: { "@type": "GeoCoordinates", latitude: 43.09284, longitude: 6.113301 },
          priceRange: "€€",
          amenityFeature: [
            { "@type": "LocationFeatureSpecification", name: "Piscine", value: true },
            { "@type": "LocationFeatureSpecification", name: "Vue mer", value: true },
            { "@type": "LocationFeatureSpecification", name: "Terrasse", value: true },
          ],
        }),
      },
    ],
  }),
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(galleryQueryOptions);
  },
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster position="top-center" richColors />
      <Nav />
      <Hero />
      <Intro />
      <Testimonials />
      <BeachesGuide />
      <Gallery />
      <Amenities />
      <BookingSection />
      <Location />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/75 border-b border-border/60">
      <div className="mx-auto max-w-6xl px-5 h-14 sm:h-16 flex items-center justify-between gap-3">
        <a href="#top" className="font-display text-base sm:text-xl tracking-tight truncate">
          Le Nid d'Or à Hyères
        </a>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#sejour" className="hover:text-foreground transition">
            Le studio
          </a>
          <a href="#galerie" className="hover:text-foreground transition">
            Photos
          </a>
          <a href="#equipements" className="hover:text-foreground transition">
            Équipements
          </a>
          <a href="#lieu" className="hover:text-foreground transition">
            Le lieu
          </a>
          <Link
            to="/guide-plages-hyeres"
            className="hover:text-foreground transition"
          >
            Plages
          </Link>
        </nav>
        <Button asChild variant="cta" className="rounded-full h-11 px-5 text-sm sm:h-12 sm:px-6 sm:text-base shadow-lg">
          <a href="#reserver">Réserver</a>
        </Button>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="relative">
      <div className="relative h-[82vh] min-h-[460px] sm:h-[78vh] sm:min-h-[520px] w-full overflow-hidden">
        <img
          src={photo2}
          alt="Coucher de soleil sur les Îles d'Or depuis la terrasse du studio à Hyères, deux verres en premier plan"
          className="absolute inset-0 h-full w-full object-cover"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-deep/30 via-deep/10 to-deep/75" />
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto max-w-6xl w-full px-5 pb-8 sm:pb-14 text-primary-foreground">
            <div className="inline-flex items-center gap-2 rounded-full bg-background/15 backdrop-blur px-3 py-1 text-[10px] sm:text-xs uppercase tracking-[0.18em]">
              <MapPin className="h-3 w-3" /> HYÈRES · CÔTE D'AZUR
            </div>
            <h1 className="mt-4 sm:mt-5 font-display text-[2.25rem] sm:text-6xl md:text-7xl leading-[1.08] sm:leading-[1.05] max-w-3xl">
              Le silence du sud,
              <br className="hidden sm:inline" /> face aux Îles d'Or
            </h1>
            <p className="mt-3 sm:mt-5 max-w-xl text-sm sm:text-lg text-primary-foreground/90 whitespace-pre-line">
              18m de piscine vue mer. Une terrasse plein sud. Les îles juste là, devant vous. Pour deux ❤️
            </p>
            <div className="mt-5 sm:mt-8 flex flex-col sm:flex-row gap-3">
              <Button
                asChild
                variant="cta"
                className="rounded-full h-14 px-6 text-base w-full sm:w-auto sm:h-16 sm:px-8 sm:text-lg"
              >
                <a href="#reserver">Vérifier les disponibilités</a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full bg-background/10 border-background/50 text-primary-foreground hover:bg-background/25 hover:text-primary-foreground hover:border-background/70 h-14 px-6 text-base w-full sm:w-auto sm:h-16 sm:px-8 sm:text-lg"
              >
                <a href="#galerie">Voir le lieu</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Intro() {
  return (
    <section id="sejour" className="mx-auto max-w-6xl px-5 py-14 sm:py-20 md:py-24">
      <div className="grid md:grid-cols-12 gap-8 md:gap-10 items-start">
        <div className="md:col-span-7">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Le séjour</p>
          <h2 className="mt-3 font-display text-[1.75rem] sm:text-4xl md:text-5xl leading-[1.15]">
            Le Nid d'Or — Une vue qui s'étire jusqu'à Porquerolles.
          </h2>
          <div className="mt-5 sm:mt-6 space-y-4 text-muted-foreground text-[15px] leading-relaxed whitespace-pre-line">
            <p>
              Niché sur les hauteurs de Hyères dans une résidence privée, ce studio a été pensé comme une retraite à
              deux : un coin nuit confortable, une cuisine équipée, et surtout cette terrasse plein sud d'où l'on suit
              le ballet des voiliers entre Port-Cros et Porquerolles. Le matin, le soleil entre doucement. L'après-midi
              se passe au bord de la piscine de 18m, à l'ombre des pins, face à la baie de Hyères. Le soir, la lumière
              dorée du sud descend sur la mer — et c'est tout.
            </p>
          </div>
        </div>
        <div className="md:col-span-5 grid grid-cols-2 gap-3 sm:gap-4">
          <Stat icon={<Users className="h-4 w-4" />} label="Voyageurs" value="2" />
          <Stat icon={<Bed className="h-4 w-4" />} label="Lits" value="1" />
          <Stat icon={<Bath className="h-4 w-4" />} label="Salle de bain" value="1" />
          <Stat icon={<Star className="h-4 w-4 fill-current" />} label="Note Airbnb" value="5,0" />
        </div>
      </div>
    </section>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-4 sm:p-5 bg-secondary/60 border-border/50 shadow-none">
      <div className="text-muted-foreground">{icon}</div>
      <div className="mt-2 sm:mt-3 font-display text-2xl sm:text-3xl">{value}</div>
      <div className="text-[11px] sm:text-xs uppercase tracking-wider text-muted-foreground mt-0.5 sm:mt-1">
        {label}
      </div>
    </Card>
  );
}

const REVIEWS = [
  {
    name: "Emmanuelle",
    stay: "19–23 juin · 4 nuits",
    text: "❤️❤️\u00a0Je recommande vivement le petit coin de Paradis proposé par Joëlle. Le lieu est serein, on est réveillé par les oiseaux et les cigales, la vue est superbe et Joëlle une hôte extrêmement sympathique et proactive.\u00a0\nC'est un endroit idéal pour se ressourcer loin de l'agitation de la ville mais proche des plages et lieux d'intérêt en 20 minutes de voiture.\u00a0\nJ'y retournerai avec grand plaisir !",
  },
  {
    name: "Benjamin",
    stay: "23–26 juin · 3 nuits",
    text: "Petit logement dans une résidence privée avec place de parking. C'était très bien. Parlons de la vue qui est juste INCROYABLEEEEE, pas besoin de TV ou de téléphone quand on a un spectacle pareil. J'ai passé mes soirées à contempler ce paysage rayonnant de couleur.\u00a0\nRien que pour ça vous pouvez réserver, vous serez émerveillé.",
  },
  {
    name: "Manon",
    stay: "19–21 mai · 2 nuits",
    text: "Très bon séjour dans le merveilleux studio de Joëlle. Et surtout quelle vue !\u00a0\nOn ne voit clairement pas cela tous les jours… De la contemplation matin midi et soir (vue mer depuis le lit). Studio fonctionnel, canapé lit très confortable, grande piscine dans la résidence tout proche (avec vue bien sûr !).\nBref un super séjour, le plus dur c'est de repartir !",
  },
  {
    name: "Eric",
    stay: "26–28 juin · 2 nuits",
    text: "Ce studio va vous offrir une vue imprenable et une invitation à la contemplation. Il y a un petit chemin piéton juste devant le studio mais très peu de passage lors de notre séjour.\u00a0\n\n\nLa literie du canapé était bonne et nous avons passé un excellent séjour.\nÀ refaire !!\u00a0❤️❤️\u00a0\u00a0",
  },
];

function Testimonials() {
  return (
    <section id="avis" className="bg-secondary/40 py-14 sm:py-20 md:py-24 border-y border-border/40">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8 sm:mb-12">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ils ont séjourné ici</p>
            <h2 className="mt-2 sm:mt-3 font-display text-[1.75rem] sm:text-4xl md:text-5xl leading-[1.15]">
              Note 5,0 sur Airbnb
            </h2>
          </div>
          <div className="flex items-center gap-1 text-[var(--color-accent)]" aria-label="Note 5 sur 5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4 sm:h-5 sm:w-5 fill-current" />
            ))}
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
          {REVIEWS.map((r) => (
            <Card
              key={r.name}
              className="p-5 sm:p-7 bg-background border-border/60 rounded-2xl shadow-none flex flex-col"
            >
              <div className="flex items-center gap-1 text-[var(--color-accent)]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-current" />
                ))}
              </div>
              <blockquote className="mt-3 sm:mt-4 text-[15px] leading-relaxed text-foreground/85 whitespace-pre-line">
                « {r.text} »
              </blockquote>
              <div className="mt-4 sm:mt-5 pt-4 border-t border-border/60">
                <div className="font-display text-lg">{r.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{r.stay}</div>
              </div>
            </Card>
          ))}
        </div>
        <p className="mt-6 sm:mt-8 text-xs text-muted-foreground text-center">
          Avis authentiques laissés sur Airbnb par d'anciens voyageurs.
        </p>
      </div>
    </section>
  );
}

function BeachesGuide() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-14 sm:py-20 md:py-24">
      <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Guide</p>
          <h2 className="mt-3 font-display text-[1.75rem] sm:text-4xl md:text-5xl leading-[1.15]">
            Les plus belles plages de Hyères
          </h2>
          <p className="mt-5 sm:mt-6 text-muted-foreground text-[15px] leading-relaxed">
            De la célèbre <strong>plage de l'Almanarre</strong> à 10 minutes, aux criques de Porquerolles accessibles en bateau, découvrez les spots de rêve pour vos <strong>vacances à Hyères</strong>.
          </p>
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3">
            <Button
              asChild
              variant="cta"
              className="rounded-full h-12 px-6 text-sm sm:h-14 sm:px-8 sm:text-base"
            >
              <Link to="/guide-plages-hyeres">Lire le guide des plages</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-full h-12 px-6 text-sm sm:h-14 sm:px-8 sm:text-base"
            >
              <a href="#reserver">Réserver le studio</a>
            </Button>
          </div>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
          <img
            src={photo2}
            alt="Vue mer depuis la terrasse du Nid d'Or, proche des plages de Hyères"
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}

function Gallery() {
  const { data } = useSuspenseQuery(galleryQueryOptions);
  const photos: GalleryPhoto[] = data.photos.length > 0 ? data.photos : FALLBACK_GALLERY;
  const lb = useLightbox();

  const featured = photos.slice(0, 5);
  const extras = photos.slice(5);

  const tile = (i: number, extra: string) => {
    const p = featured[i];
    if (!p) return null;
    return (
      <button
        type="button"
        onClick={() => lb.open(i)}
        aria-label={`Agrandir : ${p.alt}`}
        className={cn(
          "group relative overflow-hidden rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          extra,
        )}
      >
        <img
          src={p.url}
          alt={p.alt}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
        />
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-deep/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />
        <span className="pointer-events-none absolute right-2 top-2 sm:right-3 sm:top-3 grid h-9 w-9 place-items-center rounded-full bg-white/85 text-deep opacity-0 group-hover:opacity-100 transition">
          <Expand className="h-4 w-4" />
        </span>
      </button>
    );
  };

  return (
    <section id="galerie" className="bg-secondary/40 py-14 sm:py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex items-end justify-between mb-6 sm:mb-10">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Galerie</p>
            <h2 className="mt-2 sm:mt-3 font-display text-[1.75rem] sm:text-4xl md:text-5xl">Le lieu en images</h2>
            <p className="mt-2 text-sm text-muted-foreground">Cliquez sur une photo pour l'agrandir.</p>
          </div>
        </div>

        {featured.length >= 4 ? (
          <div className="grid grid-cols-4 grid-rows-2 gap-2 sm:gap-3 md:gap-4 h-[320px] sm:h-[420px] md:h-[560px]">
            {tile(0, "col-span-2 row-span-2")}
            {tile(1, "col-span-2 row-span-1")}
            {tile(2, "col-span-1 row-span-1")}
            {tile(3, "col-span-1 row-span-1")}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            {featured.map((_, i) => (
              <div key={featured[i].name} className="h-56 sm:h-72">
                {tile(i, "h-full w-full")}
              </div>
            ))}
          </div>
        )}

        {featured[4] && (
          <div className="mt-3 sm:mt-4 h-40 sm:h-64">{tile(4, "h-full w-full")}</div>
        )}

        {extras.length > 0 && (
          <div className="mt-3 sm:mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
            {extras.map((p, i) => {
              const globalIndex = i + 5;
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => lb.open(globalIndex)}
                  aria-label={`Agrandir : ${p.alt}`}
                  className="group relative overflow-hidden rounded-2xl h-36 sm:h-44 md:h-48 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <img
                    src={p.url}
                    alt={p.alt}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Lightbox
        photos={photos}
        index={lb.openIndex}
        onClose={lb.close}
        onIndexChange={lb.setIndex}
      />
    </section>
  );
}

function Amenities() {
  const items = [
    { icon: <Waves className="h-5 w-5" />, label: "Piscine de 18 m, vue mer & îles d'Or" },
    { icon: <Sun className="h-5 w-5" />, label: "Terrasse plein sud & vue mer panoramique" },
    { icon: <Wifi className="h-5 w-5" />, label: "TV Connectée" },
    { icon: <Wind className="h-5 w-5" />, label: "Frais tout l'été" },
    { icon: <ChefHat className="h-5 w-5" />, label: "Cuisine équipée" },
    { icon: <Car className="h-5 w-5" />, label: "Parking privé" },
  ];
  return (
    <section id="equipements" className="mx-auto max-w-6xl px-5 py-14 sm:py-20 md:py-24">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Équipements</p>
      <h2 className="mt-2 sm:mt-3 font-display text-[1.75rem] sm:text-4xl md:text-5xl max-w-2xl">
        Tout ce qu'il faut, rien de superflu.
      </h2>
      <div className="mt-8 sm:mt-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2 sm:gap-y-6">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-3 py-3 sm:py-4 border-t border-border/60">
            <span className="text-[var(--color-sea)] shrink-0">{it.icon}</span>
            <span className="text-[15px]">{it.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function BookingSection() {
  return (
    <section id="reserver" className="bg-[var(--color-deep)] text-primary-foreground py-14 sm:py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-5 grid lg:grid-cols-12 gap-8 lg:gap-12">
        <div className="lg:col-span-5">
          <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/60">Réservation directe</p>
          <h2 className="mt-2 sm:mt-3 font-display text-[1.75rem] sm:text-4xl md:text-5xl">
            Réservez sans commission.
          </h2>
          <p className="mt-4 sm:mt-5 text-primary-foreground/75 leading-relaxed text-[15px]">
            Calendrier synchronisé avec Airbnb en temps réel. Choisissez vos dates, envoyez votre demande, je confirme
            sous 24 h avec les modalités de paiement.
          </p>
          <ul className="mt-6 sm:mt-8 space-y-2 sm:space-y-3 text-sm text-primary-foreground/85">
            <li className="flex gap-3">
              <span className="text-[var(--color-accent)]">—</span> Tarif direct, sans frais de service
            </li>
            <li className="flex gap-3">
              <span className="text-[var(--color-accent)]">—</span> Échange direct avec Joëlle, votre hôte
            </li>
            <li className="flex gap-3">
              <span className="text-[var(--color-accent)]">—</span> Minimum 2 nuits · 2 voyageurs
            </li>
          </ul>
          <OtaPlatforms />

        </div>
        <div className="lg:col-span-7">
          <BookingForm />
        </div>
      </div>
    </section>
  );
}

const FALLBACK_OTA_LINKS: OtaLink[] = [
  { id: "fallback-airbnb", url: "https://www.airbnb.fr/rooms/1526120631746320177", label: "Airbnb", position: 10, enabled: true },
  { id: "fallback-leboncoin", url: "https://www.leboncoin.fr/ad/locations_saisonnieres/3216372939", label: "Leboncoin", position: 20, enabled: true },
];

function OtaPlatforms() {
  const load = useServerFn(listPublicOtaLinks);
  const query = useQuery({
    queryKey: ["public-ota-links"],
    queryFn: () => load(),
    staleTime: 5 * 60 * 1000,
  });
  const links = (query.data?.links?.length ? query.data.links : FALLBACK_OTA_LINKS);
  if (links.length === 0) return null;
  return (
    <div className="mt-6 pt-6 sm:mt-10 sm:pt-8 border-t border-primary-foreground/15">
      <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/60">
        Vous préférez une plateforme&nbsp;?
      </p>
      <p className="mt-2 sm:mt-3 text-sm text-primary-foreground/70">Réservez aussi via&nbsp;:</p>
      <div className="mt-3 sm:mt-4 flex flex-wrap gap-3">
        {links.map((link) => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-primary-foreground text-deep hover:bg-primary-foreground/90 transition px-7 h-12 text-sm sm:px-8 sm:text-base font-semibold shadow-lg"
          >
            {link.label} <span aria-hidden>↗</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function BookingForm() {
  const [range, setRange] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const getBlocked = useServerFn(getBlockedDates);
  const submitBooking = useServerFn(createBooking);

  const { data: blockedData } = useQuery({
    queryKey: ["blocked-dates"],
    queryFn: () => getBlocked(),
    staleTime: 5 * 60 * 1000,
  });

  const ranges = useMemo(() => {
    const rs = blockedData?.ranges ?? [];
    return rs.map((r) => ({ start: r.start.slice(0, 10), end: r.end.slice(0, 10) }));
  }, [blockedData]);

  const todayKey = useMemo(() => dateKey(new Date()), []);

  const isBlocked = (d: Date) => {
    const day = dateKey(d);
    if (day < todayKey) return true;

    // A day is "occupied" if it's a booked night: start <= d < end.
    // The end date itself is a turnover (checkout) day and stays free.
    const occupied = ranges.some((r) => day >= r.start && day < r.end);

    // When selecting the checkout date, allow the next booking's check-in
    // day as a valid checkout (same-day turnover, hotel-style).
    const fromDay = range?.from ? dateKey(range.from) : null;
    const toDay = range?.to ? dateKey(range.to) : null;
    if (fromDay && (!toDay || toDay === fromDay) && day > fromDay) {
      let earliestBlock: string | null = null;
      for (const r of ranges) {
        if (r.start > fromDay && (!earliestBlock || r.start < earliestBlock)) earliestBlock = r.start;
      }
      // Days strictly after the next booking's start are disabled;
      // days from (from, earliestBlock] remain selectable as checkout.
      return earliestBlock ? day > earliestBlock : false;
    }

    return occupied;
  };

  const nights = range?.from && range?.to ? differenceInCalendarDays(range.to, range.from) : 0;
  const { nightsTotal } = range?.from && range?.to ? computeStay(range.from, range.to) : { nightsTotal: 0 };
  const touristTax = nights > 0 ? computeTouristTax(nightsTotal, nights, guests) : 0;
  const total = nights > 0 ? Math.round((nightsTotal + CLEANING_FEE + touristTax) * 100) / 100 : 0;
  const avgRate = nights > 0 ? Math.round(nightsTotal / nights) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!range?.from || !range?.to) return toast.error("Choisissez vos dates");
    if (nights < 2) return toast.error("Minimum 2 nuits");
    if (!name || !email) return toast.error("Nom et email requis");

    setSubmitting(true);
    try {
      await submitBooking({
        data: {
          guest_name: name,
          email,
          phone: phone || null,
          check_in: format(range.from, "yyyy-MM-dd"),
          check_out: format(range.to, "yyyy-MM-dd"),
          guests,
          message: message || null,
        },
      });
      toast.success("Demande envoyée ! Vous recevrez une confirmation sous 24 h.");
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
      setRange(undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-5 sm:p-8 bg-background text-foreground rounded-3xl border-0 shadow-2xl">
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Arrivée — Départ</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "mt-2 w-full justify-start text-left font-normal h-11 rounded-xl",
                    !range && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {range?.from
                    ? range.to
                      ? `${format(range.from, "d MMM", { locale: fr })} → ${format(range.to, "d MMM yyyy", { locale: fr })}`
                      : format(range.from, "d MMM yyyy", { locale: fr })
                    : "Choisir les dates"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                <Calendar
                  mode="range"
                  selected={range}
                  onSelect={setRange}
                  min={2}
                  numberOfMonths={2}
                  disabled={isBlocked}
                  locale={fr}
                  initialFocus
                  className="pointer-events-auto p-3"
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Voyageurs</Label>
            <div className="mt-2 flex items-center gap-2 h-11 rounded-xl border border-input px-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Diminuer le nombre de voyageurs"
                className="h-7 w-7 p-0 rounded-full"
                onClick={() => setGuests(Math.max(1, guests - 1))}
              >
                −
              </Button>
              <div className="flex-1 text-center text-sm">
                {guests} voyageur{guests > 1 ? "s" : ""}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Augmenter le nombre de voyageurs"
                className="h-7 w-7 p-0 rounded-full"
                onClick={() => setGuests(Math.min(2, guests + 1))}
              >
                +
              </Button>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name" className="text-xs uppercase tracking-wider text-muted-foreground">
              Nom complet
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-2 h-11 rounded-xl"
            />
          </div>
          <div>
            <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-2 h-11 rounded-xl"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="phone" className="text-xs uppercase tracking-wider text-muted-foreground">
            Téléphone (optionnel)
          </Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-2 h-11 rounded-xl" />
        </div>

        <div>
          <Label htmlFor="msg" className="text-xs uppercase tracking-wider text-muted-foreground">
            Message (optionnel)
          </Label>
          <Textarea
            id="msg"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="mt-2 rounded-xl"
            placeholder="Heure d'arrivée, occasion spéciale…"
          />
        </div>

        <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
          <div>
            Tarifs par nuit : <span className="text-foreground font-medium">75 €</span> basse ·{" "}
            <span className="text-foreground font-medium">95 €</span> moyenne (avr-juin, sept) ·{" "}
            <span className="text-foreground font-medium">130 €</span> haute (juil-août)
          </div>
          <div>
            + <span className="text-foreground font-medium">{CLEANING_FEE} €</span> de frais de ménage (une fois par
            séjour)
          </div>
          <div>
            + taxe de séjour :{" "}
            <span className="text-foreground font-medium">
              5 % du prix de la nuit par personne
            </span>{" "}
            (hors ménage), majorée de 44 % (département + région), plafonnée à{" "}
            <span className="text-foreground font-medium">
              {TOURIST_TAX_CAP_WITH_SURCHARGE.toFixed(2).replace(".", ",")} €
            </span>{" "}
            / personne / nuit — collectée à l'arrivée, reversée à la commune
          </div>
          <div>
            Caution de <span className="text-foreground font-medium">{DEPOSIT_CASH} €</span> en espèces à régler à
            l'arrivée (restituée au départ)
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pt-3 border-t border-border">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Total estimé</div>
            <div className="font-display text-2xl sm:text-3xl mt-1">
              {nights > 0 ? `${total} €` : `à partir de 75 € / nuit`}
            </div>
            {nights > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                {nights} nuit{nights > 1 ? "s" : ""} · {nightsTotal} € ({avgRate} €/nuit moy.) + {CLEANING_FEE} € ménage
                + {touristTax.toFixed(2).replace(".", ",")} € taxe séjour
              </div>
            )}
          </div>
          <Button
            type="submit"
            disabled={submitting}
            variant="cta"
            className="rounded-full h-14 px-8 text-base w-full sm:w-auto sm:h-16 sm:px-10 sm:text-lg shrink-0"
          >
            {submitting ? "Envoi…" : "Demander à réserver"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Location() {
  return (
    <section id="lieu" className="mx-auto max-w-6xl px-5 py-14 sm:py-20 md:py-24">
      <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Le lieu</p>
          <h2 className="mt-2 sm:mt-3 font-display text-[1.75rem] sm:text-4xl md:text-5xl">
            Hyères, porte des Îles d'Or.
          </h2>
          <p className="mt-4 sm:mt-5 text-muted-foreground leading-relaxed text-[15px]">
            À 10 minutes en voiture des plages de l'Almanarre, à 15 minutes du port pour Porquerolles, à 15 minutes du
            centre historique. Tout est proche si vous le désirez, mais vous êtes au calme et au paradis en même temps.
          </p>
          <ul className="mt-6 sm:mt-8 space-y-2 sm:space-y-3 text-sm">
            <li className="flex justify-between border-b border-border/60 pb-2 sm:pb-3">
              <span>Plage de l'Almanarre</span>
              <span className="text-muted-foreground">10 min</span>
            </li>
            <li className="flex justify-between border-b border-border/60 pb-2 sm:pb-3">
              <span>Port de la Tour Fondue</span>
              <span className="text-muted-foreground">15 min</span>
            </li>
            <li className="flex justify-between border-b border-border/60 pb-2 sm:pb-3">
              <span>Centre historique</span>
              <span className="text-muted-foreground">15 min</span>
            </li>
            <li className="flex justify-between border-b border-border/60 pb-2 sm:pb-3">
              <span>Aéroport Toulon-Hyères</span>
              <span className="text-muted-foreground">11 min</span>
            </li>
          </ul>
        </div>
        <div className="aspect-[4/5] overflow-hidden rounded-3xl">
          <img src={photo2} alt="Vue extérieure et piscine" className="h-full w-full object-cover" />
        </div>
      </div>
      <div className="mt-10 sm:mt-16">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sur la carte</p>
        <h3 className="mt-2 sm:mt-3 font-display text-2xl sm:text-3xl md:text-4xl">L'emplacement du studio</h3>
        <p className="mt-2 sm:mt-3 text-muted-foreground max-w-2xl text-[15px]">
          Quartier du Mont des Oiseaux, sur les hauteurs de Hyères — à quelques minutes des plages et du port pour
          Porquerolles.
        </p>
        <div className="mt-5 sm:mt-8 overflow-hidden rounded-3xl border border-border/60 shadow-sm">
          <iframe
            title="Emplacement du studio à Hyères sur Google Maps"
            src="https://www.google.com/maps?q=43.092840,6.113301&z=11&output=embed"
            className="w-full h-[300px] sm:h-[420px] md:h-[480px] border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
        <div className="mt-4 sm:mt-6">
          <Button
            asChild
            variant="cta"
            className="rounded-full h-12 px-6 text-sm sm:h-14 sm:px-8 sm:text-base"
          >
            <a
              href="https://maps.app.goo.gl/zZbtek49skWEsvuB7"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ouvrir dans Google Maps <span aria-hidden>↗</span>
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.052 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitContact = useServerFn(sendContactMessage);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !message) return toast.error("Nom, email et message sont requis");

    setSubmitting(true);
    try {
      await submitContact({
        data: { name, email, phone: phone || null, message },
      });
      toast.success("Message envoyé ! Joëlle vous répond sous 2 h.");
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <Input
          type="text"
          placeholder="Votre nom"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="h-11 rounded-xl bg-background"
        />
        <Input
          type="email"
          placeholder="Votre email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-11 rounded-xl bg-background"
        />
      </div>
      <Input
        type="tel"
        placeholder="Téléphone (optionnel)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="h-11 rounded-xl bg-background"
      />
      <Textarea
        placeholder="Votre message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        required
        rows={3}
        className="rounded-xl bg-background resize-none"
      />
      <Button
        type="submit"
        disabled={submitting}
        variant="cta"
        className="rounded-full h-12 px-6 text-sm w-full sm:w-auto"
      >
        {submitting ? "Envoi…" : "Envoyer mon message"}
      </Button>
    </form>
  );
}

function Footer() {
  const loadContact = useServerFn(getContactInfo);
  const { data: contact } = useQuery({
    queryKey: ["contact-info"],
    queryFn: () => loadContact(),
    staleTime: 10 * 60 * 1000,
  });

  return (
    <footer id="contact" className="bg-secondary/50 border-t border-border/60">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
        <div className="grid md:grid-cols-12 gap-10 md:gap-8">
          <div className="md:col-span-4">
            <div className="font-display text-2xl">Le Nid d'Or</div>
            <p className="mt-3 text-muted-foreground text-[15px] leading-relaxed">
              Studio vue mer panoramique à Hyères, avec piscine et terrasse plein sud. Votre hôte Joëlle vous reçoit en
              personne.
            </p>
          </div>

          <div className="md:col-span-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Joëlle, votre hôte</div>
            <p className="mt-3 text-[15px]">Une question avant de réserver ?</p>
            <p className="mt-1 text-sm text-muted-foreground">Réponse sous 2 h</p>

            {contact?.whatsappUrl && (
              <Button
                asChild
                variant="cta"
                className="mt-4 rounded-full h-12 px-5 text-sm w-full sm:w-auto"
              >
                <a href={contact.whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon className="h-5 w-5" />
                  <span>WhatsApp</span>
                </a>
              </Button>
            )}

            {!contact?.phone && (
              <p className="mt-3 text-xs text-muted-foreground italic">Numéro de contact à configurer.</p>
            )}
          </div>

          <div className="md:col-span-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Envoyer un message</div>
            <p className="mt-3 text-[15px] mb-4">Joëlle revient vers vous par email ou téléphone.</p>
            <ContactForm />
          </div>
        </div>
      </div>
      <div className="border-t border-border/60 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Le Nid d'Or — Tous droits réservés
        <span className="mx-2" aria-hidden="true">·</span>
        <Link to="/guides-hyeres" className="hover:text-foreground transition">
          Guides de Hyères
        </Link>
      </div>
    </footer>
  );
}
