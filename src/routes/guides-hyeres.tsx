import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { absoluteUrl, formatFrenchDate, getPublishedPosts, SITE_URL } from "@/lib/blog";

const PAGE_PATH = "/guides-hyeres";
const PAGE_URL = `${SITE_URL}${PAGE_PATH}`;
const PAGE_TITLE = "Guides de Hyères : plages, Porquerolles et bonnes adresses | Le Nid d'Or";
const PAGE_DESCRIPTION =
  "Tous nos guides pour préparer vos vacances à Hyères : plages, Îles d'Or, presqu'île de Giens et bonnes adresses, écrits par Joëlle, votre hôte sur place.";

export const Route = createFileRoute("/guides-hyeres")({
  loader: () => ({
    posts: getPublishedPosts().map((post) => ({
      slug: post.slug,
      path: post.path,
      title: post.title,
      excerpt: post.excerpt,
      category: post.category,
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
          name: "Guides de Hyères",
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
            { "@type": "ListItem", position: 2, name: "Guides de Hyères", item: PAGE_URL },
          ],
        }),
      },
    ],
  }),

  component: GuidesPage,
});

function GuidesPage() {
  const { posts } = Route.useLoaderData();

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

      <main className="mx-auto max-w-6xl px-5 py-12 sm:py-20">
        <nav aria-label="Fil d'Ariane" className="text-xs sm:text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link to="/" className="hover:text-foreground transition">
                Accueil
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-foreground">Guides de Hyères</li>
          </ol>
        </nav>

        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" /> Retour au studio
        </Link>

        <h1 className="mt-6 font-display text-[2rem] sm:text-5xl leading-[1.1]">
          Guides de Hyères
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] sm:text-lg text-muted-foreground leading-relaxed">
          Plages, Îles d'Or, presqu'île de Giens et bonnes adresses : nos conseils pour profiter de
          Hyères, écrits depuis le studio par Joëlle.
        </p>

        {posts.length === 0 ? (
          <p className="mt-12 text-muted-foreground">
            Les premiers guides arrivent très bientôt.
          </p>
        ) : (
          <div className="mt-10 sm:mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Card
                key={post.slug}
                className="overflow-hidden border border-border/60 bg-card p-0 flex flex-col"
              >
                <a href={post.path} className="group flex h-full flex-col">
                  {post.featuredImage ? (
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <img
                        src={post.featuredImage}
                        alt={post.featuredImageAlt}
                        loading="lazy"
                        decoding="async"
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
                    <h2 className="mt-2 font-display text-xl sm:text-2xl leading-snug group-hover:text-primary transition">
                      {post.title}
                    </h2>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                      {post.excerpt}
                    </p>
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
                    <span className="mt-5 inline-flex text-sm font-medium text-primary">
                      Lire le guide →
                    </span>
                  </div>
                </a>
              </Card>
            ))}
          </div>
        )}
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
