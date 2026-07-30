import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, Clock } from "lucide-react";

import { SiteNav } from "@/components/site-nav";
import { Card } from "@/components/ui/card";
import { absoluteUrl, formatFrenchDate, getPublishedPosts, SITE_URL } from "@/lib/blog";

const PAGE_PATH = "/guides-hyeres";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const PAGE_TITLE = "Que faire à Hyères ? Plages, Porquerolles et bonnes adresses | Le Nid d'Or";
const PAGE_DESCRIPTION =
  "Plages, balades, restaurants, excursions et idées de sorties : découvrez nos recommandations pour profiter pleinement de Hyères et des Îles d'Or.";

const PAGE_INTRO =
  "Plages, balades, restaurants, excursions et idées de sorties : découvrez nos recommandations pour profiter pleinement de Hyères et des Îles d'Or.";

/** Groupes affichés sur la page (l'ordre définit l'affichage). */
const GROUPS = [
  { id: "preparer", label: "Préparer son séjour", heading: "Préparer son séjour" },
  { id: "hyeres", label: "Hyères", heading: "Découvrir Hyères" },
  { id: "iles", label: "Îles d'Or", heading: "Porquerolles et les Îles d'Or" },
  { id: "nature", label: "Nature et plages", heading: "Plages, balades et randonnées" },
  { id: "restaurants", label: "Restaurants", heading: "Restaurants et moments à deux" },
] as const;

type GroupId = (typeof GROUPS)[number]["id"];

/** Rattache la catégorie du front matter à un groupe de la page. */
function groupForCategory(category: string): GroupId {
  const c = category.toUpperCase();
  if (c.includes("PRÉPARER")) return "preparer";
  if (c.includes("PORQUEROLLES") || c.includes("ÎLES")) return "iles";
  if (c.includes("SAVEURS") || c.includes("RESTAURANT")) return "restaurants";
  if (c.includes("BALADE") || c.includes("NATURE") || c.includes("PLAGE") || c.includes("GUIDE"))
    return "nature";
  return "hyeres";
}

interface GuideCard {
  slug: string;
  path: string;
  title: string;
  cardTitle: string;
  excerpt: string;
  category: string;
  group: GroupId;
  date: string;
  dateLabel: string;
  readingMinutes: number;
  featuredImage: string;
  featuredImageAlt: string;
}

/** Intro courte pour les cartes : une phrase suffit. */
function shortExcerpt(excerpt: string): string {
  const first = excerpt.split(/(?<=[.!?])\s/)[0] ?? excerpt;
  return first.length > 145 ? `${first.slice(0, 142).trimEnd()}…` : first;
}

export const Route = createFileRoute("/guides-hyeres")({
  loader: (): { posts: GuideCard[] } => ({
    posts: getPublishedPosts().map((post) => ({
      slug: post.slug,
      path: post.path,
      title: post.title,
      cardTitle: post.cardTitle || post.title,
      excerpt: shortExcerpt(post.excerpt),
      category: post.category,
      group: groupForCategory(post.category),
      date: post.date,
      dateLabel: formatFrenchDate(post.date),
      readingMinutes: post.readingMinutes,
      featuredImage: post.featuredImage,
      featuredImageAlt: post.featuredImageAlt,
    })),
  }),

  head: ({ loaderData }) => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: PAGE_URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Que faire à Hyères ?",
          description: PAGE_DESCRIPTION,
          url: PAGE_URL,
          hasPart: (loaderData?.posts ?? []).map((post) => ({
            "@type": "BlogPosting",
            headline: post.title,
            url: `${SITE_URL}${post.path}`,
            datePublished: post.date || undefined,
            image: post.featuredImage ? absoluteUrl(post.featuredImage) : undefined,
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Accueil", item: `${SITE_URL}/` },
            { "@type": "ListItem", position: 2, name: "Que faire à Hyères ?", item: PAGE_URL },
          ],
        }),
      },
    ],
  }),

  component: GuidesPage,
});

function GuideCardItem({ post }: { post: GuideCard }) {
  return (
    <Card className="overflow-hidden border border-border/60 bg-card p-0 flex flex-col">
      <a href={post.path} className="group flex h-full flex-col">
        {post.featuredImage ? (
          <div className="relative aspect-[16/10] overflow-hidden">
            <img
              src={post.featuredImage}
              alt={post.featuredImageAlt}
              loading="lazy"
              decoding="async"
              width={1200}
              height={800}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          </div>
        ) : null}
        <div className="flex flex-1 flex-col p-5 sm:p-6">
          {post.category ? (
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {post.category}
            </p>
          ) : null}
          <h3 className="mt-2 font-display text-xl sm:text-2xl leading-snug group-hover:text-primary transition">
            {post.cardTitle}
          </h3>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{post.excerpt}</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            {post.dateLabel ? (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> {post.dateLabel}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> {post.readingMinutes} min de lecture
            </span>
          </div>
          <span className="mt-auto pt-5 inline-flex text-sm font-medium text-primary">
            Découvrir →
          </span>
        </div>
      </a>
    </Card>
  );
}

function GuidesPage() {
  const { posts } = Route.useLoaderData() as { posts: GuideCard[] };
  const [filter, setFilter] = useState<GroupId | "all">("all");

  const groups = useMemo(
    () =>
      GROUPS.map((group) => ({
        ...group,
        posts: posts.filter((post) => post.group === group.id),
      })).filter((group) => group.posts.length > 0),
    [posts],
  );

  const visible = filter === "all" ? groups : groups.filter((group) => group.id === filter);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />

      <main className="mx-auto max-w-6xl px-5 py-12 sm:py-20">
        <nav aria-label="Fil d'Ariane" className="text-xs sm:text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link to="/" className="hover:text-foreground transition">
                Accueil
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-foreground">Que faire à Hyères ?</li>
          </ol>
        </nav>

        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" /> Retour au studio
        </Link>

        <h1 className="mt-6 font-display text-[2rem] sm:text-5xl leading-[1.1]">
          Que faire à Hyères ?
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] sm:text-lg text-muted-foreground leading-relaxed">
          {PAGE_INTRO}
        </p>

        {posts.length === 0 ? (
          <p className="mt-12 text-muted-foreground">Les premiers guides arrivent très bientôt.</p>
        ) : (
          <>
            <div
              role="group"
              aria-label="Filtrer les guides par thème"
              className="mt-8 flex flex-wrap gap-2"
            >
              <FilterButton
                active={filter === "all"}
                onClick={() => setFilter("all")}
                label="Tout"
              />
              {groups.map((group) => (
                <FilterButton
                  key={group.id}
                  active={filter === group.id}
                  onClick={() => setFilter(group.id)}
                  label={group.label}
                />
              ))}
            </div>

            <div className="mt-10 sm:mt-14 space-y-12 sm:space-y-16">
              {visible.map((group) => (
                <section key={group.id} aria-labelledby={`groupe-${group.id}`}>
                  <h2
                    id={`groupe-${group.id}`}
                    className="font-display text-2xl sm:text-3xl leading-tight"
                  >
                    {group.heading}
                  </h2>
                  <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {group.posts.map((post) => (
                      <GuideCardItem key={post.slug} post={post} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-border/60 bg-background">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:py-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Le Nid d'Or à Hyères. Tous droits réservés.</p>
          <div className="flex items-center gap-6">
            <Link to="/" className="hover:text-foreground transition">
              Accueil
            </Link>
            <a href="/#reserver" className="hover:text-foreground transition">
              Réserver
            </a>
            <a href="/rss.xml" className="hover:text-foreground transition">
              Flux RSS
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-4 py-2 text-sm transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border/70 text-muted-foreground hover:text-foreground hover:border-foreground/40"
      }`}
    >
      {label}
    </button>
  );
}
