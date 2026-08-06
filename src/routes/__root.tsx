import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useLocation, useRouter, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { installClientErrorLogging, reportLovableError } from "../lib/lovable-error-reporting";
import { SOCIAL_LINKS } from "../components/social-links";
import { getPublishedPosts } from "../lib/blog";

const SITE_URL = "https://lenidor-hyeres.fr";
const SEO_IMAGE_URL = `${SITE_URL}/images/seo/le-nid-or-hyeres-vue-mer.jpg`;

type PageSuggestion = {
  path: string;
  title: string;
  searchText: string;
};

const STATIC_PAGES = [
  { path: "/", title: "Le Nid d'Or à Hyères" },
  { path: "/guides-hyeres", title: "Tous les guides de Hyères" },
  { path: "/agenda", title: "Agenda de Hyères : événements et sorties" },
  { path: "/offres-directes", title: "Recevoir les offres directes" },
  { path: "/airbnb-hyeres", title: "Airbnb à Hyères : où loger et comment bien choisir ?" },
  { path: "/aller-porquerolles-depuis-hyeres", title: "Comment aller à Porquerolles depuis Hyères ?" },
  { path: "/carqueiranne-en-amoureux", title: "Que faire à Carqueiranne en amoureux ?" },
  { path: "/guide-plages-hyeres", title: "Les plus belles plages de Hyères" },
  { path: "/hyeres-quand-il-pleut", title: "Que faire à Hyères quand il pleut ?" },
  { path: "/location-vacances-hyeres-avec-piscine", title: "Location de vacances à Hyères avec piscine" },
  { path: "/ou-dormir-hyeres-porquerolles", title: "Où dormir à Hyères pour visiter Porquerolles ?" },
  { path: "/porquerolles-en-une-journee", title: "Visiter Porquerolles en une journée" },
  { path: "/port-cros-ou-porquerolles", title: "Port-Cros ou Porquerolles : quelle île choisir ?" },
  { path: "/que-faire-hyeres", title: "Que faire à Hyères ?" },
  { path: "/que-voir-vieux-hyeres", title: "Que voir dans le vieux Hyères ?" },
  { path: "/randonnees-hyeres", title: "Randonnées à Hyères" },
  { path: "/restaurant-romantique-hyeres", title: "Dîner en amoureux à Hyères" },
  { path: "/restaurants-hyeres", title: "Où manger à Hyères ?" },
  { path: "/sentier-littoral-giens", title: "Sentier du littoral de Giens" },
  { path: "/visiter-hyeres-3-jours", title: "Visiter Hyères en 3 jours" },
  { path: "/visiter-presquile-giens", title: "Visiter la presqu'île de Giens" },
  { path: "/week-end-sans-voiture-hyeres", title: "Un week-end sans voiture à Hyères" },
] as const;

const SUGGESTIBLE_PAGES: PageSuggestion[] = Array.from(
  new Map(
    [
      ...STATIC_PAGES.map((page) => ({
        ...page,
        searchText: `${page.path} ${page.title}`,
      })),
      ...getPublishedPosts().map((post) => ({
        path: post.path,
        title: post.title,
        searchText: [
          post.path,
          post.slug,
          post.title,
          post.cardTitle,
          post.seoTitle,
          post.description,
          post.excerpt,
          post.category,
          post.tags.join(" "),
          post.focusKeyword,
        ]
          .filter(Boolean)
          .join(" "),
      })),
    ].map((page) => [page.path, page]),
  ).values(),
);

function normalizeText(value: string): string {
  let decodedValue = value;
  try {
    decodedValue = decodeURIComponent(value);
  } catch {
    // Keep the original path when a malformed URL cannot be decoded.
  }

  return decodedValue
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length];
}

function findPageSuggestions(pathname: string) {
  const requestedText = normalizeText(pathname);
  const requestedTerms = requestedText.split(" ").filter((term) => term.length >= 2);
  if (requestedTerms.length === 0) return [];

  return SUGGESTIBLE_PAGES.map((page) => {
    const candidatePath = normalizeText(page.path);
    const candidateTitle = normalizeText(page.title);
    const candidateText = normalizeText(page.searchText);
    const candidateWords = candidateText.split(" ");
    let score = 0;
    let matchedTerms = 0;

    for (const term of requestedTerms) {
      if (candidatePath.includes(term)) {
        score += 18;
        matchedTerms += 1;
      } else if (candidateTitle.includes(term)) {
        score += 14;
        matchedTerms += 1;
      } else if (candidateText.includes(term)) {
        score += 6;
        matchedTerms += 1;
      } else if (
        term.length >= 4 &&
        candidateWords.some((word) => editDistance(term, word) <= Math.max(1, Math.floor(term.length / 5)))
      ) {
        score += 4;
        matchedTerms += 1;
      }
    }

    const compactRequested = requestedText.replace(/\s/g, "");
    const compactPath = candidatePath.replace(/\s/g, "");
    const distance = editDistance(compactRequested, compactPath);
    const similarity = 1 - distance / Math.max(compactRequested.length, compactPath.length, 1);
    const sharedStart = compactRequested.startsWith(compactPath) || compactPath.startsWith(compactRequested);

    return { ...page, score: score + similarity + (sharedStart ? 0.2 : 0), matchedTerms };
  })
    .filter((page) => page.matchedTerms > 0 || page.score >= 0.58)
    .sort((first, second) => second.score - first.score)
    .slice(0, 3);
}

function NotFoundComponent() {
  const location = useLocation();
  const suggestions = findPageSuggestions(location.pathname);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>

        <h2 className="mt-4 text-xl font-semibold text-foreground">Cette page n'existe pas</h2>

        <p className="mt-2 text-sm text-muted-foreground">
          L'adresse est peut-être incorrecte ou la page a été déplacée. Vous pouvez revenir à l'accueil ou poursuivre
          votre découverte de Hyères.
        </p>

        {suggestions.length > 0 && (
          <div className="mt-6 rounded-md border border-border bg-card p-4 text-left">
            <p className="text-sm font-medium text-foreground">Vous cherchiez peut-être...</p>
            <ul className="mt-3 space-y-2">
              {suggestions.map((page) => (
                <li key={page.path}>
                  <Link
                    to={page.path}
                    className="block rounded-md px-3 py-2 text-sm text-primary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Revenir à l'accueil
          </Link>
          <Link
            to="/guides-hyeres"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Découvrir les guides
          </Link>
          <Link
            to="/"
            hash="reserver"
            className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-accent"
          >
            Vérifier les disponibilités
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);

  const router = useRouter();

  useEffect(() => {
    reportLovableError(error, {
      boundary: "tanstack_root_error_component",
    });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">La page n'a pas pu se charger</h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Un problème temporaire est survenu. Vous pouvez réessayer ou revenir à l'accueil.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Réessayer
          </button>

          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Revenir à l'accueil
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "robots",
        content: "index, follow, max-image-preview:large",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        name: "application-name",
        content: "Le Nid d'Or",
      },
      {
        name: "theme-color",
        content: "#0c2d34",
      },
      {
        title: "Le Nid d'Or à Hyères • Studio vue mer & piscine • Site officiel",
      },
      {
        name: "description",
        content:
          "Réservez en direct au Nid d'Or à Hyères : studio vue mer & piscine, terrasse plein sud, calme assuré. Site officiel, sans intermédiaire. Meilleur Prix assuré",
      },
      {
        property: "og:site_name",
        content: "Le Nid d'Or",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:locale",
        content: "fr_FR",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
      {
        name: "google-site-verification",
        content: "B4L6zAp6HnvBopD0J7lOHzKKXQTLWk9moM-ifcl39_c",
      },
      {
        name: "google-site-verification",
        content: "S5Vi_m-dl005wzVEMw68xSb_9ch0Dztih5lcxVO4qfk",
      },
      {
        property: "og:title",
        content: "Le Nid d'Or à Hyères • Studio vue mer & piscine • Site officiel",
      },
      {
        name: "twitter:title",
        content: "Le Nid d'Or à Hyères • Studio vue mer & piscine • Site officiel",
      },
      {
        property: "og:description",
        content:
          "Réservez en direct au Nid d'Or à Hyères : studio vue mer & piscine, terrasse plein sud, calme assuré. Site officiel, sans intermédiaire. Meilleur Prix assuré",
      },
      {
        name: "twitter:description",
        content:
          "Réservez en direct au Nid d'Or à Hyères : studio vue mer & piscine, terrasse plein sud, calme assuré. Site officiel, sans intermédiaire. Meilleur Prix assuré",
      },
      {
        property: "og:image",
        content: SEO_IMAGE_URL,
      },
      {
        name: "twitter:image",
        content: SEO_IMAGE_URL,
      },
    ],

    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        href: "/favicon.ico",
        sizes: "any",
      },
      {
        rel: "icon",
        type: "image/svg+xml",
        href: "/favicon.svg",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "48x48",
        href: "/favicon-48x48.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicon-32x32.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/favicon-16x16.png",
      },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
      {
        rel: "manifest",
        href: "/site.webmanifest",
      },
      {
        rel: "alternate",
        type: "application/rss+xml",
        title: "Guides de Hyères — Le Nid d'Or",
        href: "https://lenidor-hyeres.fr/rss.xml",
      },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){
                w[l]=w[l]||[];
                w[l].push({
                  'gtm.start': new Date().getTime(),
                  event:'gtm.js'
                });

                var f=d.getElementsByTagName(s)[0],
                    j=d.createElement(s),
                    dl=l!='dataLayer'?'&l='+l:'';

                j.async=true;
                j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
                f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GTM-M8GFVC9G');
            `,
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              url: `${SITE_URL}/`,
              name: "Le Nid d'Or",
              alternateName: ["Le Nid d'Or à Hyères", "Nid d'Or Hyères"],
              sameAs: [SOCIAL_LINKS.instagram, SOCIAL_LINKS.facebook],
            }),
          }}
        />

        <HeadContent />
      </head>

      <body>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-M8GFVC9G"
            height="0"
            width="0"
            title="Google Tag Manager"
            style={{
              display: "none",
              visibility: "hidden",
            }}
          />
        </noscript>

        {children}

        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    installClientErrorLogging();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
