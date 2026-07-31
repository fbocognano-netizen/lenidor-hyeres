import { createFileRoute } from "@tanstack/react-router";

import { LeadCapturePage } from "@/components/crm/lead-capture-page";
import { SITE_URL } from "@/lib/blog";

const PAGE_PATH = "/club-nid-or";
const PAGE_TITLE = "Offre retour | Club du Nid d'Or";
const PAGE_DESCRIPTION =
  "Inscription réservée aux voyageurs du Nid d'Or pour recevoir les offres directes, disponibilités et un avantage retour.";

export const Route = createFileRoute("/club-nid-or")({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: "description", content: PAGE_DESCRIPTION },
      { name: "robots", content: "noindex, nofollow" },
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
          "Inscrivez-vous pour recevoir nos offres directes, nos disponibilités et votre avantage retour réservé aux voyageurs du Nid d'Or.",
        benefits: [
          "Avantage retour sur votre prochain séjour réservé en direct",
          "Offres réservées aux voyageurs du Nid d'Or",
          "Disponibilités et nouveautés en avant-première",
        ],
        cta: "Je m'inscris et je découvre mon avantage",
        thankYouPath: "/merci-club-nid-or",
        showStayPeriod: true,
        messageLabel: "Un souvenir ou une envie pour la prochaine fois, optionnel",
      }}
    />
  );
}
