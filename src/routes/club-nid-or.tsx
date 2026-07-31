import { createFileRoute } from "@tanstack/react-router";

import { LeadCapturePage } from "@/components/crm/lead-capture-page";
import { SITE_URL } from "@/lib/blog";

const PAGE_PATH = "/club-nid-or";
const PAGE_TITLE = "Club du Nid d'Or | Offres directes et avantages voyageurs";
const PAGE_DESCRIPTION =
  "Rejoignez le Club du Nid d'Or pour recevoir les offres directes, disponibilités et avantages réservés aux voyageurs.";

export const Route = createFileRoute("/club-nid-or")({
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
  component: ClubNidOrPage,
});

function ClubNidOrPage() {
  return (
    <LeadCapturePage
      config={{
        source: "club_nid_or",
        eyebrow: "Club du Nid d'Or",
        title: "Revenez au Nid d'Or en direct",
        subtitle:
          "Inscrivez-vous pour recevoir nos offres directes, nos disponibilités et les avantages réservés aux voyageurs du Nid d'Or.",
        benefits: [
          "Tarifs directs et informations en priorité",
          "Offres réservées aux voyageurs déjà venus",
          "Actualités utiles pour organiser un prochain séjour à Hyères",
        ],
        cta: "Rejoindre le Club du Nid d'Or",
        thankYouPath: "/merci-club-nid-or",
        showStayPeriod: true,
        messageLabel: "Un souvenir ou une envie pour la prochaine fois, optionnel",
      }}
    />
  );
}
