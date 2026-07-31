import { createFileRoute } from "@tanstack/react-router";

import { LeadCapturePage } from "@/components/crm/lead-capture-page";
import { SITE_URL } from "@/lib/blog";

const PAGE_PATH = "/reserver-en-direct";
const PAGE_TITLE = "Réserver en direct au Nid d'Or | Studio vue mer à Hyères";
const PAGE_DESCRIPTION =
  "Recevez les disponibilités, offres directes et conseils pour réserver votre séjour au Nid d'Or sans plateforme.";

export const Route = createFileRoute("/reserver-en-direct")({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { property: "og:title", content: PAGE_TITLE },
      { property: "og:description", content: PAGE_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}${PAGE_PATH}` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}${PAGE_PATH}` }],
  }),
  component: DirectBookingLeadPage,
});

function DirectBookingLeadPage() {
  return (
    <LeadCapturePage
      config={{
        source: "direct_booking_offer",
        eyebrow: "Réservation directe",
        title: "Préparez votre séjour sans plateforme",
        subtitle:
          "Recevez les disponibilités, les offres directes et les conseils utiles pour réserver Le Nid d'Or au meilleur moment.",
        benefits: [
          "Échange direct avec l'hôte avant de réserver",
          "Informations sur les disponibilités et les périodes calmes",
          "Conseils pour organiser un séjour à deux face aux Îles d'Or",
        ],
        cta: "Recevoir les offres en direct",
        thankYouPath: "/merci-offre-directe",
        showDesiredDates: true,
        messageLabel: "Votre projet de séjour, optionnel",
        messagePlaceholder: "Dates envisagées, occasion spéciale, questions avant de réserver...",
      }}
    />
  );
}
