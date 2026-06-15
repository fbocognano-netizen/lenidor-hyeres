import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format, differenceInCalendarDays, addDays } from "date-fns";
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

const PRICE_PER_NIGHT = 95;
const PHOTOS = [photo1, photo2, photo3, photo4, photo5];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Studio vue mer — Hyères, Îles d'Or | Réservation directe" },
      {
        name: "description",
        content:
          "Studio calme avec vue panoramique sur les Îles d'Or, piscine, terrasse plein sud. Réservation en direct sans commission, à Hyères.",
      },
      { property: "og:title", content: "Studio vue mer — Hyères, Îles d'Or" },
      { property: "og:description", content: "Vue panoramique, piscine, terrasse plein sud. Réservez en direct." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: photo1 },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: photo1 },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500&family=Inter:wght@300;400;500;600&display=swap",
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
      <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
        <a href="#top" className="font-display text-xl tracking-tight">
          Villa <span className="italic text-[var(--color-sea)]">d'Or</span>
        </a>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#sejour" className="hover:text-foreground transition">Le studio</a>
          <a href="#galerie" className="hover:text-foreground transition">Photos</a>
          <a href="#equipements" className="hover:text-foreground transition">Équipements</a>
          <a href="#lieu" className="hover:text-foreground transition">Le lieu</a>
        </nav>
        <Button asChild size="sm" className="rounded-full">
          <a href="#reserver">Réserver</a>
        </Button>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="relative">
      <div className="relative h-[78vh] min-h-[520px] w-full overflow-hidden">
        <img
          src={photo1}
          alt="Vue panoramique sur les Îles d'Or depuis le studio à Hyères"
          className="absolute inset-0 h-full w-full object-cover"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-deep/30 via-deep/10 to-deep/60" />
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto max-w-6xl w-full px-5 pb-14 text-primary-foreground">
            <div className="inline-flex items-center gap-2 rounded-full bg-background/15 backdrop-blur px-3 py-1 text-xs uppercase tracking-[0.18em]">
              <MapPin className="h-3 w-3" /> Hyères · Côte d'Azur
            </div>
            <h1 className="mt-5 font-display text-5xl sm:text-6xl md:text-7xl leading-[1.05] max-w-3xl">
              Le silence du sud,<br />face aux Îles d'Or.
            </h1>
            <p className="mt-5 max-w-xl text-base sm:text-lg text-primary-foreground/85">
              Un studio lumineux, une piscine de 17 m, une terrasse plein sud.
              Pour deux, le temps d'une parenthèse au bord de la Méditerranée.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full bg-background text-foreground hover:bg-background/90">
                <a href="#reserver">Vérifier les disponibilités</a>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full bg-transparent border-background/40 text-primary-foreground hover:bg-background/15 hover:text-primary-foreground">
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
    <section id="sejour" className="mx-auto max-w-6xl px-5 py-24">
      <div className="grid md:grid-cols-12 gap-10 items-start">
        <div className="md:col-span-7">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Le séjour</p>
          <h2 className="mt-3 font-display text-4xl sm:text-5xl leading-tight">
            Une vue qui s'étire jusqu'à Porquerolles.
          </h2>
          <div className="mt-6 space-y-4 text-muted-foreground text-[15px] leading-relaxed">
            <p>
              Niché sur les hauteurs de Hyères, ce studio a été pensé comme une retraite à deux :
              un coin nuit confortable, une cuisine équipée, et surtout cette terrasse plein sud d'où l'on
              suit le ballet des voiliers entre Port-Cros et Porquerolles.
            </p>
            <p>
              Le matin, le soleil entre doucement. L'après-midi se passe au bord de la piscine de 17 mètres,
              à l'ombre des pins. Le soir, la lumière dorée du sud descend sur la mer — et c'est tout.
            </p>
          </div>
        </div>
        <div className="md:col-span-5 grid grid-cols-2 gap-4">
          <Stat icon={<Users className="h-4 w-4" />} label="Voyageurs" value="1" />
          <Stat icon={<Bed className="h-4 w-4" />} label="Lits" value="2" />
          <Stat icon={<Bath className="h-4 w-4" />} label="Salle de bain" value="1" />
          <Stat icon={<Star className="h-4 w-4 fill-current" />} label="Note Airbnb" value="5,0" />
        </div>
      </div>
    </section>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-5 bg-secondary/60 border-border/50 shadow-none">
      <div className="text-muted-foreground">{icon}</div>
      <div className="mt-3 font-display text-3xl">{value}</div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
    </Card>
  );
}

function Gallery() {
  return (
    <section id="galerie" className="bg-secondary/40 py-24">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Galerie</p>
            <h2 className="mt-3 font-display text-4xl sm:text-5xl">Le lieu en images</h2>
          </div>
        </div>
        <div className="grid grid-cols-4 grid-rows-2 gap-3 md:gap-4 h-[420px] md:h-[560px]">
          <img src={PHOTOS[0]} alt="Vue mer depuis le studio" className="col-span-2 row-span-2 h-full w-full object-cover rounded-2xl" />
          <img src={PHOTOS[1]} alt="Piscine de 17 mètres" className="col-span-2 row-span-1 h-full w-full object-cover rounded-2xl" />
          <img src={PHOTOS[2]} alt="Terrasse plein sud" className="col-span-1 row-span-1 h-full w-full object-cover rounded-2xl" />
          <img src={PHOTOS[3]} alt="Intérieur du studio" className="col-span-1 row-span-1 h-full w-full object-cover rounded-2xl" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:gap-4">
          <img src={PHOTOS[4]} alt="Détail du studio" className="h-64 w-full object-cover rounded-2xl" />
          <img src={PHOTOS[1]} alt="Vue piscine" className="h-64 w-full object-cover rounded-2xl" />
        </div>
      </div>
    </section>
  );
}

function Amenities() {
  const items = [
    { icon: <Waves className="h-5 w-5" />, label: "Piscine de 17 m" },
    { icon: <Sun className="h-5 w-5" />, label: "Terrasse plein sud & vue mer panoramique" },
    { icon: <Wifi className="h-5 w-5" />, label: "TV Connectée" },
    { icon: <Wind className="h-5 w-5" />, label: "Frais tout l'été" },
    { icon: <ChefHat className="h-5 w-5" />, label: "Cuisine équipée" },
    { icon: <Car className="h-5 w-5" />, label: "Parking privé" },
  ];
  return (
    <section id="equipements" className="mx-auto max-w-6xl px-5 py-24">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Équipements</p>
      <h2 className="mt-3 font-display text-4xl sm:text-5xl max-w-2xl">Tout ce qu'il faut, rien de superflu.</h2>
      <div className="mt-12 grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-6">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-4 py-4 border-t border-border/60">
            <span className="text-[var(--color-sea)]">{it.icon}</span>
            <span className="text-[15px]">{it.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function BookingSection() {
  return (
    <section id="reserver" className="bg-[var(--color-deep)] text-primary-foreground py-24">
      <div className="mx-auto max-w-6xl px-5 grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5">
          <p className="text-xs uppercase tracking-[0.2em] text-primary-foreground/60">Réservation directe</p>
          <h2 className="mt-3 font-display text-4xl sm:text-5xl">Réservez sans commission.</h2>
          <p className="mt-5 text-primary-foreground/75 leading-relaxed">
            Calendrier synchronisé avec Airbnb en temps réel. Choisissez vos dates, envoyez votre demande,
            je confirme sous 24 h avec les modalités de paiement.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-primary-foreground/85">
            <li className="flex gap-3"><span className="text-[var(--color-accent)]">—</span> Tarif direct, sans frais de service</li>
            <li className="flex gap-3"><span className="text-[var(--color-accent)]">—</span> Échange direct avec Joëlle, votre hôte</li>
            <li className="flex gap-3"><span className="text-[var(--color-accent)]">—</span> Minimum 2 nuits · 2 voyageurs</li>
          </ul>
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

  const blockedDates = useMemo(() => {
    const out: Date[] = [];
    const ranges = blockedData?.ranges ?? [];
    for (const r of ranges) {
      const s = new Date(r.start);
      const e = new Date(r.end);
      for (let d = new Date(s); d < e; d = addDays(d, 1)) {
        out.push(new Date(d));
      }
    }
    return out;
  }, [blockedData]);

  const isBlocked = (d: Date) =>
    blockedDates.some((b) => b.toDateString() === d.toDateString()) || d < new Date(new Date().toDateString());

  const nights = range?.from && range?.to ? differenceInCalendarDays(range.to, range.from) : 0;
  const total = nights * PRICE_PER_NIGHT;

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
      setName(""); setEmail(""); setPhone(""); setMessage(""); setRange(undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-6 sm:p-8 bg-background text-foreground rounded-3xl border-0 shadow-2xl">
      <form onSubmit={handleSubmit} className="space-y-5">
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
              <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full" onClick={() => setGuests(Math.max(1, guests - 1))}>−</Button>
              <div className="flex-1 text-center text-sm">{guests} voyageur{guests > 1 ? "s" : ""}</div>
              <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full" onClick={() => setGuests(Math.min(2, guests + 1))}>+</Button>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name" className="text-xs uppercase tracking-wider text-muted-foreground">Nom complet</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-2 h-11 rounded-xl" />
          </div>
          <div>
            <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-2 h-11 rounded-xl" />
          </div>
        </div>

        <div>
          <Label htmlFor="phone" className="text-xs uppercase tracking-wider text-muted-foreground">Téléphone (optionnel)</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-2 h-11 rounded-xl" />
        </div>

        <div>
          <Label htmlFor="msg" className="text-xs uppercase tracking-wider text-muted-foreground">Message (optionnel)</Label>
          <Textarea id="msg" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="mt-2 rounded-xl" placeholder="Heure d'arrivée, occasion spéciale…" />
        </div>

        <div className="flex items-end justify-between pt-2 border-t border-border">
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Total estimé</div>
            <div className="font-display text-3xl mt-1">
              {nights > 0 ? `${total} €` : `${PRICE_PER_NIGHT} € / nuit`}
            </div>
            {nights > 0 && <div className="text-xs text-muted-foreground mt-1">{nights} nuit{nights > 1 ? "s" : ""} · {PRICE_PER_NIGHT} €/nuit</div>}
          </div>
          <Button type="submit" disabled={submitting} size="lg" className="rounded-full px-8">
            {submitting ? "Envoi…" : "Demander à réserver"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Location() {
  return (
    <section id="lieu" className="mx-auto max-w-6xl px-5 py-24">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Le lieu</p>
          <h2 className="mt-3 font-display text-4xl sm:text-5xl">Hyères, porte des Îles d'Or.</h2>
          <p className="mt-5 text-muted-foreground leading-relaxed">
            À 10 minutes des plages de l'Almanarre, à 15 minutes du port pour Porquerolles, à 15 minutes du
            centre historique.
            
            Tout est proche si vous le désirez, mais vous êtes au calme et au paradis en même temps.
          </p>
          <ul className="mt-8 space-y-3 text-sm">
            <li className="flex justify-between border-b border-border/60 pb-3"><span>Plage de l'Almanarre</span><span className="text-muted-foreground">10 min</span></li>
            <li className="flex justify-between border-b border-border/60 pb-3"><span>Port de la Tour Fondue</span><span className="text-muted-foreground">15 min</span></li>
            <li className="flex justify-between border-b border-border/60 pb-3"><span>Centre historique</span><span className="text-muted-foreground">15 min</span></li>
            <li className="flex justify-between border-b border-border/60 pb-3"><span>Aéroport Toulon-Hyères</span><span className="text-muted-foreground">11 min</span></li>
          </ul>
        </div>
        <div className="aspect-[4/5] overflow-hidden rounded-3xl">
          <img src={photo2} alt="Vue extérieure et piscine" className="h-full w-full object-cover" />
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-secondary/50 border-t border-border/60">
      <div className="mx-auto max-w-6xl px-5 py-12 grid md:grid-cols-3 gap-8 text-sm">
        <div>
          <div className="font-display text-xl">Villa <span className="italic text-[var(--color-sea)]">d'Or</span></div>
          <p className="mt-3 text-muted-foreground">Studio vue mer · Hyères, France</p>
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
        © {new Date().getFullYear()} Villa d'Or — Tous droits réservés
      </div>
    </footer>
  );
}
