import { Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, Clock, MapPin, RefreshCw } from "lucide-react";

import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatFrenchDate, getRelatedPosts, type BlogPost } from "@/lib/blog";

export function ArticleLayout({ post }: { post: BlogPost }) {
  const related = getRelatedPosts(post);
  const published = formatFrenchDate(post.date);
  const updated = formatFrenchDate(post.updatedAt);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />


      <section className="relative">
        <div className="relative h-[55vh] min-h-[360px] sm:h-[50vh] sm:min-h-[420px] w-full overflow-hidden">
          <img
            src={post.featuredImage}
            alt={post.featuredImageAlt}
            className="absolute inset-0 h-full w-full object-cover"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-deep/30 via-deep/10 to-deep/80" />
          <div className="absolute inset-0 flex items-end">
            <div className="mx-auto max-w-4xl w-full px-5 pb-8 sm:pb-14 text-primary-foreground">
              {post.category ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-background/15 backdrop-blur px-3 py-1 text-[10px] sm:text-xs uppercase tracking-[0.18em]">
                  <MapPin className="h-3 w-3" /> {post.category}
                </div>
              ) : null}
              <h1 className="mt-4 sm:mt-5 font-display text-[2rem] sm:text-5xl md:text-6xl leading-[1.1] sm:leading-[1.05]">
                {post.title}
              </h1>
              {post.excerpt ? (
                <p className="mt-3 sm:mt-5 max-w-2xl text-sm sm:text-lg text-primary-foreground/90">
                  {post.excerpt}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        {post.featuredImageCaption ? (
          <p className="mx-auto max-w-4xl px-5 pt-3 text-xs text-muted-foreground">
            {post.featuredImageCaption}
          </p>
        ) : null}
      </section>

      <main className="mx-auto max-w-4xl px-5 py-14 sm:py-20 md:py-24">
        <nav aria-label="Fil d'Ariane" className="text-xs sm:text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link to="/" className="hover:text-foreground transition">
                Accueil
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link to="/guides-hyeres" className="hover:text-foreground transition">
                Découvrir Hyères
              </Link>
            </li>
            {post.category ? (
              <>
                <li aria-hidden="true">/</li>
                <li>{post.category}</li>
              </>
            ) : null}
            <li aria-hidden="true">/</li>
            <li className="text-foreground">{post.title}</li>
          </ol>
        </nav>

        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" /> Retour au studio
        </Link>

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm text-muted-foreground">
          {published ? (
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Publié le {published}
            </span>
          ) : null}
          {updated && updated !== published ? (
            <span className="inline-flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Mis à jour le {updated}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-2">
            <Clock className="h-4 w-4" /> {post.readingMinutes} min de lecture
          </span>
          {post.author ? <span>Par {post.author}</span> : null}
        </div>

        {post.toc.length > 1 ? (
          <Card className="mt-8 border border-border/60 bg-card p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Sommaire</p>
            <ul className="mt-3 space-y-2">
              {post.toc.map((item) => (
                <li key={item.id} className={item.level === 3 ? "pl-4" : ""}>
                  <a
                    href={`#${item.id}`}
                    className="text-[15px] text-muted-foreground hover:text-foreground transition"
                  >
                    {item.text}
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        <article
          className="prose-nid mt-10"
          dangerouslySetInnerHTML={{ __html: post.html }}
        />

        {post.tags.length ? (
          <div className="mt-10 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        {post.ctaTitle || post.ctaText ? (
          <section className="mt-16 sm:mt-20 rounded-2xl bg-deep p-6 sm:p-10 text-primary-foreground">
            {post.ctaTitle ? (
              <h2 className="font-display text-2xl sm:text-3xl">{post.ctaTitle}</h2>
            ) : null}
            {post.ctaText ? (
              <p className="mt-4 max-w-2xl text-primary-foreground/90 text-[15px] leading-relaxed">
                {post.ctaText}
              </p>
            ) : null}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button
                asChild
                variant="cta"
                className="rounded-full h-14 px-6 text-base w-full sm:w-auto sm:h-16 sm:px-8 sm:text-lg"
              >
                <Link to="/" hash="reserver">
                  {post.ctaLabel || "Vérifier les disponibilités"}
                </Link>
              </Button>
              {post.ctaUrl ? (
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full bg-background/10 border-background/50 text-primary-foreground hover:bg-background/25 hover:text-primary-foreground hover:border-background/70 h-14 px-6 text-base w-full sm:w-auto sm:h-16 sm:px-8 sm:text-lg"
                >
                  <a href={post.ctaUrl} target="_blank" rel="noopener noreferrer">
                    {post.ctaUrlLabel}
                  </a>
                </Button>
              ) : null}
            </div>
          </section>
        ) : null}

        {related.length ? (
          <section className="mt-14 sm:mt-20">
            <h2 className="font-display text-2xl sm:text-3xl">À lire aussi</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {related.map((item) => (
                <Card
                  key={item.slug}
                  className="overflow-hidden border border-border/60 bg-card p-5 sm:p-6"
                >
                  <a href={item.path} className="block group">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      {item.category}
                    </p>
                    <h3 className="mt-2 font-display text-lg sm:text-xl group-hover:text-primary transition">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {item.excerpt}
                    </p>
                  </a>
                </Card>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-14 sm:mt-20">
          <h2 className="font-display text-2xl sm:text-3xl">
            Pourquoi choisir Le Nid d'Or pour vos vacances à Hyères ?
          </h2>
          <ul className="mt-6 space-y-3 text-muted-foreground text-[15px] leading-relaxed">
            <li className="flex gap-3">
              <span className="text-primary">✓</span>
              <span>Studio vue mer avec terrasse plein sud, face aux Îles d'Or.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary">✓</span>
              <span>
                Piscine de 18 mètres à quelques pas, pour des moments de détente après la plage.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary">✓</span>
              <span>
                À 10 minutes de la plage de l'Almanarre et à proximité immédiate des départs pour
                Porquerolles.
              </span>
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
            <Link to="/guides-hyeres" className="hover:text-foreground transition">
              Découvrir Hyères
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
