import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format, differenceInCalendarDays } from "date-fns";
import { fr } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { CalendarIcon, Waves, Sun, Bed, Bath, Users, MapPin, Wifi, Wind, ChefHat, Car, Star } from "lucide-react";
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

import photo1 from "@/assets/listing/photo-1.jpg";
import photo2 from "@/assets/listing/photo-2.jpg";
import photo3 from "@/assets/listing/photo-3.jpg";
import photo4 from "@/assets/listing/photo-4.jpg";
import photo5 from "@/assets/listing/photo-5.jpg";

const CLEANING_FEE = 40;
const DEPOSIT_CASH = 500;
const TOURIST_TAX_PER_PERSON_NIGHT = 1; // approximatif, Hyères meublé non classé
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
        </nav>
        <Button asChild variant="cta" className="rounded-full h-10 px-5 text-sm sm:h-11 sm:px-6 sm:text-base shadow-lg">
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
            <div className="mt-5 sm:mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                className="rounded-full bg-background text-foreground hover:bg-background/90 h-11 sm:h-12 px-5 sm:px-8 text-sm sm:text-base"
              >
                <a href="#reserver">Vérifier les disponibilités</a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full bg-transparent border-background/40 text-primary-foreground hover:bg-background/15 hover:text-primary-foreground h-11 sm:h-12 px-5 sm:px-8 text-sm sm:text-base"
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

function Gallery() {
  return (
    <section id="galerie" className="bg-secondary/40 py-14 sm:py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex items-end justify-between mb-6 sm:mb-10">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Galerie</p>
            <h2 className="mt-2 sm:mt-3 font-display text-[1.75rem] sm:text-4xl md:text-5xl">Le lieu en images</h2>
          </div>
        </div>
        <div className="grid grid-cols-4 grid-rows-2 gap-2 sm:gap-3 md:gap-4 h-[320px] sm:h-[420px] md:h-[560px]">
          <img
            src={PHOTOS[0]}
            alt="Vue mer depuis le studio"
            className="col-span-2 row-span-2 h-full w-full object-cover rounded-2xl"
          />
          <img
            src={PHOTOS[1]}
            alt="Piscine de 18 mètres"
            className="col-span-2 row-span-1 h-full w-full object-cover rounded-2xl"
          />
          <img
            src={PHOTOS[2]}
            alt="Terrasse plein sud"
            className="col-span-1 row-span-1 h-full w-full object-cover rounded-2xl"
          />
          <img
            src={PHOTOS[3]}
            alt="Intérieur du studio"
            className="col-span-1 row-span-1 h-full w-full object-cover rounded-2xl"
          />
        </div>
        <div className="mt-3 sm:mt-4">
          <img src={PHOTOS[4]} alt="Détail du studio" className="h-40 sm:h-64 w-full object-cover rounded-2xl" />
        </div>
      </div>
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
          <div className="mt-6 pt-6 sm:mt-10 sm:pt-8 border-t border-primary-foreground/15">
            <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/60">
              Vous préférez une plateforme ?
            </p>
            <p className="mt-2 sm:mt-3 text-sm text-primary-foreground/70">Réservez aussi via :</p>
            <div className="mt-3 sm:mt-4 flex flex-wrap gap-3">
              <a
                href="https://www.airbnb.fr/rooms/1526120631746320177"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 transition px-5 py-2.5 text-sm font-medium"
              >
                Airbnb <span aria-hidden>↗</span>
              </a>
              <a
                href="https://www.leboncoin.fr/ad/locations_saisonnieres/3216372939"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 transition px-5 py-2.5 text-sm font-medium"
              >
                Leboncoin <span aria-hidden>↗</span>
              </a>
            </div>
          </div>
        </div>
        <div className="lg:col-span-7">
          <BookingForm />
        </div>
      </div>
    </section>
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
  const touristTax = nights > 0 ? nights * guests * TOURIST_TAX_PER_PERSON_NIGHT : 0;
  const total = nights > 0 ? nightsTotal + CLEANING_FEE + touristTax : 0;
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
            + <span className="text-foreground font-medium">~{TOURIST_TAX_PER_PERSON_NIGHT} €</span> de taxe de séjour /
            personne / nuit (collectée à l'arrivée, reversée à la commune)
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
                + {touristTax} € taxe séjour
              </div>
            )}
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="rounded-full h-12 px-6 sm:px-8 w-full sm:w-auto shrink-0"
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
        <p className="mt-3 sm:mt-4 text-sm text-muted-foreground">
          <a
            href="https://maps.app.goo.gl/zZbtek49skWEsvuB7"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition"
          >
            Ouvrir dans Google Maps ↗
          </a>
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-secondary/50 border-t border-border/60">
      <div className="mx-auto max-w-6xl px-5 py-12 grid md:grid-cols-3 gap-8 text-sm">
        <div>
          <div className="font-display text-xl">Le Nid d'Or</div>
          <p className="mt-3 text-muted-foreground">Studio vue mer panoramique à Hyères, France</p>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Contact</div>
          <p className="mt-2">Joëlle, votre hôte sur Hyères qui vous reçoit en personne.</p>
          <p className="text-muted-foreground">Réponse sous 2 h</p>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Bon à savoir</div>
          <p className="mt-2 text-muted-foreground">Arrivée à partir de 16 h · Départ avant 11 h</p>
          <p className="text-muted-foreground">Non-fumeur · Animaux non admis</p>
        </div>
      </div>
      <div className="border-t border-border/60 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Le Nid d'Or — Tous droits réservés
      </div>
    </footer>
  );
}
