import { createFileRoute } from "@tanstack/react-router";

import { ThankYouPage } from "@/components/crm/thank-you-page";
import { SITE_URL } from "@/lib/blog";

const PAGE_PATH = "/merci-club-nid-or";

export const Route = createFileRoute("/merci-club-nid-or")({
  head: () => ({
    meta: [
      { title: "Merci | Offre retour Le Nid d'Or" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}${PAGE_PATH}` }],
  }),
  component: MerciClubPage,
});

function MerciClubPage() {
  return (
    <ThankYouPage
      eyebrow="Club du Nid d'Or"
      title="Merci, votre avantage vous attend"
      text="Vous faites désormais partie des voyageurs privilégiés du Nid d'Or. Gardez ce code pour votre prochain séjour réservé en direct."
      code="NIDOR10"
      codeDescription="Avantage retour : -5 % sur votre prochain séjour réservé en direct, à rappeler dans votre message."
      primaryCtaLabel="Réserver en direct"
    />
  );
}
