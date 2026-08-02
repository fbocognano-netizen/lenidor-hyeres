import { createFileRoute } from "@tanstack/react-router";

import { LeadCapturePage } from "@/components/crm/lead-capture-page";
import { SITE_URL } from "@/lib/blog";

const PAGE_PATH = "/offres-directes";
const PAGE_TITLE = "Offres directes du Nid d'Or | Disponibilités et avantages";
const PAGE_DESCRIPTION =
  "Recevez les offres directes, disponibilités et conseils du Nid d'Or avant de réserver votre séjour à Hyères.";

export const Route = createFileRoute("/offres-directes")({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { name: "robots", content: "noindex, follow" },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}${PAGE_PATH}` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}${PAGE_PATH}` }],
  }),
  component: DirectOffersLeadPage,
});

function DirectOffersLeadPage() {
  return (
    <LeadCapturePage
      config={{
        source: "direct_booking_offer",
        eyebrow: "Offres directes",
        title: "Recevez les offres du Nid d'Or",
        subtitle:
          "Laissez votre email pour recevoir les disponibilités, les périodes intéressantes et les offres directes du Nid d'Or. Pour une demande avec des dates précises, utilisez le formulaire de disponibilité de la page d'accueil.",
        benefits: [
          "Être informé des disponibilités et périodes calmes",
          "Recevoir les offres directes avant de réserver",
          "Préparer un futur séjour sans passer tout de suite à la réservation",
        ],
        cta: "Recevoir les offres directes",
        thankYouPath: "/merci-offre-directe",
        showDesiredDates: true,
        messageLabel: "Votre projet de séjour, optionnel",
        messagePlaceholder: "Période envisagée, occasion spéciale, questions avant de réserver...",
      }}
    />
  );
}
