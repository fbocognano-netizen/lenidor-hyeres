import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { installClientErrorLogging, reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>

        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>

        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
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
        <h1 className="text-xl font-semibold tracking-tight text-foreground">This page didn't load</h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>

          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
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
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4cfebf76-be57-402d-8084-0261b0223748/id-preview-cc6d774e--ff9f603a-9389-4ad2-a6b4-ee7aa118af46.lovable.app-1784115931645.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4cfebf76-be57-402d-8084-0261b0223748/id-preview-cc6d774e--ff9f603a-9389-4ad2-a6b4-ee7aa118af46.lovable.app-1784115931645.png",
      },
    ],

    links: [
      {
        rel: "stylesheet",
        href: appCss,
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
              url: "https://lenidor-hyeres.fr/",
              name: "Le Nid d'Or",
              alternateName: ["Le Nid d'Or à Hyères", "Nid d'Or Hyères"],
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
